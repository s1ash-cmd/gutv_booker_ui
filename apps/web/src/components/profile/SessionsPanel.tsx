"use client";

import { Laptop, LogOut, Smartphone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import {
  ProfileNote,
  ProfileRow,
  ProfileSection,
} from "@/components/profile/ProfileSection";
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
import { getErrorMessage } from "@/lib/userFacingMessages";

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

const sessionPluralRules = new Intl.PluralRules("ru");
const sessionForms: Record<string, string> = {
  one: "активная сессия",
  few: "активные сессии",
  many: "активных сессий",
  other: "активной сессии",
};

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
        setError(getErrorMessage(err, "Не удалось загрузить сессии"));
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
        setError(getErrorMessage(err, "Не удалось завершить сессию"));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const logoutAll = async () => {
    setBusy(true);
    setError(null);
    try {
      await authApi.logoutAll();
      // Another tab signed in again meanwhile; that login stays.
      if (!mounted.current || authApi.readSession().signedIn) return;
      setUser(null);
      window.location.replace("/");
    } catch (err) {
      if (mounted.current)
        setError(getErrorMessage(err, "Не удалось завершить сессии"));
    } finally {
      if (mounted.current) {
        setBusy(false);
        setConfirmAll(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      {error && <ErrorMessage message={error} />}
      <ProfileSection
        title="Устройства"
        footer={
          <>
            <span>
              {loading
                ? ""
                : `${sessions.length} ${sessionForms[sessionPluralRules.select(sessions.length)]}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="-mr-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy || loading}
              onClick={() => setConfirmAll(true)}
            >
              <LogOut className="size-3.5" />
              Выйти везде
            </Button>
          </>
        }
      >
        {loading ? (
          <ProfileNote>
            <output>Загрузка устройств…</output>
          </ProfileNote>
        ) : (
          sessions.map((session) => (
            <ProfileRow
              key={session.id}
              icon={
                /iPhone|iPad|Android/.test(session.userAgent ?? "") ? (
                  <Smartphone />
                ) : (
                  <Laptop />
                )
              }
              label={
                <>
                  {browserLabel(session.userAgent)}
                  {session.isCurrent && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      · это устройство
                    </span>
                  )}
                </>
              }
              value={formatDate(session.lastUsedAt)}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={busy}
                  onClick={() => void revoke(session)}
                >
                  {session.isCurrent ? "Выйти" : "Завершить"}
                </Button>
              }
            />
          ))
        )}
        {!loading && sessions.length === 0 && (
          <ProfileNote>Нет активных сессий</ProfileNote>
        )}
      </ProfileSection>
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
    </div>
  );
}
