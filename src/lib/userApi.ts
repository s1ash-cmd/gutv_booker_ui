import { UserResponseDto, CreateUserRequest, TelegramLinkCodeResponse, UnlinkTelegramResponse } from '@/app/types/user';
import { authenticatedApi } from './authApi';
import { api } from './api';

export const userApi = {
  // POST - создание пользователя
  create_user: (data: CreateUserRequest) =>
    api<UserResponseDto>('/Users/create', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // POST - привязать тг
  generate_telegram_code: (): Promise<TelegramLinkCodeResponse> =>
    authenticatedApi<TelegramLinkCodeResponse>('/Users/generate_telegram_code', {
      method: 'POST',
    }),

  // POST - отвязать тг
  unlink_telegram: (): Promise<UnlinkTelegramResponse> =>
    authenticatedApi<UnlinkTelegramResponse>('/Users/unlink_telegram', {
      method: 'POST',
    }),

  // GET - все пользователи
  get_all: () =>
    authenticatedApi<UserResponseDto[]>('/Users/get_all'),

  // GET - текущий пользователь
  get_me: () =>
    authenticatedApi<UserResponseDto>('/Users/get_me'),

  // GET - по ID
  get_by_id: (id: number) =>
    authenticatedApi<UserResponseDto>(`/Users/get_by_id/${id}`),

  // GET - по имени
  get_by_name: (namepart: string) =>
    authenticatedApi<UserResponseDto[]>(`/Users/get_by_name/${namepart}`),

  // GET - по роли
  get_by_role: (role: number) =>
    authenticatedApi<UserResponseDto[]>(`/Users/get_by_role/${role}`),

  // PATCH - бан
  ban: (id: number) =>
    authenticatedApi<string>(`/Users/ban/${id}`, {
      method: 'PATCH'
    }),

  // PATCH - разбан
  unban: (id: number) =>
    authenticatedApi<string>(`/Users/unban/${id}`, {
      method: 'PATCH'
    }),

  // PATCH - сделать админом
  make_admin: (id: number) =>
    authenticatedApi<string>(`/Users/make_admin/${id}`, {
      method: 'PATCH'
    }),

  // PATCH - сделать обычным пользователем
  make_user: (id: number) =>
    authenticatedApi<string>(`/Users/make_user/${id}`, {
      method: 'PATCH'
    }),

  // PATCH - дать Ronin доступ
  grant_ronin: (id: number) =>
    authenticatedApi<string>(`/Users/grant_ronin/${id}`, {
      method: 'PATCH'
    }),

  // DELETE - удалить пользователя по ID
  delete: (id: number) =>
    authenticatedApi<string>(`/Users/delete/${id}`, {
      method: 'DELETE'
    }),

  // DELETE - удалить себя
  delete_me: () =>
    authenticatedApi<string>('/Users/delete_me', {
      method: 'DELETE'
    }),
}
