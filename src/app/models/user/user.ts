export enum UserRole {
  User = 0,
  Osnova = 1,
  Ronin = 2,
  Admin = 3
}

export interface CreateUserRequestDto {
  login: string;
  password: string;
  name: string;
  joinYear: number;
  ronin: boolean;
}

export interface UserResponseDto {
  id: number;
  name: string;
  login: string;
  telegramChatId: bigint | null;
  telegramUsername: string | null;
  isTelegramLinked: boolean;
  role: string;
  banned: boolean;
}

export interface TelegramLinkCodeResponse {
  code: string;
  deepLink: string;
  expiresIn: string;
  botUsername: string;
  instruction: string;
}

export interface UnlinkTelegramResponse {
  message: string;
}