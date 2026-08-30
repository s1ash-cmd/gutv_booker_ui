"use client";

import {
  AlertCircle,
  Calendar,
  Clock,
  Filter,
  Package,
  Search,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BookingResponseDto } from "@/app/models/booking/booking";
import { AdminOnly } from "@/components/AdminOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bookingApi } from "@/lib/bookingApi";
import { formatWarningMessages } from "@/lib/userFacingMessages";
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

const statusFilterMap: Record<string, number> = {
  Pending: 0,
  Cancelled: 1,
  Approved: 2,
  Completed: 3,
};

function isNotFoundError(error: unknown): boolean {
  const typedError = error as { message?: string; status?: number };
  const message = String(typedError?.message ?? "").toLowerCase();
  return (
    message.includes("не найдено") ||
    message.includes("не найден") ||
    message.includes("нет бронирований") ||
    message.includes("no bookings") ||
    typedError?.status === 404 ||
    message.includes("not found")
  );
}

function sortBookingsByCreationTime(
  bookings: BookingResponseDto[],
  sortOrder: "createdDesc" | "createdAsc",
) {
  return [...bookings].sort((left, right) => {
    const result =
      new Date(right.creationTime).getTime() -
      new Date(left.creationTime).getTime();

    return sortOrder === "createdDesc" ? result : -result;
  });
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("Pending");
  const [sortOrder, setSortOrder] = useState<"createdDesc" | "createdAsc">(
    "createdDesc",
  );
  const latestRequestId = useRef(0);
  const router = useRouter();

  const loadBookings = useCallback(async () => {
    const requestId = ++latestRequestId.current;

    try {
      setLoading(true);
      setError(null);
      let data: BookingResponseDto[] = [];

      try {
        if (selectedStatus !== "all") {
          const statusEnum = statusFilterMap[selectedStatus];
          data = await bookingApi.get_by_status(statusEnum);
        } else {
          data = await bookingApi.get_all();
        }
      } catch (apiError: unknown) {
        if (isNotFoundError(apiError)) {
          data = [];
        } else {
          throw apiError;
        }
      }

      if (requestId === latestRequestId.current) {
        setBookings(data);
      }
    } catch (err: unknown) {
      if (requestId !== latestRequestId.current) {
        return;
      }

      console.error("Ошибка загрузки бронирований:", err);
      const message = (err as { message?: string })?.message;
      setError(
        isNotFoundError(err)
          ? null
          : message || "Не удалось загрузить бронирования. Попробуйте позже.",
      );
      setBookings([]);
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, [selectedStatus]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  function clearFilters() {
    setSearchQuery("");
    setSelectedStatus("all");
    setSortOrder("createdDesc");
    setError(null);
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const visibleBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? bookings.filter(
          (booking) =>
            String(booking.id) === query ||
            booking.userName.toLowerCase().includes(query) ||
            booking.login.toLowerCase().includes(query) ||
            booking.reason.toLowerCase().includes(query) ||
            booking.equipmentModelIds.some((equipment) =>
              equipment.modelName.toLowerCase().includes(query),
            ),
        )
      : bookings;

    return sortBookingsByCreationTime(filtered, sortOrder);
  }, [bookings, searchQuery, sortOrder]);
  const hasActiveFilters =
    searchQuery || selectedStatus !== "all" || sortOrder !== "createdDesc";

  return (
    <AdminOnly>
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Все бронирования</h1>
          </div>

          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {Object.entries(statusNames).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sortOrder}
                onValueChange={(value) =>
                  setSortOrder(value as "createdDesc" | "createdAsc")
                }
              >
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdDesc">Сначала новые</SelectItem>
                  <SelectItem value="createdAsc">Сначала старые</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  className="shrink-0"
                  title="Сбросить все фильтры"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                    {/^\d+$/.test(searchQuery.trim()) ? "ID: " : "Поиск: "}"
                    {searchQuery}"
                  </span>
                )}
                {selectedStatus !== "all" && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                    {statusNames[selectedStatus]}
                  </span>
                )}
                {sortOrder !== "createdDesc" && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                    Сначала старые
                  </span>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-3 h-3 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Произошла ошибка
                  </p>
                  <p className="text-sm text-destructive/80">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      loadBookings();
                    }}
                    className="mt-3"
                  >
                    Попробовать снова
                  </Button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p>Загрузка...</p>
              </div>
            </div>
          ) : visibleBookings.length === 0 ? (
            <div className="text-center py-12 bg-card/30 border border-border/50 rounded-xl">
              <div className="max-w-md mx-auto px-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {hasActiveFilters
                    ? "Ничего не найдено"
                    : "Бронирования отсутствуют"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? "Попробуйте изменить параметры поиска или фильтры"
                    : "В данный момент нет бронирований"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Сбросить фильтры
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-4">
                {visibleBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/dashboard/bookings/${booking.id}`}
                    className="bg-card border border-border rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            statusColors[booking.status] || "bg-gray-500",
                          )}
                        ></div>
                        <span className="text-sm font-medium">
                          {statusNames[booking.status] || booking.status}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        #{booking.id}
                      </span>
                    </div>

                    {formatWarningMessages(booking.warnings).length > 0 && (
                      <div className="mb-3 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                            Предупреждения
                          </p>
                        </div>
                        <div className="space-y-1">
                          {formatWarningMessages(booking.warnings).map(
                            (message) => (
                              <p
                                key={message}
                                className="text-xs text-orange-600 dark:text-orange-400"
                              >
                                {message}
                              </p>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {booking.userName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{booking.login}
                          </p>
                        </div>
                      </div>

                      <div className="bg-secondary/30 rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Причина
                        </p>
                        <p className="text-sm line-clamp-2">{booking.reason}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate">
                            {formatDateTime(booking.startTime)}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {formatDateTime(booking.endTime)}
                          </p>
                        </div>
                      </div>

                      {booking.equipmentModelIds.length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Оборудование ({booking.equipmentModelIds.length})
                            </span>
                          </div>
                          <div className="space-y-1">
                            {booking.equipmentModelIds
                              .slice(0, 2)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="text-xs bg-secondary/20 rounded px-2 py-1"
                                >
                                  {item.modelName}
                                </div>
                              ))}
                            {booking.equipmentModelIds.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{booking.equipmentModelIds.length - 2} ещё
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {(booking.comment || booking.adminComment) && (
                        <div className="pt-2 border-t border-border space-y-1">
                          {booking.comment && (
                            <div className="text-xs bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">
                              <p className="text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                                Пользователь:
                              </p>
                              <p className="line-clamp-2">{booking.comment}</p>
                            </div>
                          )}
                          {booking.adminComment && (
                            <div className="text-xs bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1">
                              <p className="text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                                Админ:
                              </p>
                              <p className="line-clamp-2">
                                {booking.adminComment}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead className="w-[100px]">Статус</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead className="max-w-[200px]">Причина</TableHead>
                      <TableHead>Период</TableHead>
                      <TableHead>Оборудование</TableHead>
                      <TableHead className="max-w-[200px]">
                        Комментарии
                      </TableHead>
                      <TableHead className="w-[200px]">
                        Предупреждения
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleBookings.map((booking) => (
                      <TableRow
                        key={booking.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          router.push(`/dashboard/bookings/${booking.id}`)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/dashboard/bookings/${booking.id}`);
                          }
                        }}
                        tabIndex={0}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          #{booking.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                statusColors[booking.status] || "bg-gray-500",
                              )}
                            ></div>
                            <span className="text-sm">
                              {statusNames[booking.status] || booking.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              @{booking.login}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p
                            className="line-clamp-2 max-w-[200px]"
                            title={booking.reason}
                          >
                            {booking.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm whitespace-nowrap">
                            <p>{formatDateTime(booking.startTime)}</p>
                            <p className="text-muted-foreground">
                              {formatDateTime(booking.endTime)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {booking.equipmentModelIds
                              .slice(0, 2)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="text-xs bg-secondary/30 rounded px-2 py-1"
                                >
                                  {item.modelName}
                                </div>
                              ))}
                            {booking.equipmentModelIds.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{booking.equipmentModelIds.length - 2} ещё
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 max-w-[200px]">
                            {booking.comment && (
                              <div className="text-xs bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">
                                <p className="text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                                  Пользователь:
                                </p>
                                <p className="line-clamp-2">
                                  {booking.comment}
                                </p>
                              </div>
                            )}
                            {booking.adminComment && (
                              <div className="text-xs bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1">
                                <p className="text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                                  Админ:
                                </p>
                                <p className="line-clamp-2">
                                  {booking.adminComment}
                                </p>
                              </div>
                            )}
                            {!booking.comment && !booking.adminComment && (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatWarningMessages(booking.warnings).length >
                          0 ? (
                            <div className="space-y-1 w-full">
                              {formatWarningMessages(booking.warnings).map(
                                (message) => (
                                  <div
                                    key={message}
                                    className="text-xs bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1"
                                  >
                                    <p className="text-orange-600 dark:text-orange-400 font-medium break-words whitespace-normal">
                                      {message}
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </main>
    </AdminOnly>
  );
}
