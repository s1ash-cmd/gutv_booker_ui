"use client";

import { KeyRound, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { BookingResponseDto } from "@/app/models/booking/booking";
import type { UserResponseDto } from "@/app/models/user/user";
import { AdminOnly } from "@/components/AdminOnly";
import { BookingPagination } from "@/components/BookingPagination";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import {
  ProfileLinkRow,
  ProfileNote,
  ProfileRow,
  ProfileSection,
} from "@/components/profile/ProfileSection";
import { TelegramPanel } from "@/components/profile/TelegramPanel";
import { Button } from "@/components/ui/button";
import { type BookingPage, bookingApi } from "@/lib/bookingApi";
import { getRoleLabel, hasRoninAccess } from "@/lib/roles";
import { userApi } from "@/lib/userApi";
import { getErrorMessage } from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

const statusNames: Record<string, string> = {
  Pending: "Ожидает",
  Approved: "Одобрено",
  Completed: "Завершено",
  Cancelled: "Отменено",
};

const statusColors: Record<string, string> = {
  Pending: "bg-booking-pending",
  Approved: "bg-booking-approved",
  Completed: "bg-booking-completed",
  Cancelled: "bg-booking-cancelled",
};

function formatPeriod(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const currentYear = new Date().getFullYear();
  const day = (date: Date) =>
    date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      ...(date.getFullYear() !== currentYear && { year: "numeric" }),
    });
  const time = (date: Date) =>
    date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return start.toDateString() === end.toDateString()
    ? `${day(start)}, ${time(start)} – ${time(end)}`
    : `${day(start)}, ${time(start)} – ${day(end)}, ${time(end)}`;
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <AdminOnly>
      <UserDetail key={params.id} id={params.id} />
    </AdminOnly>
  );
}

function UserDetail({ id }: { id: string }) {
  const userId = /^\d+$/.test(id) ? Number(id) : 0;
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retry repeats the same request after an error.
  useEffect(() => {
    let active = true;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      setError("Некорректный идентификатор пользователя");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void userApi
      .get_by_id(userId)
      .then((data) => {
        if (active) setUser(data);
      })
      .catch((err) => {
        if (active)
          setError(getErrorMessage(err, "Не удалось загрузить пользователя"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Загрузка профиля…
        </div>
      ) : error || !user ? (
        <div className="space-y-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/users">← Пользователи</Link>
          </Button>
          <ErrorMessage
            message={error ?? "Пользователь не найден"}
            onRetry={() => setRetry((value) => value + 1)}
          />
        </div>
      ) : (
        <>
          <ProfileHeader
            user={user}
            backHref="/dashboard/users"
            backLabel="Назад к пользователям"
            details={[`#${user.id}`]}
          />
          <div className="space-y-6">
            <ProfileSection title="Аккаунт">
              <ProfileRow
                icon={<Shield />}
                label="Роль"
                value={getRoleLabel(user.role)}
              />
              <ProfileRow
                icon={<KeyRound />}
                label="Доступ к Ronin"
                value={hasRoninAccess(user.role) ? "Есть" : "Нет"}
              />
              <ProfileRow
                icon={<UserRound />}
                label="Статус"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        user.banned ? "bg-destructive" : "bg-booking-approved",
                      )}
                    />
                    {user.banned ? "Заблокирован" : "Активен"}
                  </span>
                }
              />
            </ProfileSection>
            <TelegramPanel user={user} />
            <UserBookings userId={user.id} />
          </div>
        </>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingResponseDto }) {
  return (
    <ProfileLinkRow
      href={`/dashboard/bookings/${booking.id}`}
      icon={
        <span
          className={cn(
            "size-1.5 rounded-full",
            statusColors[booking.status] ?? "bg-muted-foreground",
          )}
        />
      }
      label={booking.reason}
      value={`${statusNames[booking.status] ?? booking.status} · ${formatPeriod(booking.startTime, booking.endTime)}`}
      meta={
        <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
          #{booking.id}
        </span>
      }
    />
  );
}

function UserBookings({ userId }: { userId: number }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BookingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retry repeats the same request after an error.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void bookingApi
      .get_user_page(userId, page)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active)
          setError(getErrorMessage(err, "Не удалось загрузить бронирования"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, page, retry]);

  return (
    <div aria-busy={loading} className="space-y-3">
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => setRetry((value) => value + 1)}
        />
      )}
      <ProfileSection
        title={`Бронирования${data ? ` · ${data.totalCount}` : ""}`}
        footer={
          data && !error && data.totalCount > 0 ? (
            <div className="w-full py-1">
              <BookingPagination
                page={data.page}
                pageSize={data.pageSize}
                totalCount={data.totalCount}
                loading={loading}
                onPageChange={setPage}
              />
            </div>
          ) : undefined
        }
      >
        {loading && !data ? (
          <ProfileNote>Загрузка бронирований…</ProfileNote>
        ) : data?.items.length ? (
          data.items.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))
        ) : (
          !error && <ProfileNote>Бронирований пока нет</ProfileNote>
        )}
      </ProfileSection>
    </div>
  );
}
