"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  AlertCircle,
  Filter,
  X,
  Calendar,
  Clock,
  Search,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { BookingStatus } from "@/app/models/booking/booking";
import { EventResponseDto } from "@/app/models/event/event";
import { eventApi } from "@/lib/eventApi";

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

const statusFilterMap: Record<string, BookingStatus> = {
  Pending: BookingStatus.Pending,
  Cancelled: BookingStatus.Cancelled,
  Approved: BookingStatus.Approved,
  Completed: BookingStatus.Completed,
};

function isNotFoundError(error: any): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    message.includes("не найдено") ||
    message.includes("не найден") ||
    message.includes("нет событий") ||
    message.includes("no events") ||
    error?.status === 404 ||
    message.includes("not found")
  );
}

export default function EventsDashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventResponseDto[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    setSelectedStatus("Pending");
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, events]);

  async function loadEvents() {
    try {
      setLoading(true);
      setError(null);

      const data =
        selectedStatus === "all"
          ? await eventApi.get_all()
          : await eventApi.get_by_status(statusFilterMap[selectedStatus]);

      setEvents(data);
      setFilteredEvents(data);
    } catch (loadError: any) {
      console.error("Ошибка загрузки event заявок:", loadError);
      setEvents([]);
      setFilteredEvents([]);
      setError(
        isNotFoundError(loadError)
          ? null
          : loadError?.message || "Не удалось загрузить event заявки"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      setFilteredEvents(events);
      return;
    }

    const query = searchQuery.trim();

    if (/^\d+$/.test(query)) {
      const filtered = events.filter((event) => event.id === Number.parseInt(query, 10));
      setFilteredEvents(filtered);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = events.filter(
      (event) =>
        event.client.toLowerCase().includes(lowerQuery) ||
        event.reason.toLowerCase().includes(lowerQuery) ||
        (event.comment?.toLowerCase().includes(lowerQuery) ?? false) ||
        (event.adminComment?.toLowerCase().includes(lowerQuery) ?? false)
    );

    setFilteredEvents(filtered);
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

  function clearFilters() {
    setError(null);
    setSearchQuery("");
    setSelectedStatus("all");
  }

  const hasActiveFilters = selectedStatus !== "all" || Boolean(searchQuery);

  return (
    <AdminOnly>
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Заявки на event</h1>
              <p className="text-sm text-muted-foreground">
                Просмотр заявок, созданных через форму event
              </p>
            </div>
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
                <SelectTrigger className="w-full md:w-[220px]">
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
                    {/^\d+$/.test(searchQuery.trim()) ? 'ID: ' : 'Поиск: '}"{searchQuery}"
                  </span>
                )}
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  {statusNames[selectedStatus]}
                </span>
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
                  <p className="text-sm font-medium text-destructive mb-1">Произошла ошибка</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadEvents()}
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
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-card/30 border border-border/50 rounded-xl">
              <div className="max-w-md mx-auto px-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarRange className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {hasActiveFilters ? "Ничего не найдено" : "Заявки отсутствуют"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? "Попробуйте изменить фильтр по статусу"
                    : "В данный момент нет заявок на event"}
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
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => router.push(`/dashboard/events/${event.id}`)}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            statusColors[event.status] || "bg-gray-500"
                          )}
                        ></div>
                        <span className="text-sm font-medium">
                          {statusNames[event.status] ?? event.status}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        #{event.id}
                      </span>
                    </div>

                    {Object.keys(event.warnings).length > 0 && (
                      <div className="mb-3 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                            Предупреждения
                          </p>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(event.warnings).map(([key, value]) => (
                            <p
                              key={key}
                              className="text-xs text-orange-600 dark:text-orange-400"
                            >
                              {key}: {String(value)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="bg-secondary/30 rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-1">Клиент</p>
                        <p className="text-sm font-medium">{event.client}</p>
                      </div>

                      <div className="bg-secondary/30 rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-1">Причина</p>
                        <p className="text-sm line-clamp-3">{event.reason}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate">{formatDateTime(event.startTime)}</p>
                          <p className="text-muted-foreground truncate">
                            {formatDateTime(event.endTime)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                        <p className="text-muted-foreground">
                          Создано {formatDateTime(event.creationTime)}
                        </p>
                      </div>

                      {(event.comment || event.adminComment) && (
                        <div className="pt-2 border-t border-border space-y-1">
                          {event.comment && (
                            <div className="text-xs bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">
                              <p className="text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                                Комментарий:
                              </p>
                              <p className="line-clamp-2">{event.comment}</p>
                            </div>
                          )}
                          {event.adminComment && (
                            <div className="text-xs bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1">
                              <p className="text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                                Админ:
                              </p>
                              <p className="line-clamp-2">{event.adminComment}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead className="w-[100px]">Статус</TableHead>
                      <TableHead>Клиент</TableHead>
                      <TableHead className="max-w-[240px]">Причина</TableHead>
                      <TableHead>Период</TableHead>
                      <TableHead>Создано</TableHead>
                      <TableHead className="max-w-[220px]">Комментарии</TableHead>
                      <TableHead className="w-[220px]">Предупреждения</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow
                        key={event.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/events/${event.id}`)}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          #{event.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                statusColors[event.status] || "bg-gray-500"
                              )}
                            ></div>
                            <span className="text-sm">
                              {statusNames[event.status] ?? event.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{event.client}</p>
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-2 max-w-[240px]" title={event.reason}>
                            {event.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm whitespace-nowrap">
                            <p>{formatDateTime(event.startTime)}</p>
                            <p className="text-muted-foreground">
                              {formatDateTime(event.endTime)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(event.creationTime)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 max-w-[220px]">
                            {event.comment && (
                              <div className="text-xs bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">
                                <p className="text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                                  Комментарий:
                                </p>
                                <p className="line-clamp-2">{event.comment}</p>
                              </div>
                            )}
                            {event.adminComment && (
                              <div className="text-xs bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1">
                                <p className="text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                                  Админ:
                                </p>
                                <p className="line-clamp-2">{event.adminComment}</p>
                              </div>
                            )}
                            {!event.comment && !event.adminComment && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {Object.keys(event.warnings).length > 0 ? (
                            <div className="space-y-1 w-full">
                              {Object.entries(event.warnings).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="text-xs bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1"
                                >
                                  <p className="text-orange-600 dark:text-orange-400 font-medium break-words whitespace-normal">
                                    {key}: {String(value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
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
