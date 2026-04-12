import {
  CreateEventRequestDto,
  EventResponseDto,
} from "@/app/models/event/event";
import { graphqlNamedEnumLiteral, graphqlRequest } from "./api";
import { BookingStatus } from "@/app/models/booking/booking";
import { authenticatedGraphqlRequest } from "./authApi";

type GraphqlEvent = {
  id: number;
  client: string;
  reason: string;
  creationTime: string;
  startTime: string;
  endTime: string;
  status: string;
  warningsJson?: string | null;
  comment?: string | null;
  adminComment?: string | null;
};

const eventStatusNames: Record<number, string> = {
  [BookingStatus.Pending]: "Pending",
  [BookingStatus.Cancelled]: "Cancelled",
  [BookingStatus.Approved]: "Approved",
  [BookingStatus.Completed]: "Completed",
};

function parseWarnings(value?: string | null) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mapEvent(event: GraphqlEvent): EventResponseDto {
  return {
    id: event.id,
    client: event.client,
    reason: event.reason,
    creationTime: event.creationTime,
    startTime: event.startTime,
    endTime: event.endTime,
    status: event.status,
    warnings: parseWarnings(event.warningsJson),
    comment: event.comment ?? null,
    adminComment: event.adminComment ?? null,
  };
}

const eventFields = `
  id
  client
  reason
  creationTime
  startTime
  endTime
  status
  warningsJson
  comment
  adminComment
`;

export const eventApi = {
  get_all: async () => {
    const data = await authenticatedGraphqlRequest<{ allEvents: GraphqlEvent[] }>(
      `
        query AllEvents {
          allEvents {
            ${eventFields}
          }
        }
      `,
    );

    return data.allEvents.map(mapEvent);
  },

  get_by_id: async (id: number) => {
    const data = await authenticatedGraphqlRequest<{ eventById: GraphqlEvent }>(
      `
        query EventById($id: Int!) {
          eventById(id: $id) {
            ${eventFields}
          }
        }
      `,
      { id },
    );

    return mapEvent(data.eventById);
  },

  create_event: async (input: CreateEventRequestDto) => {
    const data = await graphqlRequest<{ createEvent: GraphqlEvent }>(
      `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            ${eventFields}
          }
        }
      `,
      {
        input: {
          client: input.client,
          reason: input.reason,
          startTime: input.startTime,
          endTime: input.endTime,
          comment: input.comment ?? null,
        },
      },
    );

    return mapEvent(data.createEvent);
  },

  get_by_status: async (status: BookingStatus) => {
    const statusLiteral = graphqlNamedEnumLiteral(
      eventStatusNames[status],
      "Pending",
    );
    const data = await authenticatedGraphqlRequest<{ eventsByStatus: GraphqlEvent[] }>(
      `
        query EventsByStatus {
          eventsByStatus(status: ${statusLiteral}) {
            ${eventFields}
          }
        }
      `,
    );

    return data.eventsByStatus.map(mapEvent);
  },

  approve: async (id: number, adminComment?: string) => {
    const data = await authenticatedGraphqlRequest<{ approveEvent: GraphqlEvent }>(
      `
        mutation ApproveEvent($id: Int!, $adminComment: String) {
          approveEvent(id: $id, adminComment: $adminComment) {
            ${eventFields}
          }
        }
      `,
      {
        id,
        adminComment: adminComment?.trim() ? adminComment : null,
      },
    );

    return mapEvent(data.approveEvent);
  },

  cancel: async (id: number, adminComment?: string) => {
    const data = await authenticatedGraphqlRequest<{ cancelEvent: GraphqlEvent }>(
      `
        mutation CancelEvent($id: Int!, $adminComment: String) {
          cancelEvent(id: $id, adminComment: $adminComment) {
            ${eventFields}
          }
        }
      `,
      {
        id,
        adminComment: adminComment?.trim() ? adminComment : null,
      },
    );

    return mapEvent(data.cancelEvent);
  },

  complete: async (id: number) => {
    const data = await authenticatedGraphqlRequest<{ completeEvent: GraphqlEvent }>(
      `
        mutation CompleteEvent($id: Int!) {
          completeEvent(id: $id) {
            ${eventFields}
          }
        }
      `,
      { id },
    );

    return mapEvent(data.completeEvent);
  },
};
