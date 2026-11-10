"use client";

import {
  AlertCircle,
  Ban,
  CheckCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Pencil,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BookingResponseDto } from "@/app/models/booking/booking";
import type { UserResponseDto } from "@/app/models/user/user";
import { BookingEquipmentList } from "@/components/bookings/BookingEquipmentList";
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
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { getAvatarUrl } from "@/lib/avatar";
import { withFrom } from "@/lib/backLink";
import { bookingApi } from "@/lib/bookingApi";
import { splitAdminComment } from "@/lib/bookingPresentation";
import { userApi } from "@/lib/userApi";
import {
  formatWarningMessages,
  getErrorMessage,
} from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

// The server refuses to discard a cart's contents unless the request says the user agreed.
function isReplaceRequired(error: unknown) {
  const details =
    typeof error === "object" && error !== null && "details" in error
      ? error.details
      : null;
  return (
    Array.isArray(details) &&
    details.some(
      (detail) => detail?.extensions?.code === "CART_REPLACE_REQUIRED",
    )
  );
}

type ReplaceRequest = { action: "edit" | "repeat"; message: string };

const statusNames: Record<string, string> = {
  Pending: "Ожидает",
  Cancelled: "Отменено",
  Approved: "Одобрено",
  Completed: "Завершено",
};

