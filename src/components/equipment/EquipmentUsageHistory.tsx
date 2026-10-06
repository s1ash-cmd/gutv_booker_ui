"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, SlidersHorizontal } from "lucide-react";
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
  "@min-[680px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,.85fr)]";

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
      className="@container mt-6 border-t border-border pt-5"
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
          <div className="mb-3 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                aria-label="Поиск в истории"
                placeholder="Поиск в истории"
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
                className={cn(
                  "w-10 shrink-0 justify-center px-2 @min-[680px]:w-40 @min-[680px]:justify-between @min-[680px]:px-3 [&>svg]:hidden @min-[680px]:[&>svg]:block [&_[data-slot=select-value]]:hidden @min-[680px]:[&_[data-slot=select-value]]:flex",
                  status !== "all" && "border-primary text-primary",
                )}
                aria-label="Статус бронирования"
                title={
                  status === "all" ? "Все статусы" : statuses[status]?.label
                }
              >
                <span className="@min-[680px]:hidden" aria-hidden="true">
                  <SlidersHorizontal className="size-4" />
                </span>
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
              "hidden gap-4 border-b border-border px-2 py-2 text-xs text-muted-foreground @min-[680px]:grid",
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
                      "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-border/70 px-1 py-3 text-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px] @min-[680px]:gap-x-4 @min-[680px]:gap-y-2 @min-[680px]:px-2",
                      columns,
                    )}
                  >
                    <div className="contents @min-[680px]:block @min-[680px]:min-w-0">
                      <span className="col-start-1 row-start-1 font-medium">
                        #{booking.id}
                      </span>
                      <p className="col-span-2 row-start-2 break-words text-xs leading-relaxed text-muted-foreground @min-[680px]:mt-1">
                        {booking.reason}
                      </p>
                    </div>
                    <div className="col-span-2 row-start-3 flex min-w-0 flex-wrap items-baseline gap-x-2 @min-[680px]:col-span-1 @min-[680px]:row-auto @min-[680px]:block">
                      <p className="break-words font-medium">
                        {booking.userName}
                      </p>
                      <p className="break-all text-xs text-muted-foreground @min-[680px]:mt-1">
                        {booking.login}
                      </p>
                    </div>
                    <div className="col-span-2 row-start-4 flex min-w-0 flex-wrap gap-x-2 text-xs text-muted-foreground @min-[680px]:col-span-1 @min-[680px]:row-auto @min-[680px]:block @min-[680px]:text-sm @min-[680px]:text-foreground">
                      <p>{dates.dates}</p>
                      <p className="text-xs text-muted-foreground @min-[680px]:mt-1">
                        {dates.times}
                      </p>
                      {returned && booking.status !== "Cancelled" && (
                        <p className="text-xs text-muted-foreground @min-[680px]:hidden">
                          Возвращён
                        </p>
                      )}
                    </div>
                    <div className="col-start-2 row-start-1 min-w-0 text-right @min-[680px]:col-auto @min-[680px]:row-auto @min-[680px]:text-left">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          entry?.color,
                        )}
                      >
                        <span className="size-1.5 shrink-0 rounded-full bg-current" />
                        {entry?.label ?? booking.status}
                      </span>
                      {returned && booking.status !== "Cancelled" && (
                        <p className="mt-1 hidden text-xs text-muted-foreground @min-[680px]:block">
                          Возвращён
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
          ) : records.length <= pageSize ? (
            <p
              className="mt-3 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {records.length}{" "}
              {records.length === 1
                ? "запись"
                : records.length < 5
                  ? "записи"
                  : "записей"}
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
