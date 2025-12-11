"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  login: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuth: boolean;
  isLoading: boolean;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        const isExpired = payload.exp * 1000 < Date.now();

        if (!isExpired) {
          setUser({
            id: payload.sub,
            login: payload.unique_name,
            role: payload.role
          });
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      } catch (error) {
        console.error('Ошибка декодирования токена:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }

    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);

    window.location.replace('/');
  };


  return (
    <AuthContext.Provider value={{ user, isAuth: !!user, isLoading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
