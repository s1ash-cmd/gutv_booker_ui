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
import { BookingResponseDto } from '@/app/models/booking/booking';
import { UserResponseDto } from '@/app/models/user/user';
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
      <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-background">
        <main className="py-6 px-4">
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
        <main className="py-6 px-4">
          <div className="max-w-4xl mx-auto w-full">
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
                <div className="overflow-hidden">
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
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-background">
      <main className="py-6 px-4">
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
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
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
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
                    Предупреждения
                  </p>
                  <div className="space-y-1">
                    {Object.entries(booking.warnings).map(([key, value]) => (
                      <p key={key} className="text-sm text-orange-600 dark:text-orange-400 break-words">
                        <span className="font-medium">{key}:</span> {String(value)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-lg font-semibold">Пользователь</h2>
                  <p className="text-sm text-muted-foreground">Информация о заказчике</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Имя</p>
                  <p className="font-medium truncate">{booking.userName}</p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Логин</p>
                  <p className="font-mono text-sm truncate">{booking.login}</p>
                </div>
                {booking.telegramUsername && (
                  <div className="overflow-hidden">
                    <p className="text-xs text-muted-foreground mb-1">Telegram</p>
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
                  <p className="text-sm text-muted-foreground">Период бронирования</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Создано</p>
                  <p className="text-sm truncate">{formatDateTime(booking.creationTime)}</p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Начало</p>
                  <p className="text-sm font-medium truncate">{formatDateTime(booking.startTime)}</p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Окончание</p>
                  <p className="text-sm font-medium truncate">{formatDateTime(booking.endTime)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="overflow-hidden">
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
                  className="bg-secondary/20 rounded-lg p-4 space-y-2 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="overflow-hidden flex-1">
                      <p className="font-medium truncate">{item.modelName}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Инв. номер: <span className="font-mono">{item.inventoryNumber}</span>
                      </p>
                    </div>
                    {item.isReturned && (
                      <div className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded px-2 py-1 shrink-0">
                        <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                          Возвращено
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="truncate max-w-[45%]">{formatDateTime(item.startDate)}</span>
                    <span className="shrink-0">→</span>
                    <span className="truncate max-w-[45%]">{formatDateTime(item.endDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(booking.comment || booking.adminComment) && (
            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <h2 className="text-lg font-semibold mb-4">Комментарии</h2>
              <div className="space-y-3">
                {booking.comment && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 overflow-hidden">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                      Комментарий пользователя:
                    </p>
                    <p className="text-sm break-words whitespace-pre-wrap">{booking.comment}</p>
                  </div>
                )}
                {booking.adminComment && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 overflow-hidden">
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">
                      Комментарий администратора:
                    </p>
                    <p className="text-sm break-words whitespace-pre-wrap">{booking.adminComment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentUser && (
            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <h2 className="text-lg font-semibold mb-4">Действия</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {isAdmin() && booking.status === 'Pending' && (
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

                {isOwner() && (booking.status === 'Pending' || booking.status === 'Approved') && (
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
                    setAdminComment('');
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
                  {actionLoading ? 'Обработка...' : 'Одобрить'}
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
                    setAdminComment('');
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
                  {actionLoading ? 'Обработка...' : 'Отклонить'}
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
                    setAdminComment('');
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
                  {actionLoading ? 'Обработка...' : 'Отменить бронирование'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}