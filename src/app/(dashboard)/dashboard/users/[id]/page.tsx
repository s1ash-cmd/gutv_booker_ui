"use client";

import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import { AdminOnly } from "@/components/AdminOnly";
import { BookingPagination } from "@/components/BookingPagination";
import { ProfileCard } from "@/components/profile/ProfileCard";
import profile from "@/components/profile/ProfileLayout.module.css";
import { TelegramPanel } from "@/components/profile/TelegramPanel";
import { Button } from "@/components/ui/button";
import { type BookingPage, bookingApi } from "@/lib/bookingApi";
import { userApi } from "@/lib/userApi";
import styles from "./UserDetail.module.css";

const statuses: Record<string, string> = {
  Pending: "Ожидает",
  Approved: "Одобрено",
  Completed: "Завершено",
  Cancelled: "Отменено",
};
function date(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
          setError(
            err instanceof Error
              ? err.message
              : "Не удалось загрузить пользователя",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);

  return (
    <div
      className={`${profile.page} ${styles.page} pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8`}
    >
      <div className={profile.pageTop}>
        <Link href="/dashboard/users" className={profile.simpleLink}>
          <ChevronLeft size={15} /> Пользователи
        </Link>
        <span className={profile.eyebrow}>Профиль пользователя · #{id}</span>
      </div>
      {loading ? (
        <p className={profile.secondary}>Загрузка профиля…</p>
      ) : error || !user ? (
        <div role="alert" className={profile.error}>
          <p>{error ?? "Пользователь не найден"}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setRetry((value) => value + 1)}
          >
            Повторить
          </Button>
        </div>
      ) : (
        <div className={profile.grid}>
          <ProfileCard user={user} showStatus />
          <div className={profile.panels}>
            <TelegramPanel user={user} />
            <UserBookings userId={user.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function UserBookings({ userId }: { userId: number }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BookingPage | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
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
        if (!active) return;
        setData(result);
        if (result.page === 1) setLatest(result.items[0]?.creationTime ?? null);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : "Не удалось загрузить бронирования",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, page, retry]);

  return (
    <section
      className={profile.panel}
      aria-label="Бронирования пользователя"
      aria-busy={loading}
    >
      <div className={profile.sectionTitle}>
        <h2>
          Бронирования{" "}
          {data && <span className={profile.count}>{data.totalCount}</span>}
        </h2>
        <CalendarDays size={19} className={profile.secondary} />
      </div>
      {latest && (
        <p className={`${profile.secondary} ${styles.historyIntro}`}>
          Последняя заявка — {date(latest)}
        </p>
      )}
      {loading ? (
        <p className={profile.secondary}>Загрузка бронирований…</p>
      ) : error ? (
        <div role="alert" className={profile.error}>
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setRetry((value) => value + 1)}
          >
            Повторить
          </Button>
        </div>
      ) : data?.items.length ? (
        <ul className={styles.bookingList}>
          {data.items.map((booking) => (
            <li key={booking.id} className={styles.booking}>
              <Link
                href={`/dashboard/bookings/${booking.id}`}
                className={styles.bookingLink}
              >
                <div className={styles.bookingMeta}>
                  <span className={styles.bookingId}>#{booking.id}</span>
                  <span
                    className={styles.bookingStatus}
                    data-status={booking.status}
                  >
                    <span className={styles.statusDot} />{" "}
                    {statuses[booking.status] ?? booking.status}
                  </span>
                </div>
                <div className={styles.bookingTitle}>
                  <h3>{booking.reason}</h3>
                  <ArrowUpRight size={15} />
                </div>
                <p className={styles.period}>
                  {date(booking.startTime)} <span>→</span>{" "}
                  {date(booking.endTime)}
                </p>
                <div className={styles.equipment}>
                  {booking.equipmentModelIds.slice(0, 4).map((item) => (
                    <span key={item.id}>{item.modelName}</span>
                  ))}
                  {booking.equipmentModelIds.length > 4 && (
                    <span>+{booking.equipmentModelIds.length - 4} ещё</span>
                  )}
                </div>
                {booking.comment?.trim() && (
                  <p className={styles.comment}>
                    <MessageSquare size={12} /> <span>{booking.comment}</span>
                  </p>
                )}
                {booking.adminComment?.trim() && (
                  <p className={`${styles.comment} ${styles.adminComment}`}>
                    <span>
                      <strong>Администратор: </strong>
                      {booking.adminComment}
                    </span>
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <CalendarDays size={28} />
          <strong>Бронирований пока нет</strong>
          <p>Здесь появится история заявок пользователя</p>
        </div>
      )}
      {data && !error && (
        <div className={styles.pagination}>
          <BookingPagination
            page={data.page}
            pageSize={data.pageSize}
            totalCount={data.totalCount}
            loading={loading}
            onPageChange={setPage}
          />
        </div>
      )}
    </section>
  );
}
