"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { BookingResponseDto } from "@/app/models/booking/booking";
import type { EqItemResponseDto } from "@/app/models/equipment/equipment";
import { BookingPagination } from "@/components/BookingPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { bookingApi } from "@/lib/bookingApi";
import { getErrorMessage } from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

const statuses: Record<string, { label: string; color: string }> = {
  Pending: { label: "Ожидает", color: "text-[var(--booking-pending-text)]" },
  Approved: { label: "Одобрено", color: "text-[var(--booking-approved-text)]" },
  Completed: {
    label: "Завершено",
    color: "text-[var(--booking-completed-text)]",
  },
  Cancelled: { label: "Отменено", color: "text-booking-cancelled" },
};
const pageSize = 8;
const columns =
  "sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,.85fr)]";

function usageFor(booking: BookingResponseDto, itemId: number) {
  const assignments = booking.equipmentModelIds.filter(
    (assignment) => assignment.equipmentItemId === itemId,
  );
  const starts = assignments.map((assignment) => assignment.startDate).sort();
  const ends = assignments.map((assignment) => assignment.endDate).sort();
  return {
    booking,
    start: starts[0] ?? booking.startTime,
    end: ends.at(-1) ?? booking.endTime,
    returned:
      assignments.length > 0 &&
      assignments.every((assignment) => assignment.isReturned),
  };
}

function period(start: string, end: string) {
  const from = new Date(start);
  const to = new Date(end);
  const sameDay = format(from, "yyyy-MM-dd") === format(to, "yyyy-MM-dd");
  const startFormat =
    from.getFullYear() === to.getFullYear() ? "d MMM" : "d MMM yyyy";
  return {
    dates: sameDay
      ? format(from, "d MMM yyyy", { locale: ru })
      : `${format(from, startFormat, { locale: ru })} — ${format(to, "d MMM yyyy", { locale: ru })}`,
    times: `${format(from, "HH:mm")} — ${format(to, "HH:mm")}`,
  };
}

export function EquipmentUsageHistory({ item }: { item: EqItemResponseDto }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retry intentionally triggers a new history request.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    setLoading(true);
    setError(null);
    bookingApi.get_by_item(item.id).then(
      (result) => {
        if (!active) return;
        setBookings(result);
        setLoading(false);
      },
      (failure: unknown) => {
        if (!active) return;
        setError(getErrorMessage(failure, "Не удалось загрузить историю"));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [item.id, isAdmin, retry]);

  const records = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru").replace(/^#/, "");
    return bookings
      .filter(
        (booking) =>
          (status === "all" || booking.status === status) &&
          (!query ||
            `${booking.id} ${booking.userName} ${booking.login} ${booking.reason}`
              .toLocaleLowerCase("ru")
              .includes(query)),
      )
      .map((booking) => usageFor(booking, item.id))
      .sort(
        (left, right) =>
          Date.parse(right.start) - Date.parse(left.start) ||
          right.booking.id - left.booking.id,
      );
  }, [bookings, item.id, search, status]);

  if (!isAdmin) return null;

  return (
    <section
      className="mt-6 border-t border-border pt-5"
      aria-label={`История экземпляра #${item.inventoryNumber}`}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">История использования</h3>
        <span className="font-mono text-sm text-muted-foreground">
          #{item.inventoryNumber}
        </span>
      </div>
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-destructive" role="alert">
            {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetry((value) => value + 1)}
          >
            Повторить
          </Button>
        </div>
      ) : loading ? (
        <output className="block space-y-3 py-3" aria-label="Загрузка истории">
          {[1, 2, 3].map((index) => (
            <span
              key={index}
              className="block h-10 animate-pulse rounded-md bg-muted/50"
            />
          ))}
        </output>
      ) : bookings.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          Этот экземпляр ещё не использовался.
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                aria-label="Поиск в истории"
                placeholder="Пользователь, цель или # брони"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="Статус бронирования"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(statuses).map(([value, entry]) => (
                  <SelectItem key={value} value={value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            className={cn(
              "hidden gap-4 border-b border-border px-2 py-2 text-xs text-muted-foreground sm:grid",
              columns,
            )}
            aria-hidden="true"
          >
            <span>Бронирование</span>
            <span>Пользователь</span>
            <span>Период</span>
            <span>Статус</span>
          </div>
          <div>
            {records
              .slice((page - 1) * pageSize, page * pageSize)
              .map(({ booking, start, end, returned }) => {
                const dates = period(start, end);
                const entry = statuses[booking.status];
                return (
                  <Link
                    key={booking.id}
                    href={`/dashboard/bookings/${booking.id}`}
                    prefetch={false}
                    aria-label={`Открыть бронирование #${booking.id}, ${booking.userName}`}
                    className={cn(
                      "grid grid-cols-2 gap-x-4 gap-y-2 border-b border-border/70 px-2 py-3 text-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]",
                      columns,
                    )}
                  >
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <span className="font-medium">#{booking.id}</span>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                        {booking.reason}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {booking.userName}
                      </p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {booking.login}
                      </p>
                    </div>
                    <div className="order-last col-span-2 min-w-0 sm:order-none sm:col-span-1">
                      <p>{dates.dates}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dates.times}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          entry?.color,
                        )}
                      >
                        <span className="size-1.5 shrink-0 rounded-full bg-current" />
                        {entry?.label ?? booking.status}
                      </span>
                      {booking.status !== "Cancelled" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {returned ? "Возвращён" : "Не возвращён"}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
          </div>
          {records.length === 0 ? (
            <p className="py-5 text-sm text-muted-foreground">
              Нет записей по выбранным фильтрам.
            </p>
          ) : (
            <div className="mt-3">
              <BookingPagination
                page={page}
                pageSize={pageSize}
                totalCount={records.length}
                loading={loading}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
