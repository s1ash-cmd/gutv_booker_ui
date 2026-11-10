import { ApiError, graphqlRequest } from "./api";

// Where the session lives:
// - the refresh token is an HttpOnly cookie set by the API, so page scripts never see it;
// - the access token stays in this tab's memory and is lost on reload, after which the
//   cookie yields a new one;
// - localStorage holds two values that are not secrets: a random id that changes on every
//   login and logout, which tells other tabs that the account changed, and a flag saying
//   that a cookie should exist, so anonymous visitors never send refresh requests.
const sessionIdKey = "auth_session_id";
const signedInKey = "auth_signed_in";
// Written by versions that kept tokens in localStorage. Read once to move the session to
// the cookie, then removed.
const legacyAccessTokenKey = "access_token";
const legacyRefreshTokenKey = "refresh_token";
const refreshLockName = "gutv-booker:refresh-token";
// Without Web Locks, two tabs may send the same cookie at once and one loses the race.
// The loser tries again once the winner's rotated cookie has arrived.
const unlockedRetryDelayMs = 300;
// A token this close to expiry is refreshed before use instead of failing a request.
const expiryMarginMs = 30_000;

export type AuthSession = {
  sessionId: string | null;
  signedIn: boolean;
};

let memory: { sessionId: string | null; token: string } | null = null;
const inflightAuthenticatedRequests = new Map<string, Promise<unknown>>();
const refreshPromises = new Map<string, Promise<string>>();
const logoutPromises = new Map<string, Promise<void>>();

class SessionChangedError extends Error {
  constructor() {
    super("Сессия изменилась. Повторите действие в текущем аккаунте");
    this.name = "SessionChangedError";
  }
}

function legacyRefreshToken() {
  const value = localStorage.getItem(legacyRefreshTokenKey)?.trim();
  // A version in transition could save the literal text of a missing token.
  return value && value !== "null" && value !== "undefined" ? value : null;
}

export function readSession(): AuthSession {
  return {
    sessionId: localStorage.getItem(sessionIdKey),
    signedIn:
      localStorage.getItem(signedInKey) === "1" ||
      legacyRefreshToken() !== null,
  };
}

function isSameSession(expected: AuthSession, current = readSession()) {
  return (
    expected.sessionId === current.sessionId &&
    (!expected.signedIn || current.signedIn)
  );
}

function assertSameSession(expected: AuthSession) {
  if (!isSameSession(expected)) throw new SessionChangedError();
}

function newSessionId() {
  // getRandomValues also works on the HTTP origins used by local development.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function expiresSoon(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = Number((JSON.parse(json) as { exp?: unknown }).exp);
    return Number.isFinite(exp) && exp * 1000 - Date.now() < expiryMarginMs;
  } catch {
    // The server decides; an unreadable token is simply sent.
    return false;
  }
}

// The access token of this tab, if it belongs to the current session and is still usable.
function peekToken(session: AuthSession) {
  if (!session.signedIn || !memory || memory.sessionId !== session.sessionId)
    return null;
  return expiresSoon(memory.token) ? null : memory.token;
}

function removeLegacyTokens() {
  localStorage.removeItem(legacyAccessTokenKey);
  localStorage.removeItem(legacyRefreshTokenKey);
}

function startSession(accessToken: string) {
  const sessionId = newSessionId();
  removeLegacyTokens();
  localStorage.setItem(sessionIdKey, sessionId);
  localStorage.setItem(signedInKey, "1");
  memory = { sessionId, token: accessToken };
}

// The id changes too, so every tab drops what belonged to the previous account.
function clearSession() {
  memory = null;
  removeLegacyTokens();
  localStorage.removeItem(signedInKey);
  localStorage.setItem(sessionIdKey, newSessionId());
}

// The server refused the session. The id stays: no new login happened, and work still
// waiting for this session fails as signed out rather than as "changed".
function forgetRejectedSession() {
  memory = null;
  removeLegacyTokens();
  localStorage.removeItem(signedInKey);
}

