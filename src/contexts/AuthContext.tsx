"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { userApi } from "@/lib/userApi";

interface User {
  id: string;
  login: string;
  name: string;
  role: string;
  isTelegramLinked: boolean;
  avatarSeed: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuth: boolean;
  isLoading: boolean;
  logout: () => void;
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
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function initializeUser() {
      const token = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (!token) {
        if (isActive) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const payload = decodeJWT(token);

        const expiresAt = Number(payload.exp) * 1000;
        const isExpired = Number.isFinite(expiresAt) && expiresAt < Date.now();

        if (!isExpired || refreshToken) {
          if (isActive) {
            setUser(mapJwtToUser(payload));
          }

          try {
            const freshUser = await userApi.get_me();
            if (isActive) {
              setUser({
                id: String(freshUser.id),
                login: freshUser.login,
                name: freshUser.name,
                role: freshUser.role,
                isTelegramLinked: freshUser.isTelegramLinked,
                avatarSeed: freshUser.avatarSeed,
              });
            }
          } catch (error) {
            console.error("Ошибка синхронизации пользователя:", error);
            if (isActive && !localStorage.getItem("access_token")) {
              setUser(null);
            }
          }
        } else {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      } catch (error) {
        console.error("Ошибка декодирования токена:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (isActive) {
          setUser(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void initializeUser();

    return () => {
      isActive = false;
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    window.location.replace("/");
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuth: !!user, isLoading, logout, setUser }}
    >
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
