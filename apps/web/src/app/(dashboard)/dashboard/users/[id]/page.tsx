"use client";

import { Ban, Crown, KeyRound, Shield } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { backLabelFor, goBack, readFrom } from "@/lib/backLink";
import { type BookingPage, bookingApi } from "@/lib/bookingApi";
import {
  bookingStatusColors,
  bookingStatusNames,
  formatBookingPeriod,
} from "@/lib/bookingPresentation";
import { getRoleLabel, hasRoninAccess } from "@/lib/roles";
import { userApi } from "@/lib/userApi";
import { getErrorMessage } from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <AdminOnly>
      <UserDetail key={params.id} id={params.id} />
    </AdminOnly>
  );
}

function UserDetail({ id }: { id: string }) {
  const router = useRouter();
  const from = readFrom(useSearchParams().get("from"));
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
            <Link href={from ?? "/dashboard/users"}>
              ← {from ? backLabelFor(from) : "Пользователи"}
            </Link>
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
            backHref={from ?? "/dashboard/users"}
            backLabel={from ? backLabelFor(from) : "Назад к пользователям"}
            onBack={
              from ? () => goBack(router, from, "/dashboard/users") : undefined
            }
            details={[`#${user.id}`]}
          />
          <div className="space-y-6">
            <ProfileSection title="Аккаунт">
              <ProfileRow
                icon={<Shield />}
                label="Роль"
                value={getRoleLabel(user.role)}
              />
            </ProfileSection>
            <TelegramPanel user={user} />
            <UserManagement user={user} onChange={setUser} />
            <UserBookings userId={user.id} />
          </div>
        </>
      )}
    </div>
  );
}

function UserManagement({
  user,
  onChange,
}: {
  user: UserResponseDto;
  onChange: (user: UserResponseDto) => void;
}) {
  const { user: me } = useAuth();
  const isSelf = me?.id === String(user.id);
  const isAdmin = user.role === "Admin";
  const ronin = hasRoninAccess(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banError, setBanError] = useState<string | null>(null);
  const locked = isSelf || busy;

  async function run(
    action: () => Promise<unknown>,
    fallback: string,
    onError: (message: string) => void = setError,
  ) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChange(await userApi.get_by_id(user.id));
      return true;
    } catch (err) {
      onError(getErrorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmBan() {
    setBanError(null);
    const ok = await run(
      () => userApi.ban(user.id, banReason),
      "Не удалось забанить пользователя",
      setBanError,
    );
    if (ok) setBanOpen(false);
  }

  return (
    <div className="space-y-3">
      {error && <ErrorMessage message={error} />}
      <ProfileSection
        title="Управление"
        footer={isSelf ? <span>Свой аккаунт изменить нельзя</span> : undefined}
      >
        <ProfileRow
          icon={<KeyRound />}
          label="Доступ к Ronin"
          value={
            isAdmin
              ? "Есть у всех администраторов"
              : ronin
                ? "Может бронировать Ronin"
                : "Нет доступа"
          }
          action={
            <Switch
              checked={ronin}
              disabled={locked || isAdmin}
              aria-label="Доступ к Ronin"
              onCheckedChange={(next) =>
                void run(
                  () =>
                    next
                      ? userApi.grant_ronin(user.id)
                      : userApi.make_user(user.id),
                  "Не удалось изменить доступ к Ronin",
                )
              }
            />
          }
        />
        <ProfileRow
          icon={<Crown />}
          label="Администратор"
          value={isAdmin ? "Полный доступ к админке" : "Нет"}
          action={
            <Switch
              checked={isAdmin}
              disabled={locked}
              aria-label="Администратор"
              onCheckedChange={(next) =>
                void run(
                  () =>
                    next
                      ? userApi.make_admin(user.id)
                      : userApi.make_user(user.id),
                  "Не удалось изменить роль",
                )
              }
            />
          }
        />
        <ProfileRow
          icon={<Ban />}
          label="Бронирование"
          value={
            user.banned ? (
              <span className="text-destructive">
                Запрещено · {user.banReason?.trim() || "без причины"}
              </span>
            ) : (
              "Разрешено"
            )
          }
          action={
            user.banned ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                disabled={locked}
                onClick={() =>
                  void run(
                    () => userApi.unban(user.id),
                    "Не удалось разбанить пользователя",
                  )
                }
              >
                Разбанить
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={locked}
                onClick={() => {
                  setBanReason("");
                  setBanError(null);
                  setBanOpen(true);
                }}
              >
                Забанить
              </Button>
            )
          }
        />
      </ProfileSection>

      <Dialog
        open={banOpen}
        onOpenChange={(open) => {
          if (!busy) setBanOpen(open);
        }}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Запретить бронирование</DialogTitle>
            <DialogDescription>
              {user.name} сможет входить в аккаунт и просматривать сайт. Причина
              будет показана при попытке бронирования.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ban-reason">
              Причина блокировки (необязательно)
            </Label>
            <Textarea
              id="ban-reason"
              value={banReason}
              onChange={(event) => setBanReason(event.target.value)}
              maxLength={1000}
              disabled={busy}
              placeholder="Комментарий администратора"
            />
          </div>
          {banError && <ErrorMessage message={banError} />}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanOpen(false)}
              disabled={busy}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void confirmBan()}
            >
              {busy ? "Блокировка…" : "Заблокировать бронирование"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            bookingStatusColors[booking.status] ?? "bg-muted-foreground",
          )}
        />
      }
      label={booking.reason}
      value={`${bookingStatusNames[booking.status] ?? booking.status} · ${formatBookingPeriod(booking.startTime, booking.endTime)}`}
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
