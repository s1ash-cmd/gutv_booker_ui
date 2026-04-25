import { getRedis } from "@/lib/redis";
import { type TelegramBookingDto, telegramBackendApi } from "./backendApi";
import { TelegramClient } from "./client";
import { BackCommand } from "./commands/back";
import { BookingFilterCommand } from "./commands/bookingFilter";
import { BookingCommand } from "./commands/bookings";
import { HelpCommand } from "./commands/help";
import { LinkCommand } from "./commands/link";
import { ProfileCommand } from "./commands/profile";
import { StartCommand } from "./commands/start";
import type { ICommand } from "./commands/types";

export class TelegramUpdateHandler {
  private client: TelegramClient;
  private commands: Map<string, ICommand | (() => ICommand)>;

  constructor() {
    this.client = new TelegramClient();
    this.commands = this.registerCommands();
  }

  private registerCommands(): Map<string, ICommand | (() => ICommand)> {
    const commands = new Map<string, ICommand | (() => ICommand)>();

    const startCmd = new StartCommand();
    const profileCmd = new ProfileCommand();
    const bookingCmd = new BookingCommand();
    const helpCmd = new HelpCommand();
    const backCmd = new BackCommand();

    commands.set(startCmd.name, startCmd);
    commands.set(profileCmd.name, profileCmd);
    commands.set(bookingCmd.name, bookingCmd);
    commands.set(helpCmd.name, helpCmd);
    commands.set(backCmd.name, backCmd);

    const linkCmd = new LinkCommand();
    commands.set("/link", linkCmd);

    const filterButtons = [
      { label: "⏳ Ожидают", status: "pending" },
      { label: "✅ Одобренные", status: "approved" },
      { label: "🏁 Завершенные", status: "completed" },
      { label: "❌ Отмененные", status: "cancelled" },
      { label: "📋 Все бронирования", status: "all" },
    ];

    for (const button of filterButtons) {
      commands.set(
        button.label,
        () => new BookingFilterCommand(button.status, button.label),
      );
    }

    return commands;
  }

  async handleUpdateAsync(update: any) {
    try {
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
        return;
      }

      const message = update.message;
      if (!message?.text) return;

      const chatId = message.chat.id;
      const text = message.text;
      const username = message.from?.username || "Unknown";

      console.log(`Получено от @${username} (ChatId: ${chatId}): ${text}`);

      await this.updateUsername(chatId, username);

      const redis = getRedis();
      const pendingKey = `pending_comment:${chatId}`;
      const pendingDataStr = await redis.get(pendingKey);
      const pendingData = pendingDataStr
        ? (JSON.parse(pendingDataStr) as { action: string; bookingId: number })
        : null;

      if (pendingData && message.reply_to_message) {
        await this.handleCommentReply(chatId, text, pendingData);
        await redis.del(pendingKey);
        return;
      }

      await this.executeCommand(text, message);
    } catch (error) {
      console.error("Ошибка обработки обновления:", error);
    }
  }

  private async handleCallbackQuery(callbackQuery: any) {
    try {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      console.log(`Callback от ChatId: ${chatId}, Data: ${data}`);

      if (data?.startsWith("booking:")) {
        const parts = data.split(":");
        if (parts.length !== 3) return;

        const [_, action, bookingIdStr] = parts;
        const bookingId = parseInt(bookingIdStr, 10);

        const admin = await telegramBackendApi.getUserByTelegramChatId(chatId);
        if (!admin || admin.role !== "Admin") {
          await this.client.answerCallbackQuery({
            callback_query_id: callbackQuery.id,
            text: "❌ У вас нет прав для этого действия",
            show_alert: true,
          });
          return;
        }

        const redis = getRedis();
        const pendingKey = `pending_comment:${chatId}`;
        await redis.set(
          pendingKey,
          JSON.stringify({ action, bookingId }),
          "EX",
          600,
        );

        const actionText = action === "approve" ? "одобрения" : "отклонения";

        await this.client.sendMessage({
          chat_id: chatId,
          text: `📝 Введите комментарий для ${actionText} бронирования #${bookingId}\nили напишите "-" чтобы пропустить`,
          reply_markup: { force_reply: true, selective: true },
        });

        await this.client.answerCallbackQuery({
          callback_query_id: callbackQuery.id,
        });
      }
    } catch (error) {
      console.error("Ошибка обработки Callback Query:", error);
    }
  }

  private async handleCommentReply(
    chatId: number,
    text: string,
    pendingData: { action: string; bookingId: number },
  ) {
    const { action, bookingId } = pendingData;

    try {
      const comment = text === "-" ? null : text;
      const booking =
        action === "approve"
          ? await telegramBackendApi.approveBookingByTelegram(
              chatId,
              bookingId,
              comment,
            )
          : await telegramBackendApi.rejectBookingByTelegram(
              chatId,
              bookingId,
              comment,
            );

      if (action === "approve") {
        await this.client.sendMessage({
          chat_id: chatId,
          text: `✅ Бронирование #${bookingId} одобрено`,
        });
      } else if (action === "reject") {
        await this.client.sendMessage({
          chat_id: chatId,
          text: `❌ Бронирование #${bookingId} отклонено`,
        });
      }

      await this.notifyBookingStatusChanged(booking);
    } catch (error: any) {
      console.error("Ошибка обработки комментария:", error);
      await this.client.sendMessage({
        chat_id: chatId,
        text: `❌ ${error.message || "Произошла ошибка"}`,
      });
    }
  }

  private async notifyBookingStatusChanged(booking: TelegramBookingDto) {
    if (!booking.userTelegramChatId) {
      return;
    }

    let message = `${this.getStatusEmoji(booking.status)} <b>Изменение статуса бронирования #${booking.id}</b>\n\n`;
    message += `<b>Новый статус:</b> <b>${this.getStatusText(booking.status)}</b>\n\n`;
    message += `📝 <b>Причина:</b> ${booking.reason}\n`;
    message += `📅 <b>Период:</b> ${this.formatDate(booking.startTime)} - ${this.formatDate(booking.endTime)}\n\n`;
    message += `📦 <b>Оборудование:</b>\n`;

    for (const item of booking.equipmentModelIds) {
      message += `   • ${item.modelName} (${item.inventoryNumber})\n`;
    }

    if (booking.adminComment) {
      message += `\n💬 <b>Комментарий администратора:</b> ${booking.adminComment}`;
    }

    await this.client.sendMessage({
      chat_id: Number(booking.userTelegramChatId),
      text: message,
      parse_mode: "HTML",
    });
  }

  private getStatusEmoji(status: string) {
    switch (status) {
      case "Approved":
        return "✅";
      case "Completed":
        return "🏁";
      case "Cancelled":
        return "❌";
      default:
        return "⏳";
    }
  }

  private getStatusText(status: string) {
    switch (status) {
      case "Pending":
        return "Ожидает";
      case "Approved":
        return "Одобрено";
      case "Completed":
        return "Завершено";
      case "Cancelled":
        return "Отменено";
      default:
        return status;
    }
  }

  private formatDate(date: string) {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  private async updateUsername(chatId: number, username: string) {
    try {
      await telegramBackendApi.updateTelegramUsername(
        chatId,
        username === "Unknown" ? null : username,
      );
    } catch (error) {
      console.warn(`Не удалось обновить username для ChatId: ${chatId}`, error);
    }
  }

  private async executeCommand(text: string, message: any) {
    const chatId = message.chat.id;
    const commandKey = text.split(" ")[0];

    const command = this.commands.get(text) || this.commands.get(commandKey);

    if (command) {
      const instance = typeof command === "function" ? command() : command;
      await instance.executeAsync(this.client, message);
    } else {
      await this.client.sendMessage({
        chat_id: chatId,
        text: "❓ Неизвестная команда.\nДля вызова меню используйте /start",
      });
    }
  }

  public handleError(error: Error) {
    console.error("Ошибка Telegram бота:", error);
  }
}
