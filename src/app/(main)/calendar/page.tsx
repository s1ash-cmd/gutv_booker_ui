"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  Search,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { BookingCalendarItemDto } from "@/app/models/booking/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { bookingApi } from "@/lib/bookingApi";
import { cn } from "@/lib/utils";

function getBookingDates(booking: BookingCalendarItemDto) {
  return {
    start: new Date(booking.startTime),
    end: new Date(booking.endTime),
  };
}

function overlapsDay(booking: BookingCalendarItemDto, day: Date) {
  const { start, end } = getBookingDates(booking);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return start <= dayEnd && end >= dayStart;
}

function formatBookingPeriod(booking: BookingCalendarItemDto) {
  const { start, end } = getBookingDates(booking);
  return `${format(start, "d MMM HH:mm", { locale: ru })} - ${format(end, "d MMM HH:mm", { locale: ru })}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const { isAuth, isLoading } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [bookings, setBookings] = useState<BookingCalendarItemDto[]>([]);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarStartIso = calendarStart.toISOString();
  const calendarEndIso = calendarEnd.toISOString();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuth) {
      router.push("/login");
      return;
    }

    async function loadBookings() {
      try {
        setLoading(true);
        setError(null);
        const data = await bookingApi.get_calendar(
          calendarStartIso,
          calendarEndIso,
        );
        setBookings(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Не удалось загрузить календарь",
        );
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }

    void loadBookings();
  }, [isAuth, isLoading, router, calendarStartIso, calendarEndIso]);

  const filteredBookings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return bookings;
    }

    return bookings.filter((booking) => {
      const equipment = booking.equipment
        .map((item) => `${item.modelName} ${item.inventoryNumber}`)
        .join(" ");

      return [
        booking.userName,
        booking.login,
        booking.telegramUsername,
        booking.reason,
        equipment,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [bookings, query]);

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd],
  );

  const selectedBookings = filteredBookings.filter((booking) =>
    overlapsDay(booking, selectedDay),
  );

  if (isLoading || (!isAuth && !isLoading)) {
    return (
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="mx-auto max-w-6xl py-12 text-center text-muted-foreground">
          Загрузка...
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              Календарь бронирований
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Видны активные заявки, чтобы быстро понять занятость и связаться с
              человеком.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((value) => subMonths(value, 1))}
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-40 text-center text-sm font-semibold capitalize">
              {format(month, "LLLL yyyy", { locale: ru })}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((value) => addMonths(value, 1))}
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по человеку, технике или причине"
            className="pl-9"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium text-muted-foreground">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayBookings = filteredBookings.filter((booking) =>
                  overlapsDay(booking, day),
                );
                const isSelected = isSameDay(day, selectedDay);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "min-h-28 border-b border-r border-border p-2 text-left transition-colors hover:bg-secondary/50",
                      !isSameMonth(day, month) &&
                        "bg-muted/20 text-muted-foreground",
                      isSelected &&
                        "bg-primary/10 ring-1 ring-inset ring-primary",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {format(day, "d")}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <div
                          key={booking.id}
                          className="truncate rounded-md bg-secondary px-2 py-1 text-[11px] font-medium"
                        >
                          {booking.userName}:{" "}
                          {booking.equipment[0]?.modelName ?? booking.reason}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-[11px] text-muted-foreground">
                          + еще {dayBookings.length - 3}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">
                  {format(selectedDay, "d MMMM yyyy", { locale: ru })}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedBookings.length || "Нет"} активных бронирований
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Загружаем...
              </div>
            ) : selectedBookings.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                На этот день ничего не забронировано.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedBookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <User className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate">{booking.userName}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {booking.telegramUsername
                            ? `@${booking.telegramUsername}`
                            : `@${booking.login}`}
                        </div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                        {booking.status === "Pending" ? "Ожидает" : "Одобрено"}
                      </span>
                    </div>

                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatBookingPeriod(booking)}
                    </div>

                    <div className="mb-2 text-sm">{booking.reason}</div>

                    <div className="space-y-1">
                      {booking.equipment.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-md bg-secondary/60 px-2 py-1 text-xs"
                        >
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{item.modelName}</span>
                          <span className="ml-auto font-mono text-muted-foreground">
                            {item.inventoryNumber}
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
