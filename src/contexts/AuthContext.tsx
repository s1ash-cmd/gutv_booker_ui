"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import toast, { Toaster } from "react-hot-toast";
import { authApi } from "@/lib/authApi";
import { userApi } from "@/lib/userApi";

interface User {
  id: string;
  login: string;
  name: string;
  role: string;
  isTelegramLinked: boolean;
  avatarSeed: string | null;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuth: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJWT(token: string): Record<string, unknown> {
  const base64Url = token.split(".")[1];
  if (!base64Url) {
    throw new Error("Некорректный JWT");
  }

  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

  while (base64.length % 4 !== 0) {
    base64 += "=";
  }

  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );
  const jsonPayload = new TextDecoder().decode(bytes);

  return JSON.parse(jsonPayload) as Record<string, unknown>;
}

function parseBooleanClaim(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function mapJwtToUser(payload: Record<string, unknown>): User {
  const role =
    (payload.role as string | undefined) ??
    (payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] as
      | string
      | undefined) ??
    "User";

  const login =
    (payload.unique_name as string | undefined) ??
    (payload.login as string | undefined) ??
    "";

  const name =
    (payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as
      | string
      | undefined) ??
    (payload.name as string | undefined) ??
    login;

  return {
    id: String(payload.sub ?? ""),
    login,
    name,
    role,
    isTelegramLinked: parseBooleanClaim(payload.isTelegramLinked),
    avatarSeed: (payload.avatarSeed as string | undefined) ?? null,
    avatarUrl: null,
  };
}

type AuthState = {
  user: User | null;
  isLoading: boolean;
  sessionKey: string;
};

function readSession() {
  return {
    accessToken: localStorage.getItem("access_token"),
    refreshToken: localStorage.getItem("refresh_token"),
    sessionId: localStorage.getItem("auth_session_id"),
  };
}

function getSessionKey(
  session: ReturnType<typeof readSession>,
  userId?: string,
) {
  return JSON.stringify([session.sessionId, userId ?? null]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    sessionKey: "initial",
  });
  const requestVersion = useRef(0);
  const lastSnapshot = useRef<string | null>(null);

  const setUser = useCallback((user: User | null) => {
    // Login and profile updates must also invalidate an earlier get_me request.
    requestVersion.current += 1;
    const session = readSession();
    lastSnapshot.current = JSON.stringify(session);
    setState({
      user,
      isLoading: false,
      sessionKey: getSessionKey(session, user?.id),
    });
  }, []);

  useEffect(() => {
    let isActive = true;

    async function synchronizeUser() {
      const session = readSession();
      const snapshot = JSON.stringify(session);
      if (lastSnapshot.current === snapshot) return;
      lastSnapshot.current = snapshot;
      const version = ++requestVersion.current;

      const isCurrent = () => {
        if (!isActive || requestVersion.current !== version) return false;
        const current = readSession();
        if (current.sessionId !== session.sessionId) return false;
        // Rotation may replace the JWT without changing the login session.
        if (!session.accessToken) return !current.accessToken;
        if (!current.accessToken) return false;
        try {
          return (
            String(decodeJWT(current.accessToken).sub ?? "") ===
            String(decodeJWT(session.accessToken).sub ?? "")
          );
        } catch {
          return false;
        }
      };

      if (!session.accessToken) {
        setState({
          user: null,
          isLoading: false,
          sessionKey: getSessionKey(session),
        });
        return;
      }

      try {
        const payload = decodeJWT(session.accessToken);
        const expiresAt = Number(payload.exp) * 1000;
        const isExpired = Number.isFinite(expiresAt) && expiresAt < Date.now();
        if (isExpired && !session.refreshToken) {
          authApi.clearSession();
          setUser(null);
          return;
        }

        const jwtUser = mapJwtToUser(payload);
        const sessionKey = getSessionKey(session, jwtUser.id);
        setState((previous) => ({
          user: jwtUser,
          isLoading: previous.sessionKey !== sessionKey || previous.isLoading,
          sessionKey,
        }));

        try {
          const freshUser = await userApi.get_me();
          if (isCurrent()) {
            setState({
              user: {
                id: String(freshUser.id),
                login: freshUser.login,
                name: freshUser.name,
                role: freshUser.role,
                isTelegramLinked: freshUser.isTelegramLinked,
                avatarSeed: freshUser.avatarSeed,
                avatarUrl: freshUser.avatarUrl,
              },
              isLoading: false,
              sessionKey,
            });
          }
        } catch (error) {
          if (isCurrent())
            console.error("Ошибка синхронизации пользователя:", error);
        } finally {
          if (isCurrent()) {
            setState((previous) => ({ ...previous, isLoading: false }));
          } else if (isActive && requestVersion.current === version) {
            // Token rejection can clear storage in this tab, where no storage
            // event is emitted. Synchronize immediately in that case too.
            void synchronizeUser();
          }
        }
      } catch (error) {
        // This branch runs synchronously, before another tab can change storage.
        console.error("Ошибка декодирования токена:", error);
        authApi.clearSession();
        setUser(null);
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (
        event.key === null ||
        event.key === "auth_session_id" ||
        event.key === "access_token" ||
        event.key === "refresh_token"
      ) {
        void synchronizeUser();
      }
    };

    window.addEventListener("storage", onStorage);
    void synchronizeUser();
    return () => {
      isActive = false;
      requestVersion.current += 1;
      lastSnapshot.current = null;
      window.removeEventListener("storage", onStorage);
    };
  }, [setUser]);

  const logout = async () => {
    try {
      await authApi.logout();
      if (localStorage.getItem("access_token")) return;
      setUser(null);
      window.location.replace("/");
    } catch (error) {
      if (error instanceof Error && error.name === "SessionChangedError")
        return;
      toast.error(
        error instanceof Error ? error.message : "Не удалось завершить сессию",
      );
    }
  };

  return (
    <AuthContext.Provider
      key={state.sessionKey}
      value={{
        user: state.user,
        isAuth: !!state.user,
        isLoading: state.isLoading,
        logout,
        setUser,
      }}
    >
      <Toaster position="top-center" />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
