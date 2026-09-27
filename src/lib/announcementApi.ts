import { authenticatedGraphqlRequest } from "./authApi";

export type Announcement = {
  id: number;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
};

const fields = "id title body authorName createdAt";

export const announcementApi = {
  async list(beforeId?: number) {
    const result = await authenticatedGraphqlRequest<{
      announcements: Announcement[];
    }>(
      `query Announcements($beforeId: Int) {
        announcements(beforeId: $beforeId, take: 21) { ${fields} }
      }`,
      { beforeId: beforeId ?? null },
    );
    return result.announcements;
  },
  async publish(title: string, body: string, requestId: string) {
    const result = await authenticatedGraphqlRequest<{
      publishAnnouncement: Announcement;
    }>(
      `mutation PublishAnnouncement($title: String!, $body: String!, $requestId: UUID!) {
        publishAnnouncement(title: $title, body: $body, requestId: $requestId) { ${fields} }
      }`,
      { title, body, requestId },
    );
    return result.publishAnnouncement;
  },
};
