"use client";

import { useEffect, useState } from "react";
import { userApi } from "@/lib/userApi";
import { UserResponseDto } from "@/app/types/user";
import { getAvatarUrl } from "@/lib/avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const roleNames: Record<string, string> = {
  'Admin': 'Администратор',
  'Ronin': 'Пользователь',
  'Osnova': 'Пользователь',
  'User': 'Пользователь',
};

export default function Home() {
  const [userData, setUserData] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await userApi.get_me();
        setUserData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки данных");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const getInitials = (name: string) => {
    return name.substring(0, 1).toUpperCase();
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  if (error || !userData) {
    return (
      <main className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">{error || "Пользователь не найден"}</p>
        </div>
      </main>
    );
  }

  const isAdmin = userData.role === "Admin";
  const hasRoninAccess = userData.role === "Ronin" || userData.role === "Admin";

  return (
    <main className="p-6">
      <div className="flex justify-center">
        <div className="w-full max-w-xl">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                {isAdmin && (
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur opacity-75"></div>
                )}
                <Avatar className="h-24 w-24 relative border-2 border-background">
                  <AvatarImage
                    src={getAvatarUrl(userData.login, userData.role)}
                    alt={userData.login}
                  />
                  <AvatarFallback
                    className={cn(
                      "text-2xl font-bold",
                      isAdmin && "bg-primary text-primary-foreground"
                    )}
                  >
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">Имя</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{userData.name}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">Логин</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{userData.login}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">Telegram</span>
                {userData.telegramId ? (
                  <a
                    href={userData.telegramId}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-mono font-semibold text-primary hover:underline"
                  >
                    {userData.telegramId}
                  </a>
                ) : (
                  <span className="text-base font-mono font-semibold text-muted-foreground">
                    —
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">Роль</span>
                <span className="text-base font-semibold">
                  {roleNames[userData.role] || 'Пользователь'}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground font-medium">Есть разрешение на Ronin</span>
                <span className={cn(
                  "text-base font-semibold",
                  hasRoninAccess ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {hasRoninAccess ? "Да" : "Нет"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
