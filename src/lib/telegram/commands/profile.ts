import { UserRole } from "@/app/models/user/user";
import { UserService } from "@/services/userService";
import type { TelegramClient } from "../client";
import type { ICommand } from "./types";

export class ProfileCommand implements ICommand {
  private readonly userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public name = "👤 Профиль";

  public async executeAsync(
    client: TelegramClient,
    message: any,
  ): Promise<void> {
    const chatId = BigInt(message.chat.id);
    const user = await this.userService.getUserByTelegramChatId(chatId);

    if (!user) {
      await client.sendMessage({
        chat_id: chatId,
        text: "❌ Пользователь не найден.\nИспользуйте /link для привязки аккаунта.",
      });
      return;
    }

    const role = user.role as unknown as UserRole;

    const response = [
      "👤 <b>Ваш профиль:</b>\n",
      `<b>Имя:</b> <code>${user.name}</code>`,
      `<b>Логин:</b> <code>${user.login}</code>`,
      `<b>Роль:</b> <code>${this.getRole(role)}</code>`,
      `<b>Разрешение на Ronin:</b> <code>${role === UserRole.Admin || role === UserRole.Ronin ? "Да" : "Нет"}</code>`,
      user.banned ? "\n🚫 <b>Аккаунт заблокирован</b>" : "",
    ]
      .filter(Boolean)
      .join("\n");

    await client.sendMessage({
      chat_id: chatId,
      text: response,
      parse_mode: "HTML",
    });
  }

  private getRole(role: UserRole): string {
    switch (role) {
      case UserRole.Admin:
        return "Администратор";
      case UserRole.Ronin:
      case UserRole.Osnova:
      case UserRole.User:
      default:
        return "Пользователь";
    }
  }
}