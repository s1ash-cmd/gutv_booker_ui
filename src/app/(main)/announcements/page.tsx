"use client";

import { Loader2, Megaphone, Plus, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { type Announcement, announcementApi } from "@/lib/announcementApi";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AnnouncementsPage() {
  const { user, isAuth, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [success, setSuccess] = useState("");
  const submission = useRef<{
    key: string;
    title: string;
    body: string;
  } | null>(null);
  const publishingRef = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    // revision explicitly requests a fresh first page.
    void revision;
    const current = ++generation.current;
    if (authLoading || !isAuth) return;
    let cancelled = false;
    let newestId = 0;
    setLoading(true);
    setError("");
    setHasNew(false);
    void announcementApi.list().then(
      (data) => {
        if (cancelled) return;
        newestId = data[0]?.id ?? 0;
        setItems(data.slice(0, 20));
        setHasMore(data.length > 20);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить объявления",
        );
        setLoading(false);
      },
    );
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void announcementApi.list().then(
        (data) => {
          if (!cancelled && (data[0]?.id ?? 0) > newestId) setHasNew(true);
        },
        () => {},
      );
    }, 30000);
    return () => {
      cancelled = true;
      if (generation.current === current) generation.current++;
      window.clearInterval(timer);
    };
  }, [authLoading, isAuth, revision]);

  async function loadMore() {
    if (loadingMore || !items.length) return;
    const current = generation.current;
    setLoadingMore(true);
    setError("");
    try {
      const data = await announcementApi.list(items[items.length - 1].id);
      if (current !== generation.current) return;
      setItems((previous) => [...previous, ...data.slice(0, 20)]);
      setHasMore(data.length > 20);
    } catch (err) {
      if (current === generation.current)
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить объявления",
        );
    } finally {
      setLoadingMore(false);
    }
  }

  function showPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPublishError("");
    setPreview(true);
  }

  async function publish() {
    if (publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    setPublishError("");
    try {
      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      if (
        !submission.current ||
        submission.current.title !== cleanTitle ||
        submission.current.body !== cleanBody
      ) {
        submission.current = {
          key: crypto.randomUUID(),
          title: cleanTitle,
          body: cleanBody,
        };
      }
      await announcementApi.publish(
        cleanTitle,
        cleanBody,
        submission.current.key,
      );
      submission.current = null;
      setTitle("");
      setBody("");
      setPreview(false);
      setFormOpen(false);
      setSuccess(
        "Объявление опубликовано. Рассылка в Telegram поставлена в очередь.",
      );
      setRevision((value) => value + 1);
    } catch (err) {
      setPublishError(
        err instanceof Error
          ? err.message
          : "Не удалось опубликовать объявление",
      );
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  }

  if (authLoading)
    return (
      <div className="p-8 text-center text-muted-foreground">Загрузка…</div>
    );

  return (
    <main className="container mx-auto w-full max-w-4xl min-w-0 px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Megaphone className="size-4" /> Новости студии
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Объявления</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Важная информация от администрации GUtv.
          </p>
        </div>
        {isAuth && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Обновить объявления"
              disabled={loading}
              onClick={() => setRevision((value) => value + 1)}
            >
              <RefreshCw className="size-4" />
            </Button>
            {user?.role === "Admin" && (
              <Button
                onClick={() => {
                  setFormOpen(true);
                  setSuccess("");
                }}
              >
                <Plus className="size-4" /> Написать объявление
              </Button>
            )}
          </div>
        )}
      </div>

      {!isAuth ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Войдите, чтобы читать объявления студии.
          </p>
          <Button asChild>
            <Link href="/login">Войти</Link>
          </Button>
        </div>
      ) : (
        <>
          {success && (
            <output className="mb-6 block rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              {success}
            </output>
          )}
          {user?.role === "Admin" && formOpen && (
            <section
              aria-label="Новое объявление"
              className="mb-8 rounded-xl border bg-card p-5 md:p-6"
            >
              <h2 className="mb-4 text-lg font-semibold">
                {preview ? "Предпросмотр объявления" : "Новое объявление"}
              </h2>
              {preview ? (
                <div className="space-y-4">
                  <h3 className="wrap-anywhere text-2xl font-bold leading-tight md:text-3xl">
                    {title.trim()}
                  </h3>
                  <p className="whitespace-pre-wrap wrap-anywhere leading-relaxed">
                    {body.trim()}
                  </p>
                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    Объявление появится на сайте и отправится всем участникам с
                    привязанным Telegram, кроме заблокированных.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => void publish()}
                      disabled={publishing}
                    >
                      {publishing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {publishing ? "Публикация…" : "Опубликовать и разослать"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={publishing}
                      onClick={() => setPreview(false)}
                    >
                      Изменить текст
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={showPreview} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="announcement-title">Заголовок</Label>
                    <Input
                      id="announcement-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={100}
                      required
                      placeholder="Например, изменения в расписании студии"
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {title.length}/100
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-body">Текст объявления</Label>
                    <Textarea
                      id="announcement-body"
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      maxLength={3000}
                      required
                      rows={7}
                      placeholder="Что нужно знать участникам?"
                      className="resize-y"
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {body.length}/3000
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Также можно опубликовать через команду /announce в
                    Telegram-боте.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!title.trim() || !body.trim()}
                    >
                      Предпросмотр
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFormOpen(false)}
                    >
                      Отмена
                    </Button>
                  </div>
                </form>
              )}
              {publishError && (
                <p
                  role="alert"
                  className="mt-4 whitespace-pre-wrap text-sm text-destructive"
                >
                  {publishError}
                </p>
              )}
            </section>
          )}

          {hasNew && (
            <Button
              variant="secondary"
              className="mb-6 w-full"
              onClick={() => setRevision((value) => value + 1)}
            >
              Показать новые объявления
            </Button>
          )}
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          {loading ? (
            <output className="block py-12 text-center text-muted-foreground">
              Загрузка объявлений…
            </output>
          ) : (
            <div className="space-y-4">
              {!error && items.length === 0 && (
                <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                  Пока нет объявлений.
                </div>
              )}
              {items.map((item) => (
                <article
                  key={item.id}
                  className="min-w-0 rounded-xl border bg-card p-5 md:p-6"
                >
                  <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <time dateTime={item.createdAt}>
                      {formatDate(item.createdAt)} МСК
                    </time>
                    <span className="wrap-anywhere">{item.authorName}</span>
                  </div>
                  <h2 className="mb-3 wrap-anywhere text-2xl font-bold leading-tight md:text-3xl">
                    {item.title}
                  </h2>
                  <p className="whitespace-pre-wrap wrap-anywhere leading-relaxed">
                    {item.body}
                  </p>
                </article>
              ))}
              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? "Загрузка…" : "Показать ещё"}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
