"use client";

import { CalendarPlus, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { eventApi } from "@/lib/eventApi";

export default function EventPage() {
  const router = useRouter();
  const [client, setClient] = useState("");
  const [reason, setReason] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function convertToISO(datetimeLocal: string) {
    return new Date(datetimeLocal).toISOString();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!client.trim() || !reason.trim() || !startTime || !endTime) {
      setError("Заполните клиента, причину и даты события");
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setError("Дата окончания должна быть позже даты начала");
      return;
    }

    try {
      setLoading(true);
      const event = await eventApi.create_event({
        client: client.trim(),
        reason: reason.trim(),
        startTime: convertToISO(startTime),
        endTime: convertToISO(endTime),
        comment: comment.trim() || null,
      });

      setSuccessMessage(
        `Заявка на event #${event.id} создана. Статус: ${event.status}.`,
      );
      setClient("");
      setReason("");
      setStartTime("");
      setEndTime("");
      setComment("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось создать event",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Бронирование event</h1>
            <p className="text-sm text-muted-foreground">
              Доступно всем пользователям, даже без входа в аккаунт
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-sm text-green-700 bg-green-500/10 p-3 rounded-md border border-green-500/20 dark:text-green-300">
              {successMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="client">Клиент</Label>
            <Input
              id="client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Название клиента или проекта"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Причина / описание</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Что это за съемка или event"
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Начало</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Окончание</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Дополнительные детали"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={loading}>
              <CalendarPlus className="w-4 h-4 mr-2" />
              {loading ? "Отправка..." : "Забронировать event"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
              disabled={loading}
            >
              Вернуться к каталогу
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
