import { ApiError, graphqlRequest } from "./api";

const inflightAuthenticatedRequests = new Map<string, Promise<unknown>>();
const refreshPromises = new Map<string, Promise<string>>();
const logoutPromises = new Map<string, Promise<void>>();
const refreshLockName = "gutv-booker:refresh-token";
const pendingRefreshPrefix = "gutv-booker:pending-refresh:";
const pendingRefreshLifetimeMs = 60_000;
const fallbackRefreshWaitMs = 1_500;

type SessionSnapshot = {
  accessToken: string;
  refreshToken: string;
  sessionId: string | null;
};

class SessionChangedError extends Error {
  constructor() {
    super("Сессия изменилась. Повторите действие в текущем аккаунте");
    this.name = "SessionChangedError";
  }
}

function readSession(): SessionSnapshot {
  return {
    accessToken: localStorage.getItem("access_token") ?? "",
    refreshToken: localStorage.getItem("refresh_token") ?? "",
    sessionId: localStorage.getItem("auth_session_id"),
  };
}

function newSessionId() {
  // getRandomValues also works on the HTTP origins used by local development.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function assertSameSession(expected: SessionSnapshot, current = readSession()) {
  if (
    expected.sessionId !== current.sessionId ||
    (expected.accessToken && !current.accessToken) ||
    (expected.refreshToken && !current.refreshToken)
  ) {
    throw new SessionChangedError();
  }
  return current;
}

function getAlreadyRefreshedToken(expected: SessionSnapshot) {
  const current = assertSameSession(expected);
  if (
    current.accessToken !== expected.accessToken ||
    current.refreshToken !== expected.refreshToken
  ) {
    if (current.accessToken && current.refreshToken) {
      return current.accessToken;
    }
    throw new SessionChangedError();
  }
  return null;
}

function hasOtherPendingRefresh(expected: SessionSnapshot, ownKey: string) {
  const keys = Array.from({ length: localStorage.length }, (_, index) =>
    localStorage.key(index),
  );
  return keys.some((key) => {
    if (!key || key === ownKey || !key.startsWith(pendingRefreshPrefix)) {
      return false;
    }
    try {
      const entry = JSON.parse(localStorage.getItem(key) ?? "null") as {
        sessionId?: string | null;
        refreshToken?: string;
        startedAt?: number;
      } | null;
      if (
        !entry ||
        typeof entry.startedAt !== "number" ||
        Date.now() - entry.startedAt >= pendingRefreshLifetimeMs
      ) {
        localStorage.removeItem(key);
        return false;
      }
      return (
        entry.sessionId === expected.sessionId &&
        entry.refreshToken === expected.refreshToken
      );
    } catch {
      return false;
    }
  });
}

async function waitForOtherRefresh(expected: SessionSnapshot, ownKey: string) {
  const deadline = Date.now() + fallbackRefreshWaitMs;
  while (true) {
    const token = getAlreadyRefreshedToken(expected);
    if (token || !hasOtherPendingRefresh(expected, ownKey)) return token;
    if (Date.now() >= deadline) {
      // Another tab may still save valid tokens. Leave this session intact for a retry.
      throw new ApiError(
        503,
        "Обновление сессии ещё выполняется. Повторите действие",
      );
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
}

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
};

type GraphqlErrorDetails = Array<{
  message?: string;
  extensions?: Record<string, unknown>;
}>;

function getRequestKey(
  query: string,
  variables: Record<string, unknown> | undefined,
  accessToken: string,
  sessionId: string | null,
) {
  return JSON.stringify({
    query,
    variables: variables ?? {},
    accessToken,
    sessionId,
  });
}

function isMutationRequest(query: string) {
  return query.trimStart().startsWith("mutation");
}

function persistTokens(tokens: AuthTokens) {
  localStorage.setItem("access_token", tokens.accessToken);
  localStorage.setItem("refresh_token", tokens.refreshToken);
}

function shouldRefreshAfterError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.status === 401) {
    return true;
  }

  const details = Array.isArray(error.details)
    ? (error.details as GraphqlErrorDetails)
    : [];

  return details.some((detail) => {
    const code = String(detail.extensions?.code ?? "");
    const message = String(detail.message ?? "").toLowerCase();

    return (
      code === "AUTH_NOT_AUTHORIZED" ||
      message.includes("not authorized") ||
      message.includes("unauthorized") ||
      message.includes("не авториз")
    );
  });
}

function isSessionRejected(error: unknown) {
  if (!(error instanceof ApiError)) return false;

  return (
    error.status === 401 ||
    error.status === 403 ||
    (error.status < 500 &&
      (error.message === "Недействительный refresh token" ||
        error.message === "Пользователь заблокирован"))
  );
}

