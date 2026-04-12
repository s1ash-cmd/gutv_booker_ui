const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const explicitGraphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();

function resolveGraphqlUrl() {
  if (explicitGraphqlUrl) {
    return explicitGraphqlUrl;
  }

  if (!apiBaseUrl) {
    throw new Error(
      "Не задан NEXT_PUBLIC_API_URL или NEXT_PUBLIC_GRAPHQL_URL для GraphQL API",
    );
  }

  return apiBaseUrl.endsWith("/graphql") ? apiBaseUrl : `${apiBaseUrl}/graphql`;
}

const graphqlUrl = resolveGraphqlUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function graphqlNumericEnumLiteral(
  value: number,
  fallback: number,
): string {
  return Number.isFinite(value) ? String(value) : String(fallback);
}

export function graphqlNamedEnumLiteral(
  value: string | undefined,
  fallback: string,
): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{
    message?: string;
    extensions?: Record<string, unknown>;
  }>;
};

type GraphqlOptions = RequestInit & {
  token?: string;
};

export async function graphqlRequest<TData>(
  query: string,
  variables?: Record<string, unknown>,
  options?: GraphqlOptions,
): Promise<TData> {
  const response = await fetch(graphqlUrl, {
    method: "POST",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
      ...(options?.token
        ? { Authorization: `Bearer ${options.token}` }
        : {}),
    },
    body: JSON.stringify({
      query,
      variables: variables ?? {},
    }),
  });

  let payload: GraphqlResponse<TData> | null = null;

  try {
    payload = (await response.json()) as GraphqlResponse<TData>;
  } catch {
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Ошибка ${response.status}: ${response.statusText}`,
      );
    }

    throw new ApiError(response.status, "GraphQL API вернул некорректный JSON");
  }

  if (!response.ok || payload.errors?.length) {
    const message =
      payload.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join("\n") ||
      `Ошибка ${response.status}: ${response.statusText}`;

    throw new ApiError(response.status, message, payload.errors);
  }

  if (!payload.data) {
    throw new ApiError(response.status, "GraphQL API не вернул данные");
  }

  return payload.data;
}
