"use client";

import {
  ChevronDown,
  Laptop,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/authApi";
import { sessionApi, type UserSession } from "@/lib/sessionApi";
import styles from "./ProfileLayout.module.css";

function browserLabel(agent: string | null) {
  if (!agent) return "Неизвестный браузер";
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /OPR\//.test(agent)
      ? "Opera"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /(?:Chrome|CriOS)\//.test(agent)
          ? "Chrome"
          : /Safari\//.test(agent)
            ? "Safari"
            : "Браузер";
  const device = /iPhone|iPad/.test(agent)
    ? "iOS"
    : /Android/.test(agent)
      ? "Android"
      : /Windows/.test(agent)
        ? "Windows"
        : /Macintosh|Mac OS/.test(agent)
          ? "macOS"
          : /Linux/.test(agent)
            ? "Linux"
            : null;
  return device ? `${browser} · ${device}` : browser;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function SessionsPanel() {
  const { setUser, logout } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const mounted = useRef(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      const result = await sessionApi.list();
      if (mounted.current && generation.current === request) {
        setSessions(result);
        setError(null);
      }
    } catch (err) {
      if (mounted.current && generation.current === request) {
        setError(
          err instanceof Error ? err.message : "Не удалось загрузить сессии",
        );
      }
    } finally {
      if (mounted.current && generation.current === request) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      generation.current += 1;
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const revoke = async (session: UserSession) => {
    if (session.isCurrent) {
      await logout();
      return;
    }
    setBusy(true);
    setError(null);
    // Invalidate any list request started before the revocation.
    generation.current += 1;
    try {
      await sessionApi.revoke(session.id);
      if (mounted.current) await load();
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error ? err.message : "Не удалось завершить сессию",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const logoutAll = async () => {
    setBusy(true);
    setError(null);
    try {
      await authApi.logoutAll();
      if (!mounted.current || localStorage.getItem("access_token")) return;
      setUser(null);
      window.location.replace("/");
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error ? err.message : "Не удалось завершить сессии",
        );
    } finally {
      if (mounted.current) {
        setBusy(false);
        setConfirmAll(false);
      }
    }
  };

  return (
    <section className={styles.panel} aria-label="Активные сессии">
      <div className={styles.sectionTitle}>
        <h2>
          Ваши устройства{" "}
          {!loading && <span className={styles.count}>{sessions.length}</span>}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void load()}
          disabled={loading || busy}
          aria-label="Обновить устройства"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : styles.secondary}
          />
        </Button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {loading ? (
        <output className={styles.secondary}>Загрузка устройств…</output>
      ) : (
        <ul>
          {sessions.map((session) => (
            <li key={session.id} className={styles.deviceRow}>
              <div className={styles.deviceIcon}>
                {/iPhone|iPad|Android/.test(session.userAgent ?? "") ? (
                  <Smartphone size={22} />
                ) : (
                  <Laptop size={22} />
                )}
              </div>
              <div className={styles.grow}>
                <div className={styles.deviceHeading}>
                  <span className={styles.itemTitle}>
                    {browserLabel(session.userAgent)}
                  </span>
                  {session.isCurrent && (
                    <span className={styles.current}>Текущая сессия</span>
                  )}
                </div>
                <p className={styles.secondary}>
                  Обновлена {formatDate(session.lastUsedAt)}
                </p>
                <details className={styles.sessionDetails}>
                  <summary>
                    Подробнее <ChevronDown size={12} />
                  </summary>
                  <p>
                    Вход: {formatDate(session.createdAt)}
                    <br />
                    Действует до: {formatDate(session.expiresAt)}
                  </p>
                </details>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void revoke(session)}
              >
                {session.isCurrent ? "Выйти" : "Завершить"}
              </Button>
            </li>
          ))}
          {sessions.length === 0 && (
            <li className={styles.empty}>Нет активных сессий</li>
          )}
        </ul>
      )}
      <div className={styles.sessionFooter}>
        <span className={styles.secondary}>
          <ShieldCheck size={14} /> Доступен вход с нескольких устройств
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy || loading}
          onClick={() => setConfirmAll(true)}
        >
          Выйти на всех устройствах
        </Button>
      </div>
      <Dialog
        open={confirmAll}
        onOpenChange={(open) => {
          if (!busy) setConfirmAll(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выйти на всех устройствах?</DialogTitle>
            <DialogDescription>
              Все текущие сессии, включая эту, будут завершены. Для доступа
              потребуется снова войти.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmAll(false)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void logoutAll()}
            >
              {busy ? "Завершение…" : "Выйти на всех устройствах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
