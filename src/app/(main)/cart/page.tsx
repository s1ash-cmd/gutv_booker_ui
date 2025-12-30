"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, Calendar, ChevronLeft, Plus, Minus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { bookingApi } from '@/lib/bookingApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, getTotalItems, getCartItems } = useCart();
  const router = useRouter();

  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const cartItems = getCartItems();

  function convertToISO(datetimeLocal: string): string {
    if (!datetimeLocal) return '';
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

      if (end <= start) {
        newErrors.endTime = "Дата окончания должна быть позже даты начала";
      }
    }

    return newErrors;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (cartItems.length === 0) {
      setErrors({ form: 'Бронирование пусто' });
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

      const equipment = cartItems.map(item => ({
        modelName: item.model.name,
        quantity: item.quantity
      }));

      const bookingData = {
        reason: reason.trim(),
        startTime: convertToISO(startTime),
        endTime: convertToISO(endTime),
        comment: comment.trim() || "",
        equipment
      };

      const result = await bookingApi.create_booking(bookingData);

      clearCart();
      router.push(`/dashboard/bookings/${result.id}`);
    } catch (err: any) {
      console.error('Ошибка создания бронирования:', err);

      let errorMessage = 'Не удалось создать бронирование';

      if (err.message) {
        errorMessage = err.message;
      }

      if (err.response) {
        errorMessage = err.response.data?.message || err.response.data?.title || errorMessage;
      }

      if (err.errors) {
        const validationErrors = Object.entries(err.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        errorMessage = validationErrors || errorMessage;
      }

      setErrors({ form: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  if (cartItems.length === 0) {
    return (
      <main className="bg-background py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
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
              Бронирование пусто
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Добавьте оборудование для бронирования
            </p>
            <Button onClick={() => router.push('/')}>
              Перейти к каталогу
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              size="icon"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Бронирование</h1>
              <p className="text-sm text-muted-foreground">
                {getTotalItems()} {getTotalItems() === 1 ? 'позиция' : getTotalItems() > 1 && getTotalItems() < 5 ? 'позиции' : 'позиций'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCart}
          >
            Очистить
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Выбранное оборудование</h2>
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
                      onClick={() => removeFromCart(item.model.id)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-bold w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.model.id, item.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => updateQuantity(item.model.id, 0)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
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
              placeholder="Например: Съемка мероприятия..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                clearError('reason');
              }}
              className={errors.reason ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">
                {errors.reason}
              </p>
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
                  clearError('startTime');
                }}
                className={errors.startTime ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">
                  {errors.startTime}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">
                Дата и время окончания <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  clearError('endTime');
                }}
                className={errors.endTime ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">
                  {errors.endTime}
                </p>
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

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Оформление...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Создать бронирование
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
