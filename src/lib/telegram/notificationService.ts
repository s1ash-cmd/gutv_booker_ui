import { prisma } from '@/lib/prisma';
import { TelegramClient } from './client';
import { BookingStatus } from '@/app/models/booking/booking';

export class TelegramNotificationService {
  private client: TelegramClient;

  constructor() {
    this.client = new TelegramClient();
  }

  async notifyAdminsNewBooking(bookingId: number) {
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: 3,
          telegramChatId: { not: null },
        },
      });

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
          bookingItems: {
            include: {
              equipmentItem: {
                include: { equipmentModel: true },
              },
            },
          },
        },
      });

      if (!booking) return;

      let warnings: Record<string, any> = {};
      try {
        warnings = booking.warningsJson
          ? JSON.parse(booking.warningsJson)
          : {};
      } catch (e) {
        console.error('Ошибка парсинга warningsJson:', e);
      }

      let message = `🆕 <b>Новое бронирование #${booking.id}</b>\n\n`;
      message += `👤 <b>Пользователь:</b> ${booking.user.name} (@${booking.user.telegramUsername || '-'})\n`;
      message += `📝 <b>Причина:</b> ${booking.reason}\n`;
      message += `📅 <b>Период:</b> ${this.formatDate(booking.startTime)} - ${this.formatDate(booking.endTime)}\n\n`;
      message += `📦 <b>Оборудование:</b>\n`;

      for (const item of booking.bookingItems) {
        message += `   • ${item.equipmentItem.equipmentModel.name} (${item.equipmentItem.inventoryNumber})\n`;
      }

      if (booking.comment) {
        message += `\n💭 Комментарий: ${booking.comment}`;
      }

      const warningMessages = this.formatWarnings(warnings);
      if (warningMessages.length > 0) {
        message += `\n\n⚠️ <b>Предупреждения:</b>\n${warningMessages.join('\n')}`;
      }

      message += `\n\n⏳ <b>Статус:</b> Ожидает подтверждения`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Подтвердить', callback_data: `booking:approve:${booking.id}` },
            { text: '❌ Отклонить', callback_data: `booking:reject:${booking.id}` },
          ],
        ],
      };

      for (const admin of admins) {
        await this.client.sendMessage({
          chat_id: Number(admin.telegramChatId!),
          text: message,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      }
    } catch (error) {
      console.error(`Ошибка отправки уведомлений о бронировании #${bookingId}:`, error);
    }
  }

  async notifyUserBookingStatusChanged(
    bookingId: number,
    oldStatus: BookingStatus,
    newStatus: BookingStatus
  ) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
          bookingItems: {
            include: {
              equipmentItem: { include: { equipmentModel: true } },
            },
          },
        },
      });

      if (!booking || !booking.user.telegramChatId) {
        console.log(`Пользователь ${booking?.user.name} не привязал Telegram`);
        return;
      }

      const emoji = this.getStatusEmoji(newStatus);
      const statusText = this.getStatusText(newStatus);
      const oldStatusText = this.getStatusText(oldStatus);

      let message = `${emoji} <b>Изменение статуса бронирования #${booking.id}</b>\n\n`;
      message += `<b>Статус изменен:</b> <s>${oldStatusText}</s> → <b>${statusText}</b>\n\n`;
      message += `📝 <b>Причина:</b> ${booking.reason}\n`;
      message += `📅 <b>Период:</b> ${this.formatDate(booking.startTime)} - ${this.formatDate(booking.endTime)}\n\n`;
      message += `📦 <b>Оборудование:</b>\n`;

      for (const item of booking.bookingItems) {
        message += `   • ${item.equipmentItem.equipmentModel.name} (${item.equipmentItem.inventoryNumber})\n`;
      }

      if (booking.adminComment) {
        message += `\n💬 <b>Комментарий администратора:</b> ${booking.adminComment}`;
      }

      await this.client.sendMessage({
        chat_id: Number(booking.user.telegramChatId),
        text: message,
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error(`Ошибка отправки уведомления о смене статуса #${bookingId}:`, error);
    }
  }

  private formatWarnings(warnings: Record<string, any>): string[] {
    const messages: string[] = [];

    for (const [key, value] of Object.entries(warnings)) {
      if (Array.isArray(value) && value.length > 0) {
        messages.push(`   • <b>${key}:</b> ${value.join(', ')}`);
      } else if (typeof value === 'string') {
        messages.push(`   • <b>${key}:</b> ${value}`);
      } else if (value && typeof value === 'object') {
        messages.push(`   • <b>${key}:</b> ${JSON.stringify(value)}`);
      }
    }

    return messages;
  }

  private getStatusEmoji(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Approved: return '✅';
      case BookingStatus.Completed: return '🏁';
      case BookingStatus.Cancelled: return '❌';
      default: return '⏳';
    }
  }

  private getStatusText(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Pending: return 'Ожидает';
      case BookingStatus.Approved: return 'Одобрено';
      case BookingStatus.Completed: return 'Завершено';
      case BookingStatus.Cancelled: return 'Отменено';
      default: return 'Неизвестно';
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }
}