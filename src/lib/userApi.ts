import type {
  CreateUserRequestDto,
  TelegramLinkCodeResponse,
  UnlinkTelegramResponse,
  UserResponseDto,
} from "@/app/models/user/user";
import { graphqlNamedEnumLiteral, graphqlRequest } from "./api";
import { authenticatedGraphqlRequest } from "./authApi";

type GraphqlUser = {
  id: number;
  name: string;
  login: string;
  telegramChatId: string | number | null;
  telegramUsername: string | null;
  role: string | number;
  banned: boolean;
};

const roleNames = ["User", "Osnova", "Ronin", "Admin"] as const;
const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ?? "";

function normalizeRole(role: string | number): string {
  if (typeof role === "number") {
    return roleNames[role] ?? "User";
  }

  const normalized = role.trim().toLowerCase();

  if (normalized === "admin") {
    return "Admin";
  }

  if (normalized === "ronin") {
    return "Ronin";
  }

  if (normalized === "osnova") {
    return "Osnova";
  }

  if (normalized === "user") {
    return "User";
  }

  return role;
}

function mapUser(user: GraphqlUser): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    telegramChatId:
      user.telegramChatId === null ? null : String(user.telegramChatId),
    telegramUsername: user.telegramUsername,
    isTelegramLinked: Boolean(user.telegramChatId),
    role: normalizeRole(user.role),
    banned: user.banned,
  };
}

function roleFromNumber(role: number) {
  return roleNames[role] ?? "User";
}

function setUserRole(userId: number, role: "User" | "Ronin" | "Admin") {
  const roleValue = graphqlNamedEnumLiteral(role, "User");
  return authenticatedGraphqlRequest<{ setUserRole: GraphqlUser }>(
    `
      mutation SetUserRole($userId: Int!) {
        setUserRole(userId: $userId, role: ${roleValue}) {
          id
        }
      }
    `,
    { userId },
  );
}

async function getAllUsers() {
  const data = await authenticatedGraphqlRequest<{ users: GraphqlUser[] }>(
    `
      query Users {
        users {
          id
          name
          login
          telegramChatId
          telegramUsername
          role
          banned
        }
      }
    `,
  );

  return data.users.map(mapUser);
}

export const userApi = {
  create_user: async (input: CreateUserRequestDto) => {
    const data = await graphqlRequest<{
      register: { user: GraphqlUser };
    }>(
      `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            user {
              id
              name
              login
              telegramChatId
              telegramUsername
              role
              banned
            }
          }
        }
      `,
      { input },
    );

    return mapUser(data.register.user);
  },

  generate_telegram_code: async (): Promise<TelegramLinkCodeResponse> => {
    const data = await authenticatedGraphqlRequest<{
      generateMyTelegramLinkCode: { code: string };
    }>(
      `
        mutation GenerateMyTelegramLinkCode {
          generateMyTelegramLinkCode {
            code
          }
        }
      `,
    );

    const code = data.generateMyTelegramLinkCode.code;
    const deepLink = botUsername
      ? `https://t.me/${botUsername}?start=LINK_${code}`
      : "";

    return {
      code,
      deepLink,
      expiresIn: "10 минут",
      botUsername,
      instruction: botUsername
        ? "Перейдите по ссылке или отправьте боту команду /link с этим кодом."
        : "Скопируйте код и отправьте его Telegram-боту вручную.",
    };
  },

  unlink_telegram: async (): Promise<UnlinkTelegramResponse> => {
    await authenticatedGraphqlRequest<{ unlinkMyTelegram: boolean }>(
      `
        mutation UnlinkMyTelegram {
          unlinkMyTelegram
        }
      `,
    );

    return { message: "Telegram успешно отвязан" };
  },

  get_all: getAllUsers,

  get_me: async () => {
    const data = await authenticatedGraphqlRequest<{ me: GraphqlUser }>(
      `
        query Me {
          me {
            id
            name
            login
            telegramChatId
            telegramUsername
            role
            banned
          }
        }
      `,
    );

    return mapUser(data.me);
  },

  get_by_id: async (id: number) => {
    const data = await authenticatedGraphqlRequest<{ userById: GraphqlUser }>(
      `
        query UserById($id: Int!) {
          userById(id: $id) {
            id
            name
            login
            telegramChatId
            telegramUsername
            role
            banned
          }
        }
      `,
      { id },
    );

    return mapUser(data.userById);
  },

  get_by_name: async (namepart: string) => {
    const users = await getAllUsers();
    const query = namepart.trim().toLowerCase();
    return users.filter((user) =>
      [user.name, user.login, user.telegramUsername ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  },

  get_by_role: async (role: number) => {
    const users = await getAllUsers();
    return users.filter((user) => user.role === roleFromNumber(role));
  },

  ban: async (id: number) => {
    await authenticatedGraphqlRequest<{ setUserBanned: GraphqlUser }>(
      `
        mutation SetUserBanned($userId: Int!, $banned: Boolean!) {
          setUserBanned(userId: $userId, banned: $banned) {
            id
          }
        }
      `,
      { userId: id, banned: true },
    );

    return "Пользователь заблокирован";
  },

  unban: async (id: number) => {
    await authenticatedGraphqlRequest<{ setUserBanned: GraphqlUser }>(
      `
        mutation SetUserBanned($userId: Int!, $banned: Boolean!) {
          setUserBanned(userId: $userId, banned: $banned) {
            id
          }
        }
      `,
      { userId: id, banned: false },
    );

    return "Пользователь разблокирован";
  },

  make_admin: async (id: number) => {
    await setUserRole(id, "Admin");

    return "Пользователь назначен администратором";
  },

  make_user: async (id: number) => {
    await setUserRole(id, "User");

    return "Роль пользователя обновлена";
  },

  grant_ronin: async (id: number) => {
    await setUserRole(id, "Ronin");

    return "Пользователю выдан доступ Ronin";
  },

  delete: async (_id: number) => {
    throw new Error("Удаление пользователя через GraphQL пока не реализовано");
  },

  delete_me: async () => {
    throw new Error("Самоудаление через GraphQL пока не реализовано");
  },
};
