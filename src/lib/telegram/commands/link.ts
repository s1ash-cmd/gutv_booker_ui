import { ICommand } from './types';
import { TelegramClient } from '../client';
import { prisma } from '@/lib/prisma';

export class LinkCommand implements ICommand {
  public name = '/link';

  async executeAsync(client: TelegramClient, message: any): Promise<void> {
    const chatId = message.chat.id;
    const username = message.from?.username;

    const parts = message.text?.split(' ').filter((p: string) => p.length > 0);

    if (!parts || parts.length !== 2) {
      await client.sendMessage({
        chat_id: chatId,
        text:
          `❌ Неверный формат команды.\n\n` +
          `Используйте: <code>/link КОД</code>\n\n` +
          `Код можно получить в личном кабинете на сайте.`,
        parse_mode: 'HTML',
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
      const linkedUser = await this.linkTelegramByCode(code, chatId, username);

      console.log(
        `Telegram аккаунт @${username} (ChatId: ${chatId}) привязан к пользователю ${linkedUser.login}`
      );

      await client.sendMessage({
        chat_id: chatId,
        text:
          `✅ <b>Telegram успешно привязан!</b>\n\n` +
          `Имя: ${linkedUser.name}\n` +
          `Логин: ${linkedUser.login}\n` +
          `Telegram: @${username || 'не установлен'}\n` +
          `Роль: ${this.getRoleName(linkedUser.role)}\n\n` +
          `Теперь вы можете использовать все функции бота.\n` +
          `Используйте /start для вызова меню.`,
        parse_mode: 'HTML',
      });
    } catch (error: any) {
      if (error.message === 'CODE_NOT_FOUND') {
        await client.sendMessage({
          chat_id: chatId,
          text:
            `❌ <b>Неверный код привязки</b>\n\n` +
            `Проверьте код или сгенерируйте новый в личном кабинете.`,
          parse_mode: 'HTML',
        });
        return;
      }

      if (error.message?.startsWith('ALREADY_LINKED')) {
        await client.sendMessage({
          chat_id: chatId,
          text: `❌ ${error.message.replace('ALREADY_LINKED: ', '')}`,
        });
        return;
      }

      console.error('Ошибка при привязке аккаунта:', error);
      await client.sendMessage({
        chat_id: chatId,
        text:
          `❌ Произошла ошибка при привязке аккаунта.\n` +
          `Попробуйте позже или обратитесь к администратору.`,
      });
    }
  }

  private async linkTelegramByCode(
    code: string,
    chatId: number,
    username?: string
  ): Promise<{ name: string; login: string; role: number }> {
    const user = await prisma.user.findFirst({
      where: {
        telegramLinkCode: code,
        telegramLinkCodeExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('CODE_NOT_FOUND');
    }

    if (user.telegramChatId !== null) {
      throw new Error('ALREADY_LINKED: Этот аккаунт уже привязан к Telegram');
    }

    const existingUser = await prisma.user.findFirst({
      where: { telegramChatId: BigInt(chatId) },
    });

    if (existingUser) {
      throw new Error(
        'ALREADY_LINKED: Этот Telegram уже привязан к другому аккаунту'
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: BigInt(chatId),
        telegramUsername: username || null,
        telegramLinkCode: null,
        telegramLinkCodeExpiry: null,
      },
    });

    return {
      name: updatedUser.name,
      login: updatedUser.login,
      role: updatedUser.role,
    };
  }

  private getRoleName(role: number): string {
    switch (role) {
      case 3:
        return 'Администратор';
      case 2:
      case 1:
      case 0:
        return 'Пользователь';
      default:
        return 'Пользователь';
    }
  }
}