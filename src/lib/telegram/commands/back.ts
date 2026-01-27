import { UserService } from "@/services/userService";
import type { TelegramClient } from "../client";
import type { ICommand } from "./types";

export class BackCommand implements ICommand {
  private readonly userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public name = "« Назад в меню";

  public async executeAsync(
    client: TelegramClient,
    message: any,
  ): Promise<void> {
    const chatId = BigInt(message.chat.id);
    const user = await this.userService.getUserByTelegramChatId(chatId);

    if (!user) {
      await client.sendMessage({
        chat_id: chatId,
        text: "❌ Пользователь не найден",
      });
      return;
    }

    const keyboard = {
      keyboard: [
        [{ text: "👤 Профиль" }, { text: "📆 Мои бронирования" }],
        [{ text: "ℹ️ Помощь" }],
      ],
      resize_keyboard: true,
    };

    await client.sendMessage({
      chat_id: chatId,
      text: `👋 Главное меню\n\nВыберите действие:`,
      reply_markup: keyboard,
    });
  }
}
