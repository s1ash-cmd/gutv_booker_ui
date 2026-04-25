import { ApiError, graphqlRequest } from "./api";

const inflightAuthenticatedRequests = new Map<string, Promise<unknown>>();

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

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

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => {
    callback(token);
  });
  refreshSubscribers = [];
}

function getRequestKey(
  query: string,
  variables: Record<string, unknown> | undefined,
  accessToken: string,
) {
  return JSON.stringify({
    query,
    variables: variables ?? {},
    accessToken,
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

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    throw new Error("No refresh token");
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

    persistTokens(data.refreshToken);
    return data.refreshToken.accessToken;
  } catch (error) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    throw error;
  }
}

export async function authenticatedGraphqlRequest<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const token = localStorage.getItem("access_token") ?? "";
  const shouldDeduplicate = !isMutationRequest(query);

  const makeRequest = async (accessToken: string): Promise<TData> =>
    graphqlRequest<TData>(query, variables, {
      token: accessToken,
    });

  const runRequest = (accessToken: string) => {
    const requestKey = getRequestKey(query, variables, accessToken);
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
    return await runRequest(token);
  } catch (error) {
    if (shouldRefreshAfterError(error)) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;
          onTokenRefreshed(newToken);
          return await runRequest(newToken);
        } catch (refreshError) {
          isRefreshing = false;

          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }

          throw refreshError;
        }
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (newToken: string) => {
          try {
            const result = await runRequest(newToken);
            resolve(result);
          } catch (requestError) {
            reject(requestError);
          }
        });
      });
    }

    throw error;
  }
}

export const authApi = {
  login: async (login: string, password: string) => {
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
    );

    persistTokens(data.login);
    return data.login;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  refreshToken: refreshAccessToken,
};
