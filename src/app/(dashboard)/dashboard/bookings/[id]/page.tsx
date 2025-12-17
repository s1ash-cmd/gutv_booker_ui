"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  User,
  Clock,
  Package,
  MessageSquare,
  ChevronLeft,
  CheckCircle,
  XCircle,
  CheckCheck,
  Ban
} from 'lucide-react';
import { bookingApi } from '@/lib/bookingApi';
import { userApi } from '@/lib/userApi';
import { BookingResponseDto } from '@/app/types/booking';
import { UserResponseDto } from '@/app/types/user';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const statusNames: Record<string, string> = {
  'Pending': 'Ожидает',
  'Cancelled': 'Отменено',
  'Approved': 'Одобрено',
  'Completed': 'Завершено',
};

const statusColors: Record<string, string> = {
  'Pending': 'bg-yellow-500',
  'Cancelled': 'bg-red-500',
  'Approved': 'bg-green-500',
  'Completed': 'bg-blue-500',
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = parseInt(params.id as string);

  const [booking, setBooking] = useState<BookingResponseDto | null>(null);
  const [currentUser, setCurrentUser] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [adminComment, setAdminComment] = useState('');

  useEffect(() => {
    loadCurrentUser();
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  async function loadCurrentUser() {
    try {
      const user = await userApi.get_me();
      setCurrentUser(user);
    } catch (err: any) {
      console.error('Ошибка загрузки текущего пользователя:', err);
    }
  }

  async function loadBooking() {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingApi.get_by_id(bookingId);
      setBooking(data);
    } catch (err: any) {
      console.error('Ошибка загрузки бронирования:', err);
      setError(err?.message || 'Не удалось загрузить бронирование');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    try {
      setActionLoading(true);
      await bookingApi.approve(bookingId, adminComment);
      setShowApproveDialog(false);
      setAdminComment('');
      await loadBooking();
    } catch (err: any) {
      console.error('Ошибка одобрения:', err);
      setError(err?.message || 'Не удалось одобрить бронирование');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    try {
      setActionLoading(true);
      await bookingApi.reject(bookingId, adminComment);
      setShowRejectDialog(false);
      setAdminComment('');
      await loadBooking();
    } catch (err: any) {
      console.error('Ошибка отклонения:', err);
      setError(err?.message || 'Не удалось отклонить бронирование');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    try {
      setActionLoading(true);
      await bookingApi.cancel(bookingId, adminComment || undefined);
      setShowCancelDialog(false);
      setAdminComment('');
      await loadBooking();
    } catch (err: any) {
      console.error('Ошибка отмены:', err);
      setError(err?.message || 'Не удалось отменить бронирование');
    } finally {
      setActionLoading(false);
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isAdmin() {
    return currentUser?.role === 'Admin';
  }

  function isOwner() {
    return currentUser?.login === booking?.login;
  }

  if (loading) {
    return (
      <main className="bg-background py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p>Загрузка...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="bg-background py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>

          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">
                  {error || 'Бронирование не найдено'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/bookings')}
                  className="mt-3"
                >
                  Вернуться к списку
                </Button>
              </div>
            </div>
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
              onClick={() => router.back()}
              size="icon"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">
                {booking.reason}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground font-mono">
                  #{booking.id}
                </span>
                <span className="text-muted-foreground">•</span>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  statusColors[booking.status] || 'bg-gray-500'
                )}></div>
                <span className="text-sm text-muted-foreground">
                  {statusNames[booking.status] || booking.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {Object.keys(booking.warnings).length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
                  Предупреждения
                </p>
                <div className="space-y-1">
                  {Object.entries(booking.warnings).map(([key, value]) => (
                    <p key={key} className="text-sm text-orange-600 dark:text-orange-400">
                      <span className="font-medium">{key}:</span> {String(value)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Пользователь</h2>
                <p className="text-sm text-muted-foreground">Информация о заказчике</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Имя</p>
                <p className="font-medium">{booking.userName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Логин</p>
                <p className="font-mono text-sm">@{booking.login}</p>
              </div>
              {booking.telegramId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Telegram ID</p>
                  <p className="font-mono text-sm">{booking.telegramId}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Время</h2>
                <p className="text-sm text-muted-foreground">Период бронирования</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Создано</p>
                <p className="text-sm">{formatDateTime(booking.creationTime)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Начало</p>
                <p className="text-sm font-medium">{formatDateTime(booking.startTime)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Окончание</p>
                <p className="text-sm font-medium">{formatDateTime(booking.endTime)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Оборудование</h2>
              <p className="text-sm text-muted-foreground">
                Всего позиций: {booking.equipmentModelIds.length}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {booking.equipmentModelIds.map((item) => (
              <div
                key={item.id}
                className="bg-secondary/20 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{item.modelName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Инв. номер: <span className="font-mono">{item.inventoryNumber}</span>
                    </p>
                  </div>
                  {item.isReturned && (
                    <div className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded px-2 py-1">
                      <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Возвращено
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatDateTime(item.startDate)}</span>
                  <span>→</span>
                  <span>{formatDateTime(item.endDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {(booking.comment || booking.adminComment) && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Комментарии</h2>
            <div className="space-y-3">
              {booking.comment && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                    Комментарий пользователя:
                  </p>
                  <p className="text-sm">{booking.comment}</p>
                </div>
              )}
              {booking.adminComment && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">
                    Комментарий администратора:
                  </p>
                  <p className="text-sm">{booking.adminComment}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentUser && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Действия</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {isAdmin() && booking.status === 'Pending' && (
                <>
                  <Button
                    onClick={() => setShowApproveDialog(true)}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Одобрить
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Отклонить
                  </Button>
                </>
              )}

              {isOwner() && (booking.status === 'Pending' || booking.status === 'Approved') && (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Отменить бронирование
                </Button>
              )}
            </div>
          </div>
        )}

        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
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
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveDialog(false);
                  setAdminComment('');
                }}
                disabled={actionLoading}
              >
                Отмена
              </Button>
              <Button onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? 'Обработка...' : 'Одобрить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
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
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setAdminComment('');
                }}
                disabled={actionLoading}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !adminComment.trim()}
              >
                {actionLoading ? 'Обработка...' : 'Отклонить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
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
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setAdminComment('');
                }}
                disabled={actionLoading}
              >
                Назад
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading ? 'Обработка...' : 'Отменить бронирование'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
