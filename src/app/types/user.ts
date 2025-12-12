export enum UserRole {
  User = 0,
  Osnova = 1,
  Ronin = 2,
  Admin = 3,
}

export interface CreateUserRequest {
  login: string;
  password: string;
  name: string;
  joinYear: number;
  ronin: boolean;
}

export interface UserResponseDto {
  id: number;
  name: string;
  telegramId?: string;
  role: string;
  banned: boolean;
}