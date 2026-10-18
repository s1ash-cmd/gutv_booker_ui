"use client";

import {
  ArrowUpRight,
  CheckCircle,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  TelegramLinkCodeResponse,
  UserResponseDto,
} from "@/app/models/user/user";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AvatarEditor } from "@/components/profile/AvatarEditor";
import { ProfileCard } from "@/components/profile/ProfileCard";
import styles from "@/components/profile/ProfileLayout.module.css";
import { SessionsPanel } from "@/components/profile/SessionsPanel";
import { TelegramPanel } from "@/components/profile/TelegramPanel";
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
import { userApi } from "@/lib/userApi";
import { getErrorMessage } from "@/lib/userFacingMessages";

export default function ProfilePage() {
  const { setUser } = useAuth();
  const [userData, setUserData] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [telegramCode, setTelegramCode] =
    useState<TelegramLinkCodeResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const requestVersion = useRef(0);

  const updateUser = (data: UserResponseDto) => {
    requestVersion.current += 1;
    setUserData(data);
    setUser({
      id: String(data.id),
      login: data.login,
      name: data.name,
      role: data.role,
      isTelegramLinked: data.isTelegramLinked,
      avatarSeed: data.avatarSeed,
      avatarUrl: data.avatarUrl,
    });
  };

  useEffect(() => {
    let active = true;
    const fetchUser = async () => {
      const version = ++requestVersion.current;
      const isCurrent = () => active && requestVersion.current === version;
      try {
        const data = await userApi.get_me();
        if (isCurrent()) {
          setUserData(data);
          setError(null);
          setUser({
            id: String(data.id),
            login: data.login,
            name: data.name,
            role: data.role,
            isTelegramLinked: data.isTelegramLinked,
            avatarSeed: data.avatarSeed,
            avatarUrl: data.avatarUrl,
          });
        }
      } catch (err) {
        if (isCurrent())
          setError(getErrorMessage(err, "Ошибка загрузки данных"));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };
    void fetchUser();
    window.addEventListener("focus", fetchUser);
    return () => {
      active = false;
      window.removeEventListener("focus", fetchUser);
    };
  }, [setUser]);

  const handleGenerateTelegramCode = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const result = await userApi.generate_telegram_code();
      setTelegramCode(result);
      setShowLinkDialog(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Не удалось сгенерировать код"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await userApi.unlink_telegram();
      setShowUnlinkDialog(false);

      const data = await userApi.get_me();
      updateUser(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Не удалось отвязать Telegram"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (telegramCode?.code) {
      try {
        await navigator.clipboard.writeText(telegramCode.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError("Не удалось скопировать код. Скопируйте его вручную.");
      }
    }
  };

  const handleOpenTelegram = () => {
    if (telegramCode?.deepLink) {
      window.open(telegramCode.deepLink, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <ErrorMessage message={error || "Пользователь не найден"} />
      </div>
    );
  }

  return (
    <div
      className={`${styles.page} pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8`}
    >
      <div className={styles.pageTop}>
        <span className={styles.eyebrow}>Личный кабинет / Профиль</span>
        <Link href="/dashboard/bookings/my" className={styles.simpleLink}>
          Мои бронирования <ArrowUpRight size={15} />
        </Link>
      </div>
      {error && <ErrorMessage message={error} className="mb-4" />}
      <div className={styles.grid}>
        <ProfileCard
          user={userData}
          onAvatarChange={() => setShowAvatarDialog(true)}
        />
        <div className={styles.panels}>
          <TelegramPanel
            user={userData}
            ownProfile
            action={
              userData.isTelegramLinked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => setShowUnlinkDialog(true)}
                >
                  <Unlink size={14} /> Отвязать
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleGenerateTelegramCode}
                >
                  <LinkIcon size={14} />{" "}
                  {actionLoading ? "Генерация кода…" : "Подключить"}
                </Button>
              )
            }
          />
          <SessionsPanel />
        </div>
      </div>
      <AvatarEditor
        user={userData}
        open={showAvatarDialog}
        onOpenChange={setShowAvatarDialog}
        onSaved={updateUser}
      />

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Привязка Telegram</DialogTitle>
            <DialogDescription>
              Следуйте инструкциям ниже для привязки вашего Telegram аккаунта
            </DialogDescription>
          </DialogHeader>

          {telegramCode && (
            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Ваш код привязки:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background px-3 py-2 rounded text-lg font-mono font-bold">
                    {telegramCode.code}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                    aria-label="Скопировать код привязки"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Код действителен: {telegramCode.expiresIn}
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Инструкция:</p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  {telegramCode.botUsername && (
                    <li>Откройте бота @{telegramCode.botUsername}</li>
                  )}
                  <li>
                    Отправьте команду:{" "}
                    <code className="bg-background px-1 py-0.5 rounded">
                      /link {telegramCode.code}
                    </code>
                  </li>
                  <li>Или нажмите кнопку ниже для автоматического открытия</li>
                </ol>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkDialog(false);
                setTelegramCode(null);
              }}
            >
              Закрыть
            </Button>
            <Button
              onClick={handleOpenTelegram}
              disabled={!telegramCode?.deepLink}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Открыть в Telegram
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отвязать Telegram?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите отвязать свой Telegram аккаунт? Уведомления
              о бронированиях больше не будут приходить.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnlinkDialog(false)}
              disabled={actionLoading}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlinkTelegram}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Отвязка...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-2" />
                  Отвязать
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
