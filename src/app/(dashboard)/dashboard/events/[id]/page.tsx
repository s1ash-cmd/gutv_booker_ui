"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Clock,
  MessageSquare,
  ChevronLeft,
  CheckCircle,
  XCircle,
  CheckCheck,
} from "lucide-react";
import { eventApi } from "@/lib/eventApi";
import { EventResponseDto } from "@/app/models/event/event";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AdminOnly } from "@/components/AdminOnly";

const statusNames: Record<string, string> = {
  Pending: "Ожидает",
  Cancelled: "Отменено",
  Approved: "Одобрено",
  Completed: "Завершено",
};

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500",
  Cancelled: "bg-red-500",
  Approved: "bg-green-500",
  Completed: "bg-blue-500",
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number.parseInt(params.id as string, 10);

  const [event, setEvent] = useState<EventResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [adminComment, setAdminComment] = useState("");

  useEffect(() => {
    if (Number.isFinite(eventId)) {
      void loadEvent();
    }
  }, [eventId]);

  async function loadEvent() {
    try {
      setLoading(true);
      setError(null);
      const data = await eventApi.get_by_id(eventId);
      setEvent(data);
    } catch (loadError: any) {
      console.error("Ошибка загрузки event заявки:", loadError);
      setError(loadError?.message || "Не удалось загрузить event заявку");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    try {
      setActionLoading(true);
      await eventApi.approve(eventId, adminComment);
      setShowApproveDialog(false);
      setAdminComment("");
      await loadEvent();
    } catch (actionError: any) {
      console.error("Ошибка подтверждения event заявки:", actionError);
      setError(actionError?.message || "Не удалось подтвердить event заявку");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    try {
      setActionLoading(true);
      await eventApi.cancel(eventId, adminComment);
      setShowCancelDialog(false);
      setAdminComment("");
      await loadEvent();
    } catch (actionError: any) {
      console.error("Ошибка отмены event заявки:", actionError);
      setError(actionError?.message || "Не удалось отменить event заявку");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    try {
      setActionLoading(true);
      await eventApi.complete(eventId);
      setShowCompleteDialog(false);
      await loadEvent();
    } catch (actionError: any) {
      console.error("Ошибка завершения event заявки:", actionError);
      setError(actionError?.message || "Не удалось завершить event заявку");
    } finally {
      setActionLoading(false);
    }
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

  if (loading) {
    return (
      <AdminOnly>
        <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p>Загрузка...</p>
              </div>
            </div>
          </div>
        </main>
      </AdminOnly>
    );
  }

  if (error || !event) {
    return (
      <AdminOnly>
        <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="mb-6">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>

            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive mb-1">
                    {error || "Заявка не найдена"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/events")}
                    className="mt-3"
                  >
                    Вернуться к списку
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </AdminOnly>
    );
  }

  return (
    <AdminOnly>
      <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-4xl mx-auto space-y-6">
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
                  {event.reason}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-muted-foreground font-mono">
                    #{event.id}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      statusColors[event.status] || "bg-gray-500",
                    )}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {statusNames[event.status] || event.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {Object.keys(event.warnings).length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
                    Предупреждения
                  </p>
                  <div className="space-y-1">
                    {Object.entries(event.warnings).map(([key, value]) => (
                      <p
                        key={key}
                        className="text-sm text-orange-600 dark:text-orange-400 break-words"
                      >
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
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-lg font-semibold">Заявка</h2>
                  <p className="text-sm text-muted-foreground">Основная информация</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Клиент</p>
                  <p className="font-medium break-words">{event.client}</p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Причина</p>
                  <p className="text-sm break-words whitespace-pre-wrap">{event.reason}</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-lg font-semibold">Время</h2>
                  <p className="text-sm text-muted-foreground">Период проведения</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Создано</p>
                  <p className="text-sm truncate">{formatDateTime(event.creationTime)}</p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Начало</p>
                  <p className="text-sm font-medium truncate">{formatDateTime(event.startTime)}</p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Окончание</p>
                  <p className="text-sm font-medium truncate">{formatDateTime(event.endTime)}</p>
                </div>
              </div>
            </div>
          </div>

          {(event.comment || event.adminComment) && (
            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-lg font-semibold">Комментарии</h2>
                  <p className="text-sm text-muted-foreground">Переписка по заявке</p>
                </div>
              </div>
              <div className="space-y-3">
                {event.comment && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 overflow-hidden">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                      Комментарий пользователя:
                    </p>
                    <p className="text-sm break-words whitespace-pre-wrap">{event.comment}</p>
                  </div>
                )}
                {event.adminComment && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 overflow-hidden">
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">
                      Комментарий администратора:
                    </p>
                    <p className="text-sm break-words whitespace-pre-wrap">{event.adminComment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {event.status === "Pending" && (
            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <h2 className="text-lg font-semibold mb-4">Действия</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => setShowApproveDialog(true)}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">Подтвердить заявку</span>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <XCircle className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">Отменить заявку</span>
                </Button>
              </div>
            </div>
          )}

          {event.status === "Approved" && (
            <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
              <h2 className="text-lg font-semibold mb-4">Действия</h2>
              <Button
                onClick={() => setShowCompleteDialog(true)}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                <CheckCheck className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">Завершить заявку</span>
              </Button>
            </div>
          )}

          <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Подтвердить заявку</DialogTitle>
                <DialogDescription>
                  Добавьте комментарий для пользователя, если он нужен
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
                  {actionLoading ? "Обработка..." : "Подтвердить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Отменить заявку</DialogTitle>
                <DialogDescription>
                  Укажите причину отмены, если хотите пояснить решение
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
                  {actionLoading ? "Обработка..." : "Отменить заявку"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Завершить заявку</DialogTitle>
                <DialogDescription>
                  Подтвердите завершение event. После этого заявка перейдёт в статус завершённой.
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
    </AdminOnly>
  );
}