const statusColors: Record<string, string> = {
  Pending: "bg-booking-pending",
  Cancelled: "bg-booking-cancelled",
  Approved: "bg-booking-approved",
  Completed: "bg-booking-completed",
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {
    addBookingItemsToCart,
    prepareBookingEdit,
    refreshCart,
    editingBookingId,
    getTotalItems,
    getCartItems,
    isCartLoading,
    isCartUpdating,
  } = useCart();
  const bookingId = Number.parseInt(params.id as string, 10);

  const currentBookingId = useRef(bookingId);
  currentBookingId.current = bookingId;
  const latestBookingRequest = useRef(0);

  const [booking, setBooking] = useState<BookingResponseDto | null>(null);
  const [currentUser, setCurrentUser] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [replaceRequest, setReplaceRequest] = useState<ReplaceRequest | null>(
    null,
  );

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await userApi.get_me();
      setCurrentUser(user);
    } catch (err: unknown) {
      console.error("Ошибка загрузки текущего пользователя:", err);
    }
  }, []);

  const loadBooking = useCallback(async () => {
    const requestId = ++latestBookingRequest.current;
    const isCurrent = () =>
      requestId === latestBookingRequest.current &&
      currentBookingId.current === bookingId;
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      setError("Некорректный идентификатор бронирования");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await bookingApi.get_by_id(bookingId);
      if (isCurrent()) setBooking(data);
    } catch (err: unknown) {
      console.error("Ошибка загрузки бронирования:", err);
      if (isCurrent())
        setError(getErrorMessage(err, "Не удалось загрузить бронирование"));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    setBooking(null);
    setActionError(null);
    setShowApproveDialog(false);
    setShowRejectDialog(false);
    setShowCancelDialog(false);
    setShowCompleteDialog(false);
    setReplaceRequest(null);
    setAdminComment("");
    void loadCurrentUser();
    void loadBooking();
    return () => {
      latestBookingRequest.current++;
    };
  }, [loadBooking, loadCurrentUser]);

  async function handleApprove() {
    if (!booking || booking.id !== bookingId) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await bookingApi.approve(bookingId, adminComment, booking.revision);
      setShowApproveDialog(false);
      setAdminComment("");
      await loadBooking();
    } catch (err: unknown) {
      console.error("Ошибка одобрения:", err);
      setShowApproveDialog(false);
      setActionError(getErrorMessage(err, "Не удалось одобрить бронирование"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!booking || booking.id !== bookingId) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await bookingApi.reject(bookingId, adminComment, booking.revision);
      setShowRejectDialog(false);
      setAdminComment("");
      await loadBooking();
    } catch (err: unknown) {
      console.error("Ошибка отклонения:", err);
      setShowRejectDialog(false);
      setActionError(getErrorMessage(err, "Не удалось отклонить бронирование"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!booking || booking.id !== bookingId) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await bookingApi.cancel(
        bookingId,
        booking.revision,
        adminComment || undefined,
      );
      setShowCancelDialog(false);
      setAdminComment("");
      await loadBooking();
    } catch (err: unknown) {
      console.error("Ошибка отмены:", err);
      setShowCancelDialog(false);
      setActionError(getErrorMessage(err, "Не удалось отменить бронирование"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (!booking || booking.id !== bookingId) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await bookingApi.complete(bookingId, booking.revision);
      setShowCompleteDialog(false);
      await loadBooking();
    } catch (err: unknown) {
      console.error("Ошибка завершения:", err);
      setShowCompleteDialog(false);
      setActionError(getErrorMessage(err, "Не удалось завершить бронирование"));
    } finally {
      setActionLoading(false);
    }
  }

  function editInProgressMessage(editedId: number) {
    return `Сейчас в корзине изменение бронирования #${editedId}. Несохранённые изменения будут потеряны.`;
  }

  // Runs a cart action that may discard the cart. The user is asked first; the server
  // asks again if this page's view of the cart is out of date.
  async function runCartAction(
    action: ReplaceRequest["action"],
    replaceCart: boolean,
  ) {
    try {
      setActionLoading(true);
      setActionError(null);
      if (action === "edit") await prepareBookingEdit(bookingId, replaceCart);
      else await addBookingItemsToCart(bookingId, replaceCart);
      setReplaceRequest(null);
      router.push("/cart");
    } catch (err: unknown) {
      if (!replaceCart && isReplaceRequired(err)) {
        setReplaceRequest({
          action,
          message: getErrorMessage(err, "Корзина будет заменена"),
        });
        void refreshCart().catch(() => undefined);
        return;
      }
      console.error("Ошибка подготовки корзины:", err);
      setReplaceRequest(null);
      setActionError(
        getErrorMessage(
          err,
          action === "edit"
            ? "Не удалось открыть бронирование для изменения"
            : "Не удалось добавить оборудование в корзину",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleRepeat() {
    // Items are added to an ordinary cart; only an edit in progress would be lost.
    if (editingBookingId !== null) {
      setReplaceRequest({
        action: "repeat",
        message: editInProgressMessage(editingBookingId),
      });
      return;
    }
    void runCartAction("repeat", false);
  }

  function handleEdit() {
    if (editingBookingId === bookingId) {
      // This booking is already being edited: continue where the user left off.
      router.push("/cart");
      return;
    }
    if (editingBookingId !== null) {
      setReplaceRequest({
        action: "edit",
        message: editInProgressMessage(editingBookingId),
      });
      return;
    }
    if (getCartItems().length > 0) {
      setReplaceRequest({
        action: "edit",
        message: `В корзине уже есть оборудование (${getTotalItems()} ед.). Для изменения бронирования корзина будет заменена его содержимым.`,
      });
      return;
    }
    void runCartAction("edit", false);
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

  function isAdmin() {
    return currentUser?.role === "Admin";
  }

  function isOwner() {
    return currentUser?.login === booking?.login;
  }

  const profileHref = isOwner()
    ? "/dashboard/profile"
    : isAdmin() && booking?.userId
      ? `/dashboard/users/${booking.userId}`
      : null;
  const profileLink =
    profileHref && booking
      ? withFrom(profileHref, `/dashboard/bookings/${booking.id}`)
      : null;

  const canReviewBooking = isAdmin() && booking?.status === "Pending";
  const canCompleteBooking = isAdmin() && booking?.status === "Approved";
  const canCancelBooking =
    isOwner() &&
    (booking?.status === "Pending" || booking?.status === "Approved");
  const canRepeatBooking = isOwner();
  const canEditBooking =
    isAdmin() ||
    (isOwner() &&
      (booking?.status === "Pending" || booking?.status === "Approved"));
  const hasActions =
    canReviewBooking ||
    canCompleteBooking ||
    canCancelBooking ||
    canRepeatBooking ||
    canEditBooking;

  if (loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-background">
        <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="max-w-4xl mx-auto w-full">
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p>Загрузка...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-background">
        <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="max-w-4xl mx-auto w-full">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-6"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>

            <ErrorMessage
              message={error || "Бронирование не найдено"}
              onRetry={() => void loadBooking()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/bookings/my")}
              className="mt-3"
            >
              Вернуться к списку
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-background">
      <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 overflow-hidden flex-1">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                size="icon"
                className="shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="overflow-hidden flex-1">
                <h1 className="text-2xl lg:text-3xl font-bold truncate">
                  {booking.reason}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-muted-foreground font-mono">
                    #{booking.id}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      statusColors[booking.status] || "bg-gray-500",
                    )}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {statusNames[booking.status] || booking.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {formatWarningMessages(booking.warnings).length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
                    Предупреждения
                  </p>
                  <div className="space-y-1">
                    {formatWarningMessages(booking.warnings).map((message) => (
                      <p
                        key={message}
                        className="text-sm text-orange-600 dark:text-orange-400 break-words"
                      >
                        {message}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <BookingUserHeader booking={booking} href={profileLink} />
              <div className="space-y-3">
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Логин</p>
                  <p className="font-mono text-sm truncate">{booking.login}</p>
                </div>
                {booking.telegramUsername && (
                  <div className="overflow-hidden">
                    <p className="text-xs text-muted-foreground mb-1">
                      Telegram
                    </p>
                    <a
                      href={`https://t.me/${booking.telegramUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono font-semibold text-primary hover:underline truncate block"
                    >
                      {booking.telegramUsername}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-lg font-semibold">Время</h2>
                  <p className="text-sm text-muted-foreground">
                    Период бронирования
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Создано</p>
                  <p className="text-sm truncate">
                    {formatDateTime(booking.creationTime)}
                  </p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Начало</p>
                  <p className="text-sm font-medium truncate">
                    {formatDateTime(booking.startTime)}
                  </p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">
                    Окончание
                  </p>
                  <p className="text-sm font-medium truncate">
                    {formatDateTime(booking.endTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <BookingEquipmentList
            items={booking.equipmentModelIds}
            from={`/dashboard/bookings/${booking.id}`}
          />

          {(booking.comment ||
            (booking.adminComment &&
              splitAdminComment(booking.adminComment).text)) && (
            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <h2 className="text-lg font-semibold mb-4">Комментарии</h2>
              <div className="space-y-3">
                {booking.comment && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 overflow-hidden">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                      Комментарий пользователя:
                    </p>
                    <p className="text-sm break-words whitespace-pre-wrap">
                      {booking.comment}
                    </p>
                  </div>
                )}
                {booking.adminComment &&
                  (() => {
                    const { author, text } = splitAdminComment(
                      booking.adminComment,
                    );
                    if (!text) return null;
                    return (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 overflow-hidden">
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">
                          {author
                            ? `${author}, администратор:`
                            : "Комментарий администратора:"}
                        </p>
                        <p className="text-sm break-words whitespace-pre-wrap">
                          {text}
                        </p>
                      </div>
                    );
                  })()}
              </div>
            </div>
          )}

          {currentUser && hasActions && (
            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <h2 className="text-lg font-semibold mb-4">Действия</h2>
              {actionError && (
                <ErrorMessage message={actionError} className="mb-4" />
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                {canRepeatBooking && (
                  <Button
                    variant="outline"
                    onClick={handleRepeat}
                    disabled={actionLoading || isCartLoading || isCartUpdating}
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">Повторить бронирование</span>
                  </Button>
                )}

                {canEditBooking && (
                  <Button
                    variant="outline"
                    onClick={handleEdit}
                    disabled={actionLoading || isCartLoading || isCartUpdating}
                    className="w-full"
                  >
                    <Pencil className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">
                      {isAdmin() && !isOwner()
                        ? "Изменить за пользователя"
                        : "Изменить бронирование"}
                    </span>
                  </Button>
                )}

                {canReviewBooking && (
                  <>
                    <Button
                      onClick={() => setShowApproveDialog(true)}
                      disabled={actionLoading}
                      className="w-full"
                    >
                      <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">Одобрить</span>
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={actionLoading}
                      className="w-full"
                    >
                      <XCircle className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">Отклонить</span>
                    </Button>
                  </>
                )}

                {canCompleteBooking && (
                  <Button
                    onClick={() => setShowCompleteDialog(true)}
                    disabled={actionLoading}
                    className="w-full sm:col-span-2"
                    variant="default"
                  >
                    <CheckCheck className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">Завершить бронирование</span>
                  </Button>
                )}

                {canCancelBooking && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={actionLoading}
                    className="w-full sm:col-span-2"
                  >
                    <Ban className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">Отменить бронирование</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          <Dialog
            open={replaceRequest !== null}
            onOpenChange={(open) => {
              if (!open && !actionLoading) setReplaceRequest(null);
            }}
          >
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {replaceRequest?.action === "edit"
                    ? "Заменить корзину?"
                    : "Прервать изменение бронирования?"}
                </DialogTitle>
                <DialogDescription>{replaceRequest?.message}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReplaceRequest(null)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  Оставить корзину
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (replaceRequest)
                      void runCartAction(replaceRequest.action, true);
                  }}
                  disabled={actionLoading || isCartUpdating}
                  className="w-full sm:w-auto"
                >
                  {actionLoading
                    ? "Обработка..."
                    : replaceRequest?.action === "edit"
                      ? "Заменить и изменить"
                      : "Повторить бронирование"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Одобрить бронирование</DialogTitle>
                <DialogDescription>
                  Добавьте комментарий для пользователя (необязательно)
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Комментарий администратора..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApproveDialog(false);
                    setAdminComment("");
                  }}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? "Обработка..." : "Одобрить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Отклонить бронирование</DialogTitle>
                <DialogDescription>
                  Укажите причину отклонения
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Причина отклонения..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={4}
                required
                className="resize-none"
              />
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setAdminComment("");
                  }}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  Отмена
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={actionLoading || !adminComment.trim()}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? "Обработка..." : "Отклонить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Отменить бронирование</DialogTitle>
                <DialogDescription>
                  Вы уверены, что хотите отменить это бронирование?
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Причина отмены (необязательно)..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelDialog(false);
                    setAdminComment("");
                  }}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  Назад
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? "Обработка..." : "Отменить бронирование"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showCompleteDialog}
            onOpenChange={setShowCompleteDialog}
          >
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Завершить бронирование</DialogTitle>
                <DialogDescription>
                  Вы уверены, что хотите завершить это бронирование? Убедитесь,
                  что всё оборудование было возвращено.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCompleteDialog(false)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? "Обработка..." : "Завершить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

function BookingUserHeader({
  booking,
  href,
}: {
  booking: BookingResponseDto;
  href: string | null;
}) {
  const content = (
    <>
      <Avatar userRole={booking.userRole} className="h-10 w-10">
        <AvatarImage
          src={getAvatarUrl(
            booking.login,
            booking.userRole,
            booking.userAvatarSeed,
            booking.userAvatarUrl,
          )}
          alt={booking.userName}
        />
        <AvatarFallback>
          {booking.userName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <h2 className="min-w-0 flex-1 text-lg font-semibold break-words">
        {booking.userName}
      </h2>
    </>
  );
  if (!href)
    return <div className="mb-4 flex items-center gap-3">{content}</div>;
  return (
    <Link
      href={href}
      className="group -m-2 mb-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
    >
      {content}
      <span className="flex shrink-0 items-center gap-0.5 text-sm text-muted-foreground group-hover:text-foreground">
        Профиль
        <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}
