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
  login: string;
  telegramChatId?: number;
  telegramUsername?: string;
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