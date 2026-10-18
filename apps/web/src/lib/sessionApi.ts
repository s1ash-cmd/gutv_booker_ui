import { authenticatedGraphqlRequest } from "./authApi";

export type UserSession = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgent: string | null;
  isCurrent: boolean;
};

export const sessionApi = {
  list: async () => {
    const data = await authenticatedGraphqlRequest<{
      mySessions: UserSession[];
    }>(`query MySessions {
      mySessions { id createdAt lastUsedAt expiresAt userAgent isCurrent }
    }`);
    return data.mySessions;
  },
  revoke: async (sessionId: string) => {
    const data = await authenticatedGraphqlRequest<{
      revokeMySession: boolean;
    }>(
      `mutation RevokeMySession($sessionId: UUID!) {
        revokeMySession(sessionId: $sessionId)
      }`,
      { sessionId },
    );
    return data.revokeMySession;
  },
};
