"use client";

import {
  Calendar,
  ChevronLeft,
  Minus,
  PackageSearch,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { canBookEquipment } from "@/lib/roles";
import { formatBackendErrorDetails } from "@/lib/userFacingMessages";

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

export default function CartPage() {
  const {
    removeFromCart,
    updateQuantity,
    clearCart,
    cartDetails,
    editingBookingId,
    isCartLoading,
    setCartDetails,
    createBookingFromCart,
    updateBookingFromCart,
    getTotalItems,
    getCartItems,
  } = useCart();
  const { user, isAuth, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [reason, setReason] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const didInitializeDetailsRef = useRef(false);
  const updatingItemIdsRef = useRef(new Set<number>());
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<number>>(
    new Set(),
  );
  const canUseBooking = canBookEquipment(user?.role);

  const cartItems = getCartItems();

  useEffect(() => {
    if (isCartLoading || didInitializeDetailsRef.current) {
      return;
    }

    setReason(cartDetails.reason ?? "");
    setStartTime(toDatetimeLocal(cartDetails.startTime));
    setEndTime(toDatetimeLocal(cartDetails.endTime));
    setComment(cartDetails.comment ?? "");
    didInitializeDetailsRef.current = true;
  }, [cartDetails, isCartLoading]);

  function convertToISO(datetimeLocal: string): string {
    if (!datetimeLocal) return "";
    const date = new Date(datetimeLocal);
    return date.toISOString();
  }

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const runItemUpdate = async (
    modelId: number,
    update: () => Promise<void>,
  ) => {
    if (updatingItemIdsRef.current.has(modelId)) return;

    updatingItemIdsRef.current.add(modelId);
    setUpdatingItemIds(new Set(updatingItemIdsRef.current));

    try {
      await update();
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        form:
          error instanceof Error
            ? error.message
            : "Не удалось изменить количество оборудования",
      }));
    } finally {
      updatingItemIdsRef.current.delete(modelId);
      setUpdatingItemIds(new Set(updatingItemIdsRef.current));
    }
  };

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!reason || reason.trim() === "") {
      newErrors.reason = "Причина бронирования не может быть пустой";
    } else if (reason.trim().length < 3) {
      newErrors.reason = "Причина должна содержать не менее 3 символов";
    }

    if (!startTime) {
      newErrors.startTime = "Укажите дату и время начала";
    }

    if (!endTime) {
      newErrors.endTime = "Укажите дату и время окончания";
    }

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (Number.isNaN(start.getTime())) {
        newErrors.startTime = "Укажите корректную дату и время начала";
      }

      if (Number.isNaN(end.getTime())) {
        newErrors.endTime = "Укажите корректную дату и время окончания";
      } else if (!Number.isNaN(start.getTime()) && end <= start) {
        newErrors.endTime = "Дата окончания должна быть позже даты начала";
      }
    }

    return newErrors;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (cartItems.length === 0) {
      setErrors({ form: "Бронирование пусто" });
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    try {
      setLoading(true);

      const bookingData = {
        reason: reason.trim(),
        startTime: convertToISO(startTime),
        endTime: convertToISO(endTime),
        comment: comment.trim() || "",
      };

      await setCartDetails(bookingData);
      const result = editingBookingId
        ? await updateBookingFromCart(editingBookingId)
        : await createBookingFromCart();
      router.push(`/dashboard/bookings/${result.id}`);
    } catch (err: unknown) {
      console.error("Ошибка создания бронирования:", err);

      let errorMessage =
        err instanceof Error && err.message
          ? err.message
          : "Не удалось создать бронирование";

      const validationErrors = formatBackendErrorDetails(
        typeof err === "object" && err !== null && "details" in err
          ? err.details
          : undefined,
      );
      if (validationErrors) {
        errorMessage = validationErrors;
      }

      setErrors({ form: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    await clearCart();
    if (editingBookingId) {
      router.push(`/dashboard/bookings/${editingBookingId}`);
    }
  }

  if (isAuthLoading) {
    return (
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-4xl mx-auto text-center py-12 text-muted-foreground">
          Загрузка...
        </div>
      </main>
    );
  }

  if (!isAuth) {
    return (
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 bg-card/30 border border-border/50 rounded-xl">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Корзина доступна после входа
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Для бронирования оборудования войдите в аккаунт.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button onClick={() => router.push("/login")}>Войти</Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!canUseBooking) {
    return (
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 bg-card/30 border border-border/50 rounded-xl">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Бронирование оборудования недоступно
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              У вашей роли нет доступа к бронированию оборудования.
            </p>
            <Button onClick={() => router.push("/")}>
              Вернуться в каталог
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (isCartLoading) {
    return (
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p>Загрузка корзины...</p>
          </div>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="mb-6"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Назад к каталогу
          </Button>

          <div className="text-center py-12 bg-card/30 border border-border/50 rounded-xl">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {editingBookingId
                ? "В бронировании не осталось оборудования"
                : "Бронирование пусто"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {editingBookingId
                ? "Добавьте хотя бы одну модель или отмените изменение"
                : "Добавьте оборудование для бронирования"}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => router.push("/")}
                className="w-full max-w-xs sm:w-auto"
              >
                Добавить оборудование
              </Button>
              {editingBookingId && (
                <Button
                  variant="outline"
                  onClick={() => void handleClear()}
                  className="w-full max-w-xs sm:w-auto"
                >
                  Отменить изменение
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() =>
                router.push(
                  editingBookingId
                    ? `/dashboard/bookings/${editingBookingId}`
                    : "/",
                )
              }
              size="icon"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">
                {editingBookingId
                  ? `Изменение бронирования #${editingBookingId}`
                  : "Бронирование"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {getTotalItems()}{" "}
                {getTotalItems() === 1
                  ? "позиция"
                  : getTotalItems() > 1 && getTotalItems() < 5
                    ? "позиции"
                    : "позиций"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleClear()}
          >
            {editingBookingId ? "Отменить" : "Очистить"}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Выбранное оборудование</h2>
            {editingBookingId && (
              <Button asChild variant="outline" size="sm">
                <Link href="/">
                  <PackageSearch className="size-4" />
                  Добавить оборудование
                </Link>
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.model.id}
                className="flex items-center justify-between gap-4 p-4 bg-secondary/20 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{item.model.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {item.model.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 bg-secondary/40 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        void runItemUpdate(item.model.id, () =>
                          removeFromCart(item.model.id),
                        )
                      }
                      disabled={updatingItemIds.has(item.model.id)}
                      aria-label={`Уменьшить количество ${item.model.name}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-bold w-8 text-center">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        void runItemUpdate(item.model.id, () =>
                          updateQuantity(item.model.id, item.quantity + 1),
                        )
                      }
                      disabled={updatingItemIds.has(item.model.id)}
                      aria-label={`Увеличить количество ${item.model.name}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => void updateQuantity(item.model.id, 0)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 space-y-4"
        >
          {editingBookingId && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
              После сохранения заявка снова перейдет в статус «Ожидает» и будет
              отправлена администраторам на подтверждение.
            </div>
          )}
          <h2 className="text-lg font-semibold mb-4">Детали бронирования</h2>

          {errors.form && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {errors.form}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Причина бронирования <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reason"
              placeholder="Например: Учебная съемка..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                clearError("reason");
              }}
              className={errors.reason ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">
                Дата и время начала <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  clearError("startTime");
                }}
                className={errors.startTime ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">
                Дата и время окончания{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  clearError("endTime");
                }}
                className={errors.endTime ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий (необязательно)</Label>
            <Textarea
              id="comment"
              placeholder="Дополнительная информация..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {editingBookingId ? "Сохранение..." : "Оформление..."}
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                {editingBookingId
                  ? "Сохранить и отправить на подтверждение"
                  : "Создать бронирование"}
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
