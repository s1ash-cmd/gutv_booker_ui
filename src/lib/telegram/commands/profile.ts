import { telegramBackendApi } from "../backendApi";
import type { TelegramClient } from "../client";
import type { ICommand } from "./types";

export class ProfileCommand implements ICommand {
  public name = "👤 Профиль";

  public async executeAsync(
    client: TelegramClient,
    message: any,
  ): Promise<void> {
    const chatId = BigInt(message.chat.id);
    const user = await telegramBackendApi.getUserByTelegramChatId(chatId);

    if (!user) {
      await client.sendMessage({
        chat_id: chatId,
        text: "❌ Пользователь не найден.\nИспользуйте /link для привязки аккаунта.",
      });
      return;
    }

    const role = user.role;

    const response = [
      "👤 <b>Ваш профиль:</b>\n",
      `<b>Имя:</b> <code>${user.name}</code>`,
      `<b>Логин:</b> <code>${user.login}</code>`,
      `<b>Роль:</b> <code>${this.getRole(role)}</code>`,
      `<b>Разрешение на Ronin:</b> <code>${role === "Admin" || role === "Ronin" ? "Да" : "Нет"}</code>`,
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

  private getRole(role: string): string {
    switch (role) {
      case "Admin":
        return "Администратор";
      case "Ronin":
        return "Ronin";
      case "Osnova":
        return "Основа";
      case "User":
      default:
        return "Член GUtv";
    }
  }
}
