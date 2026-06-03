import type { BookingResponseDto } from "@/app/models/booking/booking";
import type { UserResponseDto } from "@/app/models/user/user";
import { graphqlRequest } from "@/lib/api";

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

function requireBotToken() {
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  return botToken;
}

export type TelegramBookingDto = BookingResponseDto & {
  userTelegramChatId: string | null;
};

type GraphqlUser = {
  id: number;
  name: string;
  login: string;
  telegramChatId: string | number | null;
  telegramUsername: string | null;
  role: string;
  banned: boolean;
  avatarSeed?: string | null;
};

type GraphqlBooking = {
  id: number;
  reason: string;
  creationTime: string;
  startTime: string;
  endTime: string;
  status: string;
  warningsJson?: string | null;
  comment?: string | null;
  adminComment?: string | null;
  user: {
    id: number;
    name: string;
    login: string;
    telegramChatId: string | number | null;
    telegramUsername: string | null;
    role: string;
    banned: boolean;
    avatarSeed?: string | null;
  };
  bookingItems: Array<{
    id: number;
    eqItemId: number;
    startDate: string;
    endDate: string;
    isReturned: boolean;
    eqItem: {
      inventoryNumber: string;
      eqModel: {
        name: string;
      };
    };
  }>;
};

function mapUser(user: GraphqlUser): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    telegramChatId:
      user.telegramChatId === null ? null : String(user.telegramChatId),
    telegramUsername: user.telegramUsername,
    isTelegramLinked: Boolean(user.telegramChatId),
    role: user.role,
    banned: user.banned,
    avatarSeed: user.avatarSeed ?? null,
  };
}

function parseWarnings(warningsJson?: string | null): Record<string, unknown> {
  if (!warningsJson) {
    return {};
  }

  try {
    return JSON.parse(warningsJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mapBooking(booking: GraphqlBooking): TelegramBookingDto {
  return {
    id: booking.id,
    userName: booking.user.name,
    login: booking.user.login,
    telegramUsername: booking.user.telegramUsername ?? "",
    userTelegramChatId:
      booking.user.telegramChatId === null
        ? null
        : String(booking.user.telegramChatId),
    reason: booking.reason,
    creationTime: booking.creationTime,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    warnings: parseWarnings(booking.warningsJson),
    comment: booking.comment ?? null,
    adminComment: booking.adminComment ?? null,
    equipmentModelIds: booking.bookingItems.map((item) => ({
      id: item.id,
      equipmentItemId: item.eqItemId,
      modelName: item.eqItem.eqModel.name,
      inventoryNumber: item.eqItem.inventoryNumber,
      startDate: item.startDate,
      endDate: item.endDate,
      isReturned: item.isReturned,
    })),
  };
}

const userFields = `
  id
  name
  login
  telegramChatId
  telegramUsername
  role
  banned
`;

const bookingFields = `
  id
  reason
  creationTime
  startTime
  endTime
  status
  warningsJson
  comment
  adminComment
  user {
    ${userFields}
  }
  bookingItems {
    id
    eqItemId
    startDate
    endDate
    isReturned
    eqItem {
      inventoryNumber
      eqModel {
        name
      }
    }
  }
`;

export const telegramBackendApi = {
  async getUserByTelegramChatId(
    chatId: number | bigint,
  ): Promise<UserResponseDto | null> {
    const data = await graphqlRequest<{
      userByTelegramChatId: GraphqlUser | null;
    }>(
      `
        query UserByTelegramChatId($botToken: String!, $chatId: Long!) {
          userByTelegramChatId(botToken: $botToken, chatId: $chatId) {
            ${userFields}
          }
        }
      `,
      { botToken: requireBotToken(), chatId: String(chatId) },
    );

    return data.userByTelegramChatId
      ? mapUser(data.userByTelegramChatId)
      : null;
  },

  async linkTelegramByCode(
    code: string,
    chatId: number | bigint,
    username?: string | null,
  ): Promise<UserResponseDto> {
    const data = await graphqlRequest<{
      linkTelegramByCode: GraphqlUser;
    }>(
      `
        mutation LinkTelegramByCode($botToken: String!, $code: String!, $chatId: Long!, $username: String) {
          linkTelegramByCode(botToken: $botToken, code: $code, chatId: $chatId, username: $username) {
            ${userFields}
          }
        }
      `,
      {
        botToken: requireBotToken(),
        code,
        chatId: String(chatId),
        username: username ?? null,
      },
    );

    return mapUser(data.linkTelegramByCode);
  },

  async updateTelegramUsername(
    chatId: number | bigint,
    username?: string | null,
  ): Promise<void> {
    await graphqlRequest(
      `
        mutation UpdateTelegramUsername($botToken: String!, $chatId: Long!, $username: String) {
          updateTelegramUsername(botToken: $botToken, chatId: $chatId, username: $username)
        }
      `,
      {
        botToken: requireBotToken(),
        chatId: String(chatId),
        username: username ?? null,
      },
    );
  },

  async getBookingsByTelegramChatId(
    chatId: number | bigint,
  ): Promise<TelegramBookingDto[]> {
    const data = await graphqlRequest<{
      bookingsByTelegramChatId: GraphqlBooking[];
    }>(
      `
        query BookingsByTelegramChatId($botToken: String!, $chatId: Long!) {
          bookingsByTelegramChatId(botToken: $botToken, chatId: $chatId) {
            ${bookingFields}
          }
        }
      `,
      { botToken: requireBotToken(), chatId: String(chatId) },
    );

    return data.bookingsByTelegramChatId.map(mapBooking);
  },

  async approveBookingByTelegram(
    chatId: number | bigint,
    bookingId: number,
    adminComment?: string | null,
  ): Promise<TelegramBookingDto> {
    const data = await graphqlRequest<{
      approveBookingByTelegram: GraphqlBooking;
    }>(
      `
        mutation ApproveBookingByTelegram($botToken: String!, $chatId: Long!, $bookingId: Int!, $adminComment: String) {
          approveBookingByTelegram(botToken: $botToken, chatId: $chatId, bookingId: $bookingId, adminComment: $adminComment) {
            ${bookingFields}
          }
        }
      `,
      {
        botToken: requireBotToken(),
        chatId: String(chatId),
        bookingId,
        adminComment: adminComment ?? null,
      },
    );

    return mapBooking(data.approveBookingByTelegram);
  },

  async rejectBookingByTelegram(
    chatId: number | bigint,
    bookingId: number,
    adminComment?: string | null,
  ): Promise<TelegramBookingDto> {
    const data = await graphqlRequest<{
      rejectBookingByTelegram: GraphqlBooking;
    }>(
      `
        mutation RejectBookingByTelegram($botToken: String!, $chatId: Long!, $bookingId: Int!, $adminComment: String) {
          rejectBookingByTelegram(botToken: $botToken, chatId: $chatId, bookingId: $bookingId, adminComment: $adminComment) {
            ${bookingFields}
          }
        }
      `,
      {
        botToken: requireBotToken(),
        chatId: String(chatId),
        bookingId,
        adminComment: adminComment ?? null,
      },
    );

    return mapBooking(data.rejectBookingByTelegram);
  },

  async getBookingById(bookingId: number): Promise<TelegramBookingDto> {
    const data = await graphqlRequest<{
      bookingById: GraphqlBooking;
    }>(
      `
        query BookingById($bookingId: Int!) {
          bookingById(id: $bookingId) {
            ${bookingFields}
          }
        }
      `,
      { bookingId },
    );

    return mapBooking(data.bookingById);
  },
};
