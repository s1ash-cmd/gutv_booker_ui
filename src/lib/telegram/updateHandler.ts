import { BookingStatus } from "@/app/models/booking/booking";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { TelegramClient } from "./client";
import { BackCommand } from "./commands/back";
import { BookingFilterCommand } from "./commands/bookingFilter";
import { BookingCommand } from "./commands/bookings";
import { HelpCommand } from "./commands/help";
import { LinkCommand } from "./commands/link";
import { ProfileCommand } from "./commands/profile";
import { StartCommand } from "./commands/start";
import type { ICommand } from "./commands/types";
import { TelegramNotificationService } from "./notificationService";

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
        const bookingId = parseInt(bookingIdStr);

        const admin = await prisma.user.findFirst({
          where: { telegramChatId: BigInt(chatId) },
        });

        if (!admin || admin.role !== 3) {
          await this.client.answerCallbackQuery({
            callback_query_id: callbackQuery.id,
            text: "❌ У вас нет прав для этого действия",
            show_alert: true,
          });
          return;
        }

        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
        });

        if (!booking || booking.status !== BookingStatus.Pending) {
          await this.client.answerCallbackQuery({
            callback_query_id: callbackQuery.id,
            text: "❌ Бронирование недоступно для обработки",
            show_alert: true,
          });
          return;
        }

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
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking || booking.status !== BookingStatus.Pending) {
        await this.client.sendMessage({
          chat_id: chatId,
          text: "❌ Это бронирование уже обработано",
        });
        return;
      }

      const comment = text === "-" ? null : text;
      const notificationService = new TelegramNotificationService();

      if (action === "approve") {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.Approved, adminComment: comment },
        });

        await this.client.sendMessage({
          chat_id: chatId,
          text: `✅ Бронирование #${bookingId} одобрено`,
        });
        await notificationService.notifyUserBookingStatusChanged(
          bookingId,
          BookingStatus.Pending,
          BookingStatus.Approved,
        );
      } else if (action === "reject") {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.Cancelled, adminComment: comment },
        });

        await this.client.sendMessage({
          chat_id: chatId,
          text: `❌ Бронирование #${bookingId} отклонено`,
        });
        await notificationService.notifyUserBookingStatusChanged(
          bookingId,
          BookingStatus.Pending,
          BookingStatus.Cancelled,
        );
      }
    } catch (error) {
      console.error("Ошибка обработки комментария:", error);
      await this.client.sendMessage({
        chat_id: chatId,
        text: "❌ Произошла ошибка",
      });
    }
  }

  private async updateUsername(chatId: number, username: string) {
    try {
      const user = await prisma.user.findFirst({
        where: { telegramChatId: BigInt(chatId) },
      });
      if (user && user.telegramUsername !== username) {
        await prisma.user.update({
          where: { id: user.id },
          data: { telegramUsername: username === "Unknown" ? null : username },
        });
      }
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