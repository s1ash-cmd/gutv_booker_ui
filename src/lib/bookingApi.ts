import {
  BookingResponseDto,
  BookingStatus,
  CreateBookingRequestDto,
} from "@/app/models/booking/booking";
import { graphqlNamedEnumLiteral } from "./api";
import { authenticatedGraphqlRequest } from "./authApi";

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
    name: string;
    login: string;
    telegramUsername?: string | null;
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
    name
    login
    telegramUsername
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

function parseWarnings(warningsJson?: string | null) {
  if (!warningsJson) {
    return {};
  }

  try {
    return JSON.parse(warningsJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mapBooking(booking: GraphqlBooking): BookingResponseDto {
  return {
    id: booking.id,
    userName: booking.user.name,
    login: booking.user.login,
    telegramUsername: booking.user.telegramUsername ?? "",
    reason: booking.reason,
    creationTime: booking.creationTime,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    equipmentModelIds: booking.bookingItems.map((item) => ({
      id: item.id,
      equipmentItemId: item.eqItemId,
      modelName: item.eqItem.eqModel.name,
      inventoryNumber: item.eqItem.inventoryNumber,
      startDate: item.startDate,
      endDate: item.endDate,
      isReturned: item.isReturned,
    })),
    warnings: parseWarnings(booking.warningsJson),
    comment: booking.comment ?? null,
    adminComment: booking.adminComment ?? null,
  };
}

function toBookingInput(data: CreateBookingRequestDto) {
  return {
    reason: data.reason,
    startTime: data.startTime,
    endTime: data.endTime,
    comment: data.comment || null,
    equipment: data.equipment.map((item) => ({
      modelName: item.modelName,
      quantity: item.quantity,
    })),
  };
}

export const bookingApi = {
  create_booking: async (data: CreateBookingRequestDto) => {
    const response = await authenticatedGraphqlRequest<{
      createBooking: GraphqlBooking;
    }>(
      `
        mutation CreateBooking($input: CreateBookingInput!) {
          createBooking(input: $input) {
            ${bookingFields}
          }
        }
      `,
      {
        input: toBookingInput(data),
      },
    );

    return mapBooking(response.createBooking);
  },

  get_by_id: async (id: number) => {
    const response = await authenticatedGraphqlRequest<{
      bookingById: GraphqlBooking;
    }>(
      `
        query BookingById($id: Int!) {
          bookingById(id: $id) {
            ${bookingFields}
          }
        }
      `,
      { id },
    );

    return mapBooking(response.bookingById);
  },

  get_all: async () => {
    const response = await authenticatedGraphqlRequest<{
      allBookings: GraphqlBooking[];
    }>(
      `
        query AllBookings {
          allBookings {
            ${bookingFields}
          }
        }
      `,
    );

    return response.allBookings.map(mapBooking);
  },

  get_by_user: async (userId: number) => {
    const response = await authenticatedGraphqlRequest<{
      bookingsByUser: GraphqlBooking[];
    }>(
      `
        query BookingsByUser($userId: Int!) {
          bookingsByUser(userId: $userId) {
            ${bookingFields}
          }
        }
      `,
      { userId },
    );

    return response.bookingsByUser.map(mapBooking);
  },

  get_my_bookings: async () => {
    const response = await authenticatedGraphqlRequest<{
      myBookings: GraphqlBooking[];
    }>(
      `
        query MyBookings {
          myBookings {
            ${bookingFields}
          }
        }
      `,
    );

    return response.myBookings.map(mapBooking);
  },

  get_by_item: async (equipmentItemId: number) => {
    const response = await authenticatedGraphqlRequest<{
      bookingsByEquipmentItem: GraphqlBooking[];
    }>(
      `
        query BookingsByEquipmentItem($equipmentItemId: Int!) {
          bookingsByEquipmentItem(equipmentItemId: $equipmentItemId) {
            ${bookingFields}
          }
        }
      `,
      { equipmentItemId },
    );

    return response.bookingsByEquipmentItem.map(mapBooking);
  },

  get_by_status: async (status: BookingStatus) => {
    const statusLiteral = graphqlNamedEnumLiteral(
      bookingStatusNames[status],
      "Pending",
    );
    const response = await authenticatedGraphqlRequest<{
      bookingsByStatus: GraphqlBooking[];
    }>(
      `
        query BookingsByStatus {
          bookingsByStatus(status: ${statusLiteral}) {
            ${bookingFields}
          }
        }
      `,
    );

    return response.bookingsByStatus.map(mapBooking);
  },

  get_by_invnum: async (inventoryNumber: string) => {
    const response = await authenticatedGraphqlRequest<{
      bookingsByInventoryNumber: GraphqlBooking[];
    }>(
      `
        query BookingsByInventoryNumber($inventoryNumber: String!) {
          bookingsByInventoryNumber(inventoryNumber: $inventoryNumber) {
            ${bookingFields}
          }
        }
      `,
      { inventoryNumber },
    );

    return response.bookingsByInventoryNumber.map(mapBooking);
  },

  approve: async (bookingId: number, adminComment: string) => {
    await authenticatedGraphqlRequest<{ approveBooking: GraphqlBooking }>(
      `
        mutation ApproveBooking($bookingId: Int!, $adminComment: String) {
          approveBooking(bookingId: $bookingId, adminComment: $adminComment) {
            id
          }
        }
      `,
      {
        bookingId,
        adminComment: adminComment || null,
      },
    );

    return { message: "Бронирование одобрено" };
  },

  reject: async (bookingId: number, adminComment: string) => {
    await authenticatedGraphqlRequest<{ rejectBooking: GraphqlBooking }>(
      `
        mutation RejectBooking($bookingId: Int!, $adminComment: String) {
          rejectBooking(bookingId: $bookingId, adminComment: $adminComment) {
            id
          }
        }
      `,
      {
        bookingId,
        adminComment: adminComment || null,
      },
    );

    return { message: "Бронирование отклонено" };
  },

  complete: async (id: number) => {
    await authenticatedGraphqlRequest<{ completeBooking: GraphqlBooking }>(
      `
        mutation CompleteBooking($id: Int!) {
          completeBooking(id: $id) {
            id
          }
        }
      `,
      { id },
    );

    return { message: "Бронирование завершено" };
  },

  cancel: async (id: number, adminComment?: string) => {
    await authenticatedGraphqlRequest<{ cancelBooking: GraphqlBooking }>(
      `
        mutation CancelBooking($id: Int!, $adminComment: String) {
          cancelBooking(id: $id, adminComment: $adminComment) {
            id
          }
        }
      `,
      {
        id,
        adminComment: adminComment || null,
      },
    );

    return { message: "Бронирование отменено" };
  },
};
const bookingStatusNames: Record<number, string> = {
  [BookingStatus.Pending]: "Pending",
  [BookingStatus.Cancelled]: "Cancelled",
  [BookingStatus.Approved]: "Approved",
  [BookingStatus.Completed]: "Completed",
};
