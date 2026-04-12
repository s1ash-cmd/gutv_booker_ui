"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  Clock,
  MessageSquare,
  Send,
  Shield,
  User as UserIcon,
} from "lucide-react";

import { AdminOnly } from "@/components/AdminOnly";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { bookingApi } from "@/lib/bookingApi";
import { userApi } from "@/lib/userApi";
import { BookingResponseDto } from "@/app/models/booking/booking";
import { UserResponseDto } from "@/app/models/user/user";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const statusNames: Record<string, string> = {
  Pending: "Ожидает",
  Cancelled: "Отменено",
  Approved: "Одобрено",
  Completed: "Завершено",
};

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500",
  Cancelled: "bg-red-500",
  Approved: "bg-green-500",
  Completed: "bg-blue-500",
};

const roleNames: Record<string, string> = {
  Admin: "Администратор",
  Ronin: "Ronin",
  Osnova: "Основа",
  User: "Пользователь",
};

function isNotFoundError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? "").toLowerCase();
  const status = (error as { status?: number })?.status;

  return (
    message.includes("не найдено") ||
    message.includes("не найден") ||
    message.includes("нет бронирований") ||
    message.includes("no bookings") ||
    status === 404 ||
    message.includes("not found")
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Number.parseInt(params.id as string, 10);

  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isFinite(userId)) {
      void loadData();
    }
  }, [userId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const userPromise = userApi.get_by_id(userId);
      const bookingsPromise = bookingApi
        .get_by_user(userId)
        .catch((loadError) => {
          if (isNotFoundError(loadError)) {
            return [];
          }

          throw loadError;
        });

      const [userData, bookingsData] = await Promise.all([userPromise, bookingsPromise]);
      setUser(userData);
      setBookings(
        [...bookingsData].sort(
          (left, right) =>
            new Date(right.creationTime).getTime() - new Date(left.creationTime).getTime(),
        ),
      );
    } catch (loadError: any) {
      console.error("Ошибка загрузки пользователя:", loadError);
      setError(loadError?.message || "Не удалось загрузить пользователя");
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getInitials(name: string) {
    return name.substring(0, 1).toUpperCase();
  }

  if (loading) {
    return (
      <AdminOnly>
        <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p>Загрузка...</p>
              </div>
            </div>
          </div>
        </main>
      </AdminOnly>
    );
  }

  if (error || !user) {
    return (
      <AdminOnly>
        <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="max-w-6xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="mb-6">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>

            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive mb-1">
                    {error || "Пользователь не найден"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/users")}
                    className="mt-3"
                  >
                    Вернуться к списку
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </AdminOnly>
    );
  }

  return (
    <AdminOnly>
      <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4 overflow-hidden">
            <Button variant="ghost" onClick={() => router.back()} size="icon" className="shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="overflow-hidden">
              <h1 className="text-2xl lg:text-3xl font-bold truncate">{user.name}</h1>
              <p className="text-sm text-muted-foreground truncate">@{user.login}</p>
            </div>
          </div>

          <div className="grid xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6">
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {user.role === "Admin" && (
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur opacity-75"></div>
                    )}
                    <Avatar className="h-24 w-24 relative border-2 border-background">
                      <AvatarImage
                        src={getAvatarUrl(user.login, user.role)}
                        alt={user.login}
                      />
                      <AvatarFallback
                        className={cn(
                          "text-2xl font-bold",
                          user.role === "Admin" && "bg-primary text-primary-foreground",
                        )}
                      >
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b border-border gap-4">
                    <span className="text-sm text-muted-foreground font-medium">Ник</span>
                    <span className="text-base font-semibold text-right break-words">{user.name}</span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border gap-4">
                    <span className="text-sm text-muted-foreground font-medium">Логин</span>
                    <span className="text-base font-semibold text-right break-words">
                      {user.login}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border gap-4">
                    <span className="text-sm text-muted-foreground font-medium">Telegram</span>
                    {user.telegramUsername ? (
                      <a
                        href={`https://t.me/${user.telegramUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-mono font-semibold text-primary hover:underline text-right break-all"
                      >
                        {user.telegramUsername}
                      </a>
                    ) : (
                      <span className="text-base font-mono font-semibold text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border gap-4">
                    <span className="text-sm text-muted-foreground font-medium">Роль</span>
                    <span className="text-base font-semibold text-right">
                      {roleNames[user.role] || "Пользователь"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border gap-4">
                    <span className="text-sm text-muted-foreground font-medium">Есть Ronin</span>
                    <span
                      className={cn(
                        "text-base font-semibold text-right",
                        (user.role === "Ronin" || user.role === "Admin")
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {user.role === "Ronin" || user.role === "Admin" ? "Да" : "Нет"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 gap-4">
                    <span className="text-sm text-muted-foreground font-medium">Статус</span>
                    <span
                      className={cn(
                        "text-base font-semibold text-right",
                        user.banned && "text-red-600 dark:text-red-400",
                      )}
                    >
                      {user.banned ? "Забанен" : "Активен"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Telegram</h2>
                    <p className="text-sm text-muted-foreground">Контакт пользователя</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Username</p>
                    {user.telegramUsername ? (
                      <a
                        href={`https://t.me/${user.telegramUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono font-semibold text-primary hover:underline break-all"
                      >
                        {user.telegramUsername}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Не привязан</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Chat ID</p>
                    <p className="text-sm font-mono break-all">{user.telegramChatId ?? "—"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Статистика</h2>
                    <p className="text-sm text-muted-foreground">История бронирований</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Всего бронирований</p>
                    <p className="text-2xl font-bold">{bookings.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Последняя активность</p>
                    <p className="text-sm">
                      {bookings[0] ? formatDateTime(bookings[0].creationTime) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Прошлые бронирования</h2>
                  <p className="text-sm text-muted-foreground">
                    Вся история заявок пользователя
                  </p>
                </div>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-12 bg-secondary/20 border border-border/50 rounded-xl">
                  <div className="max-w-md mx-auto px-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Бронирований пока нет
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      У этого пользователя ещё нет истории бронирований
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                      className="w-full text-left bg-secondary/20 hover:bg-secondary/35 border border-border rounded-xl p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                statusColors[booking.status] || "bg-gray-500",
                              )}
                            ></div>
                            <span className="text-sm font-medium">
                              {statusNames[booking.status] || booking.status}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              #{booking.id}
                            </span>
                          </div>
                          <p className="font-medium break-words">{booking.reason}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Период</p>
                          <p>{formatDateTime(booking.startTime)}</p>
                          <p className="text-muted-foreground">{formatDateTime(booking.endTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Оборудование</p>
                          <div className="space-y-1">
                            {booking.equipmentModelIds.slice(0, 3).map((item) => (
                              <div key={item.id} className="text-xs bg-background rounded px-2 py-1 inline-block mr-1 mb-1">
                                {item.modelName}
                              </div>
                            ))}
                            {booking.equipmentModelIds.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{booking.equipmentModelIds.length - 3} ещё
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {(booking.comment || booking.adminComment) && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          {booking.comment && (
                            <div className="text-xs bg-blue-500/10 border border-blue-500/20 rounded px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  Комментарий пользователя
                                </span>
                              </div>
                              <p className="break-words whitespace-pre-wrap">{booking.comment}</p>
                            </div>
                          )}
                          {booking.adminComment && (
                            <div className="text-xs bg-purple-500/10 border border-purple-500/20 rounded px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                <span className="text-purple-600 dark:text-purple-400 font-medium">
                                  Комментарий администратора
                                </span>
                              </div>
                              <p className="break-words whitespace-pre-wrap">{booking.adminComment}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AdminOnly>
  );
}
