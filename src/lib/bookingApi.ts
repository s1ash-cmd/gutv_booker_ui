import {
  type BookingCalendarItemDto,
  type BookingResponseDto,
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

export type BookingPageOptions = {
  page: number;
  search: string;
  status: string;
  oldestFirst: boolean;
};

export type BookingPage = {
  items: BookingResponseDto[];
  totalCount: number;
  page: number;
  pageSize: number;
};

async function getBookingsPage(
  scope: "all" | "my",
  options: BookingPageOptions,
): Promise<BookingPage> {
  const field = scope === "all" ? "allBookingsPage" : "myBookingsPage";
  const response = await authenticatedGraphqlRequest<{
    bookingsPage: Omit<BookingPage, "items"> & { items: GraphqlBooking[] };
  }>(
    `query BookingsPage($page: Int!, $search: String, $status: BookingStatus, $oldestFirst: Boolean!) {
      bookingsPage: ${field}(page: $page, search: $search, status: $status, oldestFirst: $oldestFirst) {
        items { ${bookingFields} }
        totalCount
        page
        pageSize
      }
    }`,
    {
      ...options,
      search: options.search.trim() || null,
      status: options.status === "all" ? null : options.status,
    },
  );
  return {
    ...response.bookingsPage,
    items: response.bookingsPage.items.map(mapBooking),
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

type GraphqlCalendarBooking = Omit<
  BookingCalendarItemDto,
  "telegramUsername"
> & {
  telegramUsername: string | null;
};

function mapCalendarBooking(
  booking: GraphqlCalendarBooking,
): BookingCalendarItemDto {
  return {
    ...booking,
    telegramUsername: booking.telegramUsername ?? "",
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
  get_page: getBookingsPage,
  get_user_page: async (userId: number, page = 1): Promise<BookingPage> => {
    const data = await authenticatedGraphqlRequest<{
      bookingsPageByUser: Omit<BookingPage, "items"> & {
        items: GraphqlBooking[];
      };
    }>(
      `query BookingsPageByUser($userId: Int!, $page: Int!) {
        bookingsPageByUser(userId: $userId, page: $page) {
          items { ${bookingFields} }
          totalCount page pageSize
        }
      }`,
      { userId, page },
    );
    return {
      ...data.bookingsPageByUser,
      items: data.bookingsPageByUser.items.map(mapBooking),
    };
  },
  get_calendar: async (startIso?: string, endIso?: string) => {
    const response = await authenticatedGraphqlRequest<{
      calendarBookings: GraphqlCalendarBooking[];
    }>(
      `
        query CalendarBookings($start: DateTime, $end: DateTime) {
          calendarBookings(start: $start, end: $end) {
            id
            userName
            telegramUsername
            reason
            startTime
            endTime
            status
            equipment {
              id
              modelName
              inventoryNumber
            }
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

  approve: async (
    bookingId: number,
    adminComment: string,
    expectedRevision: number,
  ) => {
    await authenticatedGraphqlRequest<{ approveBooking: GraphqlBooking }>(
      `
        mutation ApproveBooking($bookingId: Int!, $adminComment: String, $expectedRevision: Int!) {
          approveBooking(bookingId: $bookingId, adminComment: $adminComment, expectedRevision: $expectedRevision) {
            id
          }
        }
      `,
      {
        bookingId,
        expectedRevision,
        adminComment: adminComment || null,
      },
    );

    return { message: "Бронирование одобрено" };
  },

  reject: async (
    bookingId: number,
    adminComment: string,
    expectedRevision: number,
  ) => {
    await authenticatedGraphqlRequest<{ rejectBooking: GraphqlBooking }>(
      `
        mutation RejectBooking($bookingId: Int!, $adminComment: String, $expectedRevision: Int!) {
          rejectBooking(bookingId: $bookingId, adminComment: $adminComment, expectedRevision: $expectedRevision) {
            id
          }
        }
      `,
      {
        bookingId,
        expectedRevision,
        adminComment: adminComment || null,
      },
    );

    return { message: "Бронирование отклонено" };
  },

  complete: async (id: number, expectedRevision: number) => {
    await authenticatedGraphqlRequest<{ completeBooking: GraphqlBooking }>(
      `
        mutation CompleteBooking($id: Int!, $expectedRevision: Int!) {
          completeBooking(id: $id, expectedRevision: $expectedRevision) {
            id
          }
        }
      `,
      { id, expectedRevision },
    );

    return { message: "Бронирование завершено" };
  },

  cancel: async (
    id: number,
    expectedRevision: number,
    adminComment?: string,
  ) => {
    await authenticatedGraphqlRequest<{ cancelBooking: GraphqlBooking }>(
      `
        mutation CancelBooking($id: Int!, $adminComment: String, $expectedRevision: Int!) {
          cancelBooking(id: $id, adminComment: $adminComment, expectedRevision: $expectedRevision) {
            id
          }
        }
      `,
      {
        id,
        expectedRevision,
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
