"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  id: string;
  login: string;
  name: string;
  role: string;
  isTelegramLinked: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuth: boolean;
  isLoading: boolean;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJWT(token: string) {
  const base64Url = token.split(".")[1];
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

  while (base64.length % 4 !== 0) {
    base64 += "=";
  }

  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );

  return JSON.parse(jsonPayload);
}

function mapJwtToUser(payload: Record<string, unknown>): User {
  const role =
    (payload.role as string | undefined) ??
    (payload[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ] as string | undefined) ??
    "User";

  const login =
    (payload.unique_name as string | undefined) ??
    (payload.login as string | undefined) ??
    "";

  const name =
    (payload[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
    ] as string | undefined) ??
    (payload.name as string | undefined) ??
    login;

  return {
    id: String(payload.sub ?? ""),
    login,
    name,
    role,
    isTelegramLinked: Boolean(payload.isTelegramLinked),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (token) {
      try {
        const payload = decodeJWT(token);

        const isExpired = payload.exp * 1000 < Date.now();

        if (!isExpired || refreshToken) {
          setUser(mapJwtToUser(payload));
        } else {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      } catch (error) {
        console.error("Ошибка декодирования токена:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    }

    setIsLoading(false);
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
