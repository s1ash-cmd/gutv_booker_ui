import {
  type BookingCalendarItemDto,
  BookingStatus,
  type CreateBookingRequestDto,
} from "@/app/models/booking/booking";
import { graphqlNamedEnumLiteral } from "./api";
import { authenticatedGraphqlRequest } from "./authApi";
import {
  bookingFields,
  type GraphqlBooking,
  mapBooking,
} from "./graphqlMappers";

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

function mapCalendarBooking(booking: GraphqlBooking): BookingCalendarItemDto {
  const dto = mapBooking(booking);
  return {
    id: dto.id,
    userName: dto.userName,
    login: dto.login,
    telegramUsername: dto.telegramUsername,
    reason: dto.reason,
    startTime: dto.startTime,
    endTime: dto.endTime,
    status: dto.status,
    equipment: dto.equipmentModelIds,
  };
}

function bookingOverlapsRange(
  booking: BookingCalendarItemDto,
  startIso?: string,
  endIso?: string,
) {
  if (!startIso || !endIso) {
    return true;
  }

  const start = new Date(startIso);
  const end = new Date(endIso);
  const bookingStart = new Date(booking.startTime);
  const bookingEnd = new Date(booking.endTime);

  return bookingStart < end && bookingEnd > start;
}

export const bookingApi = {
  get_calendar: async (startIso?: string, endIso?: string) => {
    const response = await authenticatedGraphqlRequest<{
      calendarBookings: GraphqlBooking[];
    }>(
      `
        query CalendarBookings($start: DateTime, $end: DateTime) {
          calendarBookings(start: $start, end: $end) {
            ${bookingFields}
          }
        }
      `,
      {
        start: startIso ?? null,
        end: endIso ?? null,
      },
    );

    return response.calendarBookings
      .map(mapCalendarBooking)
      .filter(
        (booking) =>
          (booking.status === "Pending" || booking.status === "Approved") &&
          bookingOverlapsRange(booking, startIso, endIso),
      );
  },

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
