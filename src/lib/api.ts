const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
const inflightGetRequests = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getMethod(options?: RequestInit) {
  return (options?.method ?? 'GET').toUpperCase();
}

function getRequestKey(url: string, options?: RequestInit) {
  return `${getMethod(options)}:${url}`;
}

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const url = `${apiUrl}${path}`;
  const request = (async () => {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options
    });

    if (!response.ok) {
      let errorMessage = "API error";
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        } else {
          errorMessage = await response.text();
        }
      } catch {
        errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
      }

      throw new ApiError(response.status, errorMessage);
    }

    return response.json();
  })();

  if (getMethod(options) !== 'GET') {
    return request;
  }

  const key = getRequestKey(url, options);
  const inflightRequest = inflightGetRequests.get(key) as Promise<T> | undefined;

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightGetRequests.set(key, request);

  try {
    return await request;
  } finally {
    inflightGetRequests.delete(key);
  }
}
