"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BookingResponseDto } from "@/app/models/booking/booking";
import { BookingPagination } from "@/components/BookingPagination";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBookingsPage } from "@/hooks/use-bookings-page";
import { getAvatarUrl } from "@/lib/avatar";
import { type BookingPage, bookingApi } from "@/lib/bookingApi";
import {
  bookingForms,
  bookingStatusColors,
  bookingStatusNames,
  formatBookingPeriod,
  pluralize,
  splitAdminComment,
  unitForms,
} from "@/lib/bookingPresentation";
import {
  formatWarningMessages,
  getErrorMessage,
} from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

const statusTabs = [
  { id: "all", label: "Все" },
  { id: "Pending", label: "Ожидают" },
  { id: "Approved", label: "Одобрены" },
  { id: "Completed", label: "Завершены" },
  { id: "Cancelled", label: "Отменены" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-sm text-muted-foreground">{children}</h2>
  );
}

function WarningLine({ booking }: { booking: BookingResponseDto }) {
  const warnings = formatWarningMessages(booking.warnings);
  if (warnings.length === 0) return null;
  return (
    <p
      className="mt-0.5 flex items-start gap-1.5 text-xs text-orange-600 dark:text-orange-400"
      title={warnings.join("\n")}
    >
      <AlertTriangle aria-hidden="true" className="mt-px size-3 shrink-0" />
      <span className="line-clamp-2">
        {warnings[0]}
        {warnings.length > 1 && ` (+${warnings.length - 1})`}
      </span>
    </p>
  );
}