async function refreshAccessToken(
  expected: SessionSnapshot,
  useFallbackCoordination: boolean,
): Promise<string> {
  const existingToken = getAlreadyRefreshedToken(expected);
  if (existingToken) return existingToken;
  const { refreshToken } = expected;

  if (!refreshToken) {
    localStorage.removeItem("access_token");
    throw new ApiError(401, "No refresh token");
  }

  // Unique per-operation entries avoid overwriting another tab's pending marker.
  const pendingKey = useFallbackCoordination
    ? `${pendingRefreshPrefix}${newSessionId()}`
    : null;
  if (pendingKey) {
    localStorage.setItem(
      pendingKey,
      JSON.stringify({
        sessionId: expected.sessionId,
        refreshToken,
        startedAt: Date.now(),
      }),
    );
  }

  try {
    const data = await graphqlRequest<{ refreshToken: AuthPayload }>(
      `
        mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
          }
        }
      `,
      { refreshToken },
    );

    // A logout, login or another tab's refresh may have completed while waiting.
    const newerToken = getAlreadyRefreshedToken(expected);
    if (newerToken) return newerToken;
    persistTokens(data.refreshToken);
    return data.refreshToken.accessToken;
  } catch (error) {
    // In browsers without Web Locks, a late rejection must not erase newer tokens.
    const newerToken = getAlreadyRefreshedToken(expected);
    if (newerToken) return newerToken;
    if (isSessionRejected(error)) {
      if (pendingKey) {
        const token = await waitForOtherRefresh(expected, pendingKey);
        if (token) return token;
        // The await itself lets login/logout callbacks run before cleanup resumes.
        const updatedToken = getAlreadyRefreshedToken(expected);
        if (updatedToken) return updatedToken;
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    throw error;
  } finally {
    if (pendingKey) localStorage.removeItem(pendingKey);
  }
}

function getRefreshedAccessToken(expected: SessionSnapshot = readSession()) {
  const key = JSON.stringify(expected);
  const existingPromise = refreshPromises.get(key);
  if (existingPromise) return existingPromise;

  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const runRefresh = () => refreshAccessToken(expected, !locks);
  // The lock is shared by every tab on this origin. Recheck storage after acquiring it.
  const request = locks
    ? locks.request(refreshLockName, runRefresh)
    : runRefresh();
  const promise = request.finally(() => {
    refreshPromises.delete(key);
  });
  refreshPromises.set(key, promise);
  return promise;
}

export async function authenticatedGraphqlRequest<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const session = readSession();
  const token = session.accessToken;
  const shouldDeduplicate = !isMutationRequest(query);

  const makeRequest = async (accessToken: string): Promise<TData> =>
    graphqlRequest<TData>(query, variables, {
      token: accessToken,
    }).catch((error: unknown) => {
      // This also guards failures from the retry after refreshing the token.
      assertSameSession(session);
      throw error;
    });

  const runRequest = (accessToken: string) => {
    const requestKey = getRequestKey(
      query,
      variables,
      accessToken,
      session.sessionId,
    );
    const inflightRequest = inflightAuthenticatedRequests.get(requestKey) as
      | Promise<TData>
      | undefined;

    if (shouldDeduplicate && inflightRequest) {
      return inflightRequest;
    }

    const request = makeRequest(accessToken);
    if (shouldDeduplicate) {
      inflightAuthenticatedRequests.set(requestKey, request);
      request.then(
        () => {
          inflightAuthenticatedRequests.delete(requestKey);
        },
        () => {
          inflightAuthenticatedRequests.delete(requestKey);
        },
      );
    }

    return request;
  };

  try {
    const data = await runRequest(token);
    assertSameSession(session);
    return data;
  } catch (error) {
    assertSameSession(session);
    if (shouldRefreshAfterError(error)) {
      let newToken: string;
      try {
        newToken = await getRefreshedAccessToken(session);
      } catch (refreshError) {
        const current = readSession();
        if (
          isSessionRejected(refreshError) &&
          current.sessionId === session.sessionId &&
          !current.accessToken &&
          !current.refreshToken &&
          typeof window !== "undefined"
        ) {
          window.location.assign("/login");
        }

        throw refreshError;
      }
      assertSameSession(session);
      const data = await runRequest(newToken);
      assertSameSession(session);
      return data;
    }

    throw error;
  }
}

function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.setItem("auth_session_id", newSessionId());
}

function endServerSession(all: boolean) {
  const session = readSession();
  const key = JSON.stringify([session.sessionId, all]);
  const pending = logoutPromises.get(key);
  if (pending) return pending;
  if (!session.accessToken && !session.refreshToken) {
    clearSession();
    return Promise.resolve();
  }
  const operation = (async () => {
    try {
      await authenticatedGraphqlRequest(
        all ? "mutation LogoutAll { logoutAll }" : "mutation Logout { logout }",
      );
    } catch (error) {
      // A rejected session is already unusable. Temporary failures must remain
      // visible so the user knows server-side logout did not complete.
      const current = readSession();
      if (current.sessionId !== session.sessionId)
        throw new SessionChangedError();
      if (!isSessionRejected(error)) throw error;
      clearSession();
      return;
    }
    assertSameSession(session);
    clearSession();
  })().finally(() => logoutPromises.delete(key));
  logoutPromises.set(key, operation);
  return operation;
}

export const authApi = {
  login: async (login: string, password: string) => {
    const session = readSession();
    const data = await graphqlRequest<{ login: AuthPayload }>(
      `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
            refreshToken
          }
        }
      `,
      {
        input: { login, password },
      },
    ).catch((error: unknown) => {
      assertSameSession(session);
      throw error;
    });

    assertSameSession(session);
    localStorage.setItem("auth_session_id", newSessionId());
    persistTokens(data.login);
    return data.login;
  },

  clearSession,
  logout: () => endServerSession(false),
  logoutAll: () => endServerSession(true),

  refreshToken: () => getRefreshedAccessToken(),
};
