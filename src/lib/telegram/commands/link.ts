import { UserRole } from "@/app/models/user/user";
import { telegramBackendApi } from "../backendApi";
import type { TelegramClient } from "../client";
import type { ICommand } from "./types";

export class LinkCommand implements ICommand {
  public name = "/link";

  async executeAsync(client: TelegramClient, message: any): Promise<void> {
    const chatId = message.chat.id;
    const username = message.from?.username;

    const parts = message.text?.split(" ").filter((p: string) => p.length > 0);

    if (!parts || parts.length !== 2) {
      await client.sendMessage({
        chat_id: chatId,
        text:
          `❌ Неверный формат команды.\n\n` +
          `Используйте: <code>/link КОД</code>\n\n` +
          `Код можно получить в личном кабинете на сайте.`,
        parse_mode: "HTML",
      });
      return;
    }

    const code = parts[1];

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      await client.sendMessage({
        chat_id: chatId,
        text:
          `❌ Код должен состоять из 6 цифр.\n\n` +
          `Получите новый код в личном кабинете.`,
      });
      return;
    }

    try {
      const linkedUser = await telegramBackendApi.linkTelegramByCode(
        code,
        chatId,
        username || null,
      );

      console.log(
        `Telegram аккаунт @${username} (ChatId: ${chatId}) привязан к пользователю ${linkedUser.login}`,
      );

      await client.sendMessage({
        chat_id: chatId,
        text:
          `✅ <b>Telegram успешно привязан!</b>\n\n` +
          `Имя: ${linkedUser.name}\n` +
          `Логин: ${linkedUser.login}\n` +
          `Telegram: @${username || "не установлен"}\n` +
          `Роль: ${this.getRoleName(linkedUser.role)}\n\n` +
          `Теперь вы можете использовать все функции бота.\n` +
          `Используйте /start для вызова меню.`,
        parse_mode: "HTML",
      });
    } catch (error: any) {
      const message = error?.message ?? "";

      if (
        message.includes("Неверный код") ||
        message.includes("Срок действия кода") ||
        message.includes("ист")
      ) {
        await client.sendMessage({
          chat_id: chatId,
          text:
            `❌ <b>Неверный код привязки</b>\n\n` +
            `Проверьте код или сгенерируйте новый в личном кабинете.`,
          parse_mode: "HTML",
        });
        return;
      }

      if (message.includes("привязан")) {
        await client.sendMessage({
          chat_id: chatId,
          text: `❌ ${message.replace("ALREADY_LINKED: ", "")}`,
        });
        return;
      }

      console.error("Ошибка при привязке аккаунта:", error);
      await client.sendMessage({
        chat_id: chatId,
        text:
          `❌ Произошла ошибка при привязке аккаунта.\n` +
          `Попробуйте позже или обратитесь к администратору.`,
      });
    }
  }

  private getRoleName(role: string): string {
    switch (role) {
      case UserRole[UserRole.Admin]:
        return "Администратор";
      case UserRole[UserRole.Ronin]:
        return "Ronin";
      case UserRole[UserRole.Osnova]:
        return "Основа";
      case UserRole[UserRole.User]:
      default:
        return "Член GUtv";
    }
  }
}
