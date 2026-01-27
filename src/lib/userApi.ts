import { UserResponseDto, CreateUserRequestDto, TelegramLinkCodeResponse, UnlinkTelegramResponse } from '@/app/models/user/user';
import { authenticatedApi } from './authApi';
import { api } from './api';

export const userApi = {
  // POST - создание пользователя
  create_user: (data: CreateUserRequestDto) =>
    api<UserResponseDto>('/api/users/create', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // // POST - привязать тг
  generate_telegram_code: (): Promise<TelegramLinkCodeResponse> =>
    authenticatedApi<TelegramLinkCodeResponse>('/api/users/generate_telegram_code', {
      method: 'POST',
    }),

  // // POST - отвязать тг
  unlink_telegram: (): Promise<UnlinkTelegramResponse> =>
    authenticatedApi<UnlinkTelegramResponse>('/api/users/unlink_telegram', {
      method: 'POST',
    }),

  // GET - все пользователи
  get_all: () =>
    authenticatedApi<UserResponseDto[]>('/api/users/get_all'),

  // GET - текущий пользователь
  get_me: () =>
    authenticatedApi<UserResponseDto>('/api/users/get_me'),

  // GET - по ID
  get_by_id: (id: number) =>
    authenticatedApi<UserResponseDto>(`/api/users/get_by_id/${id}`),

  // GET - по имени
  get_by_name: (namepart: string) =>
    authenticatedApi<UserResponseDto[]>(`/api/users/get_by_name/${namepart}`),

  // GET - по роли
  get_by_role: (role: number) =>
    authenticatedApi<UserResponseDto[]>(`/api/users/get_by_role/${role}`),

  // PATCH - бан
  ban: (id: number) =>
    authenticatedApi<string>(`/api/users/ban/${id}`, {
      method: 'PATCH'
    }),

  // PATCH - разбан
  unban: (id: number) =>
    authenticatedApi<string>(`/api/users/unban/${id}`, {
      method: 'PATCH'
    }),

  // PATCH - сделать админом
  make_admin: (id: number) =>
    authenticatedApi<string>(`/api/users/make_admin/${id}`, {
      method: 'PATCH'
    }),

  // PATCH - сделать обычным пользователем
  make_user: (id: number) =>
    authenticatedApi<string>(`/api/users/make_user/${id}`, {
      method: 'PATCH'
    }),

  // PATCH - дать Ronin доступ
  grant_ronin: (id: number) =>
    authenticatedApi<string>(`/api/users/grant_ronin/${id}`, {
      method: 'PATCH'
    }),

  // DELETE - удалить пользователя по ID
  delete: (id: number) =>
    authenticatedApi<string>(`/api/users/delete/${id}`, {
      method: 'DELETE'
    }),

  // DELETE - удалить себя
  delete_me: () =>
    authenticatedApi<string>('/api/users/delete_me', {
      method: 'DELETE'
    }),
}