function CommentBubbles({
  booking,
  authorLabel,
  className,
}: {
  booking: BookingResponseDto;
  authorLabel: string;
  className?: string;
}) {
  const adminComment = booking.adminComment
    ? splitAdminComment(booking.adminComment)
    : null;
  const comments = [
    { author: authorLabel, text: booking.comment?.trim(), admin: false },
    {
      author: adminComment?.author ?? "Админ",
      text: adminComment?.text,
      admin: true,
    },
  ].filter((item) => item.text);
  if (comments.length === 0) return null;
  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-1", className)}>
      {comments.map((item) => (
        <div
          key={item.author + String(item.admin)}
          title={item.text}
          className={cn(
            "max-w-full rounded-lg px-2.5 py-1.5 text-xs text-foreground/85",
            item.admin ? "bg-primary/20" : "bg-secondary",
          )}
        >
          <span className="block text-[11px] text-muted-foreground">
            {item.author}
          </span>
          <span className="line-clamp-2 break-words">{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function BookingUserAvatar({ booking }: { booking: BookingResponseDto }) {
  return (
    <Avatar userRole={booking.userRole} className="size-8">
      <AvatarImage
        src={getAvatarUrl(
          booking.login,
          booking.userRole,
          booking.userAvatarSeed,
          booking.userAvatarUrl,
        )}
        alt=""
      />
      <AvatarFallback className="text-xs">
        {booking.userName.substring(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function BookingRow({
  booking,
  showUser,
}: {
  booking: BookingResponseDto;
  showUser: boolean;
}) {
  const details = [
    showUser && booking.userName,
    formatBookingPeriod(booking.startTime, booking.endTime),
    bookingStatusNames[booking.status] ?? booking.status,
  ].filter(Boolean);
  return (
    <li
      className={cn(
        "relative flex min-h-14 items-start gap-3 px-4 py-2.5 transition-colors focus-within:bg-secondary/50 hover:bg-secondary/50 md:items-center",
        booking.status === "Cancelled" && "opacity-70",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-[7px] size-1.5 shrink-0 rounded-full md:mt-0",
          bookingStatusColors[booking.status] ?? "bg-muted-foreground",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/bookings/${booking.id}`}
            className="block truncate text-sm outline-none after:absolute after:inset-0 after:content-['']"
          >
            {booking.reason}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {details.join(" · ")}
          </p>
          <WarningLine booking={booking} />
        </div>
        <CommentBubbles
          booking={booking}
          authorLabel={showUser ? firstName(booking.userName) : "Вы"}
          className="md:w-64 md:shrink-0"
        />
      </div>
      <span className="hidden shrink-0 pt-0.5 font-mono text-xs text-muted-foreground sm:inline md:pt-0">
        #{booking.id}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground md:mt-0"
      />
    </li>
  );
}

function PendingRow({
  booking,
  busy,
  disabled,
  onApprove,
  onReject,
}: {
  booking: BookingResponseDto;
  busy: boolean;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <li className="relative flex flex-col gap-3 px-4 py-3 transition-colors focus-within:bg-secondary/50 hover:bg-secondary/50 md:flex-row md:items-center md:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3 md:items-center">
        <BookingUserAvatar booking={booking} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/bookings/${booking.id}`}
            className="block truncate text-sm outline-none after:absolute after:inset-0 after:content-['']"
          >
            {booking.reason}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {[
              booking.userName,
              formatBookingPeriod(booking.startTime, booking.endTime),
              pluralize(booking.equipmentModelIds.length, unitForms),
            ].join(" · ")}
          </p>
          <WarningLine booking={booking} />
        </div>
      </div>
      <CommentBubbles
        booking={booking}
        authorLabel={firstName(booking.userName)}
        className="pl-11 md:w-56 md:shrink-0 md:pl-0"
      />
      <div className="relative z-10 flex shrink-0 justify-end gap-2 pl-11 md:pl-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={disabled}
          onClick={onReject}
        >
          Отклонить
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onApprove}
        >
          {busy ? "Одобряю…" : "Одобрить"}
        </Button>
      </div>
    </li>
  );
}

function PendingSection({
  data,
  onChanged,
  onShowAll,
}: {
  data: BookingPage;
  onChanged: () => void;
  onShowAll: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<BookingResponseDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  async function approve(booking: BookingResponseDto) {
    setBusyId(booking.id);
    setError(null);
    try {
      await bookingApi.approve(booking.id, "", booking.revision);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось одобрить бронирование"));
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    setRejectError(null);
    try {
      await bookingApi.reject(rejecting.id, rejectReason, rejecting.revision);
      setRejecting(null);
      onChanged();
    } catch (err) {
      setRejectError(getErrorMessage(err, "Не удалось отклонить бронирование"));
    } finally {
      setBusyId(null);
    }
  }

  const hidden = data.totalCount - data.items.length;

  return (
    <section>
      <SectionTitle>Ожидают решения · {data.totalCount}</SectionTitle>
      {error && <ErrorMessage message={error} className="mb-3" />}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {data.items.map((booking) => (
            <PendingRow
              key={booking.id}
              booking={booking}
              busy={busyId === booking.id}
              disabled={busyId !== null}
              onApprove={() => void approve(booking)}
              onReject={() => {
                setRejectReason("");
                setRejectError(null);
                setRejecting(booking);
              }}
            />
          ))}
        </ul>
        {hidden > 0 && (
          <button
            type="button"
            onClick={onShowAll}
            className="w-full border-t border-border px-4 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
          >
            Ещё {hidden} — показать все
          </button>
        )}
      </div>

      <Dialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open && busyId === null) setRejecting(null);
        }}
      >
        <DialogContent showCloseButton={busyId === null}>
          <DialogHeader>
            <DialogTitle>Отклонить бронирование</DialogTitle>
            <DialogDescription>
              {rejecting?.userName} увидит причину в уведомлении.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Причина отклонения"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={4}
            className="resize-none"
            disabled={busyId !== null}
          />
          {rejectError && <ErrorMessage message={rejectError} />}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejecting(null)}
              disabled={busyId !== null}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => void reject()}
              disabled={busyId !== null || !rejectReason.trim()}
            >
              {busyId !== null ? "Отклоняю…" : "Отклонить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function usePendingBookings(enabled: boolean) {
  const [data, setData] = useState<BookingPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setError(null);
      setData(
        await bookingApi.get_page("all", {
          page: 1,
          search: "",
          status: "Pending",
          oldestFirst: true,
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось загрузить заявки"));
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, reload: load };
}

export function BookingsList({ scope }: { scope: "all" | "my" }) {
  const {
    items,
    totalCount,
    page,
    pageSize,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedStatus,
    setSelectedStatus,
    sortOrder,
    setSortOrder,
    setPage,
    clearFilters,
    loadBookings,
  } = useBookingsPage(scope);
  const isAdminView = scope === "all";
  const pending = usePendingBookings(isAdminView);

  // The pending queue is shown separately above the unfiltered admin list.
  const splitPending =
    isAdminView && selectedStatus === "all" && !searchQuery.trim();
  const showPendingSection =
    splitPending && page === 1 && Boolean(pending.data?.totalCount);
  const visibleBookings = splitPending
    ? items.filter((booking) => booking.status !== "Pending")
    : items;

  function changePage(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function refreshAll() {
    void pending.reload();
    void loadBookings();
  }

  const hasActiveFilters = Boolean(searchQuery) || selectedStatus !== "all";
  const SortIcon = sortOrder === "createdDesc" ? ArrowDown : ArrowUp;

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <h1 className="text-xl font-bold sm:text-2xl">
            {isAdminView ? "Все бронирования" : "Мои бронирования"}
          </h1>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {pluralize(totalCount, bookingForms)}
              {isAdminView &&
                Boolean(pending.data?.totalCount) &&
                ` · ${pending.data?.totalCount} ждут решения`}
            </p>
          )}
        </div>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Поиск по причине, имени, технике или #ID"
              aria-label="Поиск бронирований"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="bg-card pl-9"
            />
          </div>
          <div
            role="tablist"
            aria-label="Фильтр по статусу"
            className="flex shrink-0 gap-0.5 overflow-x-auto rounded-lg border border-border bg-card p-[3px]"
          >
            {statusTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selectedStatus === item.id}
                onClick={() => setSelectedStatus(item.id)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  selectedStatus === item.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {pending.error && isAdminView && (
            <ErrorMessage
              message={pending.error}
              onRetry={() => void pending.reload()}
            />
          )}
          {showPendingSection && pending.data && (
            <PendingSection
              data={pending.data}
              onChanged={refreshAll}
              onShowAll={() => setSelectedStatus("Pending")}
            />
          )}

          <section aria-busy={loading}>
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="text-sm text-muted-foreground">
                {showPendingSection ? "Остальные" : "Бронирования"}
              </h2>
              <button
                type="button"
                onClick={() =>
                  setSortOrder(
                    sortOrder === "createdDesc" ? "createdAsc" : "createdDesc",
                  )
                }
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                {sortOrder === "createdDesc"
                  ? "Сначала новые"
                  : "Сначала старые"}
                <SortIcon aria-hidden="true" className="size-3.5" />
              </button>
            </div>

            {error && (
              <ErrorMessage
                message={error}
                onRetry={() => void loadBookings()}
                className="mb-3"
              />
            )}

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {loading ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Загрузка бронирований…
                </p>
              ) : visibleBookings.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {hasActiveFilters ? (
                    <>
                      Ничего не нашлось.{" "}
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        Сбросить фильтры
                      </button>
                    </>
                  ) : showPendingSection ? (
                    "Других бронирований нет"
                  ) : (
                    "Бронирований пока нет"
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {visibleBookings.map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      showUser={isAdminView}
                    />
                  ))}
                </ul>
              )}
              {totalCount > pageSize && (
                <div className="border-t border-border px-4 py-2">
                  <BookingPagination
                    page={page}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    loading={loading}
                    onPageChange={changePage}
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