type GraphqlErrorDetails = Array<{
  message?: string;
  extensions?: Record<string, unknown>;
}>;

function shouldRefreshAfterError(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 401) return true;

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
    (error.status < 500 && error.message === "Недействительный refresh token")
  );
}

async function requestRefresh(legacyToken: string | null) {
  // Only the access token is requested: a refresh token must never reach page code.
  const data = legacyToken
    ? await graphqlRequest<{ refreshToken: { accessToken: string } }>(
        `mutation RefreshToken($refreshToken: String) {
          refreshToken(refreshToken: $refreshToken) { accessToken }
        }`,
        { refreshToken: legacyToken },
      )
    : await graphqlRequest<{ refreshToken: { accessToken: string } }>(
        "mutation RefreshToken { refreshToken { accessToken } }",
      );
  return data.refreshToken.accessToken;
}

async function rotate(useUnlockedRetry: boolean) {
  const legacy = legacyRefreshToken();
  if (legacy) {
    try {
      // The API moves this session to the cookie while answering.
      return await requestRefresh(legacy);
    } catch (error) {
      if (!isSessionRejected(error)) throw error;
      // The stored token may be stale while the cookie is current. The flag keeps the
      // session signed in until the cookie has been tried.
      localStorage.setItem(signedInKey, "1");
      removeLegacyTokens();
    }
  }

  try {
    return await requestRefresh(null);
  } catch (error) {
    if (!useUnlockedRetry || !isSessionRejected(error)) throw error;
    await new Promise<void>((resolve) =>
      setTimeout(resolve, unlockedRetryDelayMs),
    );
    return requestRefresh(null);
  }
}

async function refreshAccessToken(
  expected: AuthSession,
  failedToken: string | null,
  useUnlockedRetry: boolean,
): Promise<string> {
  assertSameSession(expected);
  // Another request of this tab may have refreshed while this one waited for the lock.
  const current = peekToken(expected);
  if (current && current !== failedToken) return current;
  if (!expected.signedIn) throw new ApiError(401, "Нет активной сессии");

  try {
    const token = await rotate(useUnlockedRetry);
    // A logout or login may have completed while waiting.
    assertSameSession(expected);
    removeLegacyTokens();
    localStorage.setItem(signedInKey, "1");
    memory = { sessionId: expected.sessionId, token };
    return token;
  } catch (error) {
    // An answer for a session that has since ended or been replaced changes nothing.
    if (!isSameSession(expected)) throw new SessionChangedError();
    if (isSessionRejected(error)) forgetRejectedSession();
    throw error;
  }
}

function getRefreshedAccessToken(
  expected: AuthSession,
  failedToken: string | null,
) {
  const key = JSON.stringify([expected.sessionId, failedToken]);
  const existingPromise = refreshPromises.get(key);
  if (existingPromise) return existingPromise;

  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const run = () => refreshAccessToken(expected, failedToken, !locks);
  // The lock is shared by every tab on this origin, so each one sends the newest cookie.
  const request = locks ? locks.request(refreshLockName, run) : run();
  const promise = request.finally(() => {
    refreshPromises.delete(key);
  });
  refreshPromises.set(key, promise);
  return promise;
}

function redirectIfSignedOut(expected: AuthSession, error: unknown) {
  const current = readSession();
  if (
    isSessionRejected(error) &&
    current.sessionId === expected.sessionId &&
    !current.signedIn &&
    typeof window !== "undefined"
  ) {
    window.location.assign("/login");
  }
}

async function refreshOrRedirect(
  expected: AuthSession,
  failedToken: string | null,
) {
  try {
    return await getRefreshedAccessToken(expected, failedToken);
  } catch (error) {
    redirectIfSignedOut(expected, error);
    throw error;
  }
}

function isMutationRequest(query: string) {
  return query.trimStart().startsWith("mutation");
}

