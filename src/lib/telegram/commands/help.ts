import type { TelegramClient } from "../client";
import type { ICommand } from "./types";

export class HelpCommand implements ICommand {
  public name = "ℹ️ Помощь";

  public async executeAsync(
    client: TelegramClient,
    message: any,
  ): Promise<void> {
    const chatId = BigInt(message.chat.id);

    const response = [
      "ℹ️ <b>Бот GUtv Booker</b>\n",
      "<b>Команды:</b>",
      "/start - Главное меню",
      "/link КОД - Привязать аккаунт\n",
      "Если что-то сломалось, введите /start\n\n",
      "<b>Контакты для связи:</b>",
      "<b>Директор студии</b>",
      "Адельшин Джемильхан @pzr_enjoyer\n",
      "<b>Технический директор</b>",
      "Кон Владислав @Qineya\n",
      "<b>Заместитель тех. директора</b>",
      "Борисов Максим @mspieler\n",
      "<b>Если что-то сломалось, но сильно</b>",
      "Петров Дмитрий @s1ash2k",
    ].join("\n");

    await client.sendMessage({
      chat_id: chatId,
      text: response,
      parse_mode: "HTML",
    });
  }
}
