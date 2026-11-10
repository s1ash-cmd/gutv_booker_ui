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

// The subtree remounts when the login session changes (another account, a logout), not
// when the access token is rotated within the same session.
function getSessionKey(session: ReturnType<typeof authApi.readSession>) {
  return JSON.stringify([session.sessionId, session.signedIn]);
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
    const session = authApi.readSession();
    lastSnapshot.current = JSON.stringify(session);
    setState({
      user,
      isLoading: false,
      sessionKey: getSessionKey(session),
    });
  }, []);

  useEffect(() => {
    let isActive = true;

    async function synchronizeUser() {
      const session = authApi.readSession();
      const snapshot = JSON.stringify(session);
      if (lastSnapshot.current === snapshot) return;
      lastSnapshot.current = snapshot;
      const version = ++requestVersion.current;
      const sessionKey = getSessionKey(session);

      const isCurrent = () =>
        isActive &&
        requestVersion.current === version &&
        JSON.stringify(authApi.readSession()) === snapshot;

      if (!session.signedIn) {
        setState({ user: null, isLoading: false, sessionKey });
        return;
      }

      // Nothing of a previous account may stay visible while this one loads.
      setState((previous) =>
        previous.sessionKey === sessionKey
          ? { ...previous, isLoading: true }
          : { user: null, isLoading: true, sessionKey },
      );

      try {
        // After a reload the access token comes from the refresh cookie.
        const token = await authApi.getAccessToken();
        if (!isCurrent() || !token) return;
        setState({
          user: mapJwtToUser(decodeJWT(token)),
          isLoading: true,
          sessionKey,
        });

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
          // A rejected session is forgotten in this tab, where no storage event is
          // emitted. Synchronize immediately in that case too.
          void synchronizeUser();
        }
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (
        event.key === null ||
        event.key === "auth_session_id" ||
        event.key === "auth_signed_in" ||
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
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
      // Another tab signed in again meanwhile; that login stays.
      if (authApi.readSession().signedIn) return;
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
