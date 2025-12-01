import { UserResponseDto, CreateUserRequest } from '@/app/types/user';
import { authenticatedApi } from './authApi';
import { api } from './api';

export const userApi = {
  create_user: (data: CreateUserRequest) =>
    api<CreateUserRequest>('/Users/create', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  get_all: () =>
    authenticatedApi<UserResponseDto[]>('/Users/get_all'),

  get_me: () =>
    authenticatedApi<UserResponseDto>('/Users/get_me'),

  get_by_id: (id: number) =>
    authenticatedApi<UserResponseDto>(`/Users/get_by_id/${id}`),

  get_by_name: (namepart: string) =>
    authenticatedApi<UserResponseDto>(`/Users/get_by_name/${namepart}`),

  get_by_role: (role: number) =>
    authenticatedApi<UserResponseDto>(`/Users/get_by_role/${role}`),

  ban: (id: number) =>
    authenticatedApi<UserResponseDto>(`/Users/ban/${id}`, {
      method: 'PATCH'
    }),
  unban: (id: number) =>
    authenticatedApi<UserResponseDto>(`/Users/unban/${id}`, {
      method: 'PATCH'
    }),
  make_admin: (id: number) =>
    authenticatedApi<UserResponseDto>(`/Users/make_admin/${id}`, {
      method: 'PATCH'
    }),
  grant_ronin: (id: number) =>
    authenticatedApi<UserResponseDto>(`/Users/grant_ronin/${id}`, {
      method: 'PATCH'
    }),
  make_user: (id: number) =>
    authenticatedApi<UserResponseDto>(`/Users/make_user/${id}`, {
      method: 'PATCH'
    }),

}
