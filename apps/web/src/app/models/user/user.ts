export enum UserRole {
  User = 0,
  Osnova = 1,
  Ronin = 2,
  Admin = 3,
}

export interface UserResponseDto {
  id: number;
  name: string;
  login: string;
  telegramChatId: string | null;
  telegramUsername: string | null;
  isTelegramLinked: boolean;
  role: string;
  banned: boolean;
  banReason: string | null;
  avatarSeed: string | null;
  avatarUrl: string | null;
}

export type UserListGroup = "All" | "Admins" | "Osnova" | "Users" | "Banned";

export interface UserPage {
  items: UserResponseDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  counts: Record<"all" | "admins" | "osnova" | "users" | "banned", number>;
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