export async function authenticatedGraphqlRequest<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const session = readSession();
  const shouldDeduplicate = !isMutationRequest(query);

  const runRequest = (accessToken: string | null) => {
    const requestKey = JSON.stringify({
      query,
      variables: variables ?? {},
      accessToken,
      sessionId: session.sessionId,
    });
    const inflightRequest = inflightAuthenticatedRequests.get(requestKey) as
      | Promise<TData>
      | undefined;
    if (shouldDeduplicate && inflightRequest) return inflightRequest;

    const request = graphqlRequest<TData>(query, variables, {
      ...(accessToken ? { token: accessToken } : {}),
    }).catch((error: unknown) => {
      // This also guards failures from the retry after refreshing the token.
      assertSameSession(session);
      throw error;
    });
    if (shouldDeduplicate) {
      inflightAuthenticatedRequests.set(requestKey, request);
      const forget = () => inflightAuthenticatedRequests.delete(requestKey);
      request.then(forget, forget);
    }
    return request;
  };

  let token = peekToken(session);
  // After a reload this tab has no access token yet; the cookie provides one.
  if (!token && session.signedIn)
    token = await refreshOrRedirect(session, null);
  assertSameSession(session);

  try {
    const data = await runRequest(token);
    assertSameSession(session);
    return data;
  } catch (error) {
    assertSameSession(session);
    if (!shouldRefreshAfterError(error)) throw error;
    if (!session.signedIn) {
      const signedOut = new ApiError(401, "Войдите в аккаунт");
      redirectIfSignedOut(session, signedOut);
      throw signedOut;
    }

    const newToken = await refreshOrRedirect(session, token);
    assertSameSession(session);
    const data = await runRequest(newToken);
    assertSameSession(session);
    return data;
  }
}

function endServerSession(all: boolean) {
  const session = readSession();
  const key = JSON.stringify([session.sessionId, all]);
  const pending = logoutPromises.get(key);
  if (pending) return pending;
  if (!session.signedIn) {
    clearSession();
    return Promise.resolve();
  }
  const operation = (async () => {
    try {
      // The response also removes the refresh cookie.
      await authenticatedGraphqlRequest(
        all ? "mutation LogoutAll { logoutAll }" : "mutation Logout { logout }",
      );
    } catch (error) {
      // A rejected session is already unusable. Temporary failures must remain
      // visible so the user knows server-side logout did not complete.
      if (readSession().sessionId !== session.sessionId)
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

type SignInPayload = { accessToken: string };

async function signIn<TKey extends string>(
  field: TKey,
  query: string,
  variables: Record<string, unknown>,
) {
  const session = readSession();
  const data = await graphqlRequest<Record<TKey, SignInPayload>>(
    query,
    variables,
  ).catch((error: unknown) => {
    assertSameSession(session);
    throw error;
  });

  // A login or logout in another tab while this one was pending wins.
  assertSameSession(session);
  startSession(data[field].accessToken);
  return data[field];
}

export type RegisterInput = {
  login: string;
  password: string;
  name: string;
  joinYear: number;
};

export const authApi = {
  login: (login: string, password: string) =>
    signIn(
      "login",
      `mutation Login($input: LoginInput!) {
        login(input: $input) { accessToken }
      }`,
      { input: { login, password } },
    ),

  // Registration signs the new account in, so it needs no second login and leaves
  // no unused session behind.
  register: (input: RegisterInput) =>
    signIn(
      "register",
      `mutation Register($input: RegisterInput!) {
        register(input: $input) { accessToken }
      }`,
      { input },
    ),

  readSession,
  clearSession,
  logout: () => endServerSession(false),
  logoutAll: () => endServerSession(true),

  // The access token of this tab, refreshed through the cookie when needed. Null when
  // nobody is signed in or the server no longer accepts the session.
  getAccessToken: async (): Promise<string | null> => {
    const session = readSession();
    const token = peekToken(session);
    if (token) return token;
    if (!session.signedIn) return null;
    try {
      return await getRefreshedAccessToken(session, null);
    } catch (error) {
      // The server no longer accepts this session, which is now forgotten.
      if (isSessionRejected(error)) return null;
      throw error;
    }
  },
};
