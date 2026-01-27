import { api, ApiError } from './api';

const apiUrl = process.env.NEXT_PUBLIC_API_URL!;

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');

  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  try {
    const response = await api<{ accessToken: string; refreshToken: string }>(
      '/api/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      }
    );

    localStorage.setItem('access_token', response.accessToken);
    localStorage.setItem('refresh_token', response.refreshToken);

    return response.accessToken;
  } catch (error) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    throw error;
  }
}

export async function authenticatedApi<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('access_token');

  const makeRequest = async (accessToken: string): Promise<T> => {
    const url = apiUrl ? `${apiUrl}${path}` : path;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
        'Authorization': `Bearer ${accessToken}`
      }
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

    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");

    if (response.status === 204 || contentLength === "0") {
      return {} as T;
    }

    const text = await response.text();

    if (!text || text.trim() === "") {
      return {} as T;
    }

    if (contentType && contentType.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn("Ошибка JSON:", text);
        return text as unknown as T;
      }
    }
    return text as unknown as T;
  };

  try {
    return await makeRequest(token || '');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;
          onTokenRefreshed(newToken);

          return await makeRequest(newToken);
        } catch (refreshError) {
          isRefreshing = false;

          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw refreshError;
        }
      } else {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (newToken: string) => {
            try {
              const result = await makeRequest(newToken);
              resolve(result);
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    }

    throw error;
  }
}

export const authApi = {
  login: async (login: string, password: string) => {
    const response = await api<{ accessToken: string; refreshToken: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ login, password })
      }
    );

    localStorage.setItem('access_token', response.accessToken);
    localStorage.setItem('refresh_token', response.refreshToken);

    return response;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  refreshToken: refreshAccessToken
};
