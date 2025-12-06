import { api } from './api';

export async function authenticatedApi<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token');

  try {
    return await api<T>(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    throw error;
  }
}

export const authApi = {
  login: async (login: string, password: string) => {
    const response = await api<{ accessToken: string; refreshToken: string }>(
      '/Auth/login',
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
  }
};
