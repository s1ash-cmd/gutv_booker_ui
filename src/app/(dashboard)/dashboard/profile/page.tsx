"use client";

import { useEffect, useState } from "react";
import { userApi } from "@/lib/userApi";
import { UserResponseDto, TelegramLinkCodeResponse } from "@/app/models/user";
import { getAvatarUrl } from "@/lib/avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Link as LinkIcon, Unlink, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const roleNames: Record<string, string> = {
  'Admin': 'Администратор',
  'Ronin': 'Пользователь',
  'Osnova': 'Пользователь',
  'User': 'Пользователь',
};

export default function Home() {
  const [userData, setUserData] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [telegramCode, setTelegramCode] = useState<TelegramLinkCodeResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await userApi.get_me();
        setUserData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки данных");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleGenerateTelegramCode = async () => {
    try {
      setActionLoading(true);
      const result = await userApi.generate_telegram_code();
      setTelegramCode(result);
      setShowLinkDialog(true);
    } catch (err: any) {
      setError(err?.message || "Не удалось сгенерировать код");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    try {
      setActionLoading(true);
      await userApi.unlink_telegram();
      setShowUnlinkDialog(false);

      const data = await userApi.get_me();
      setUserData(data);
    } catch (err: any) {
      setError(err?.message || "Не удалось отвязать Telegram");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (telegramCode?.code) {
      await navigator.clipboard.writeText(telegramCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenTelegram = () => {
    if (telegramCode?.deepLink) {
      window.open(telegramCode.deepLink, '_blank');
    }
  };

  const getInitials = (name: string) => {
    return name.substring(0, 1).toUpperCase();
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  if (error || !userData) {
    return (
      <main className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">{error || "Пользователь не найден"}</p>
        </div>
      </main>
    );
  }

  const isAdmin = userData.role === "Admin";
  const hasRoninAccess = userData.role === "Ronin" || userData.role === "Admin";
  const hasTelegram = !!userData.telegramUsername;

  return (
    <main className="p-6">
      <div className="flex justify-center">
        <div className="w-full max-w-xl space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                {isAdmin && (
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur opacity-75"></div>
                )}
                <Avatar className="h-24 w-24 relative border-2 border-background">
                  <AvatarImage
                    src={getAvatarUrl(userData.login, userData.role)}
                    alt={userData.login}
                  />
                  <AvatarFallback
                    className={cn(
                      "text-2xl font-bold",
                      isAdmin && "bg-primary text-primary-foreground"
                    )}
                  >
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">Имя</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{userData.name}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">Логин</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{userData.login}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">Telegram</span>
                {userData.telegramUsername ? (
                  <a
                    href={`https://t.me/${userData.telegramUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-mono font-semibold text-primary hover:underline"
                  >
                    {userData.telegramUsername}
                  </a>
                ) : (
                  <span className="text-base font-mono font-semibold text-muted-foreground">
                    —
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">Роль</span>
                <span className="text-base font-semibold">
                  {roleNames[userData.role] || 'Пользователь'}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground font-medium">Есть разрешение на Ronin</span>
                <span className={cn(
                  "text-base font-semibold",
                  hasRoninAccess ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {hasRoninAccess ? "Да" : "Нет"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Управление аккаунтом</h2>
            <div className="space-y-3">
              {hasTelegram ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowUnlinkDialog(true)}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Отвязать Telegram
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateTelegramCode}
                  disabled={actionLoading}
                  className="w-full"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Генерация кода...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Привязать Telegram
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

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
                <p className="text-sm text-muted-foreground mb-2">Ваш код привязки:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background px-3 py-2 rounded text-lg font-mono font-bold">
                    {telegramCode.code}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
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
                  <li>Откройте бота @{telegramCode.botUsername}</li>
                  <li>Отправьте команду: <code className="bg-background px-1 py-0.5 rounded">/link {telegramCode.code}</code></li>
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
            <Button onClick={handleOpenTelegram}>
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
              Вы уверены, что хотите отвязать свой Telegram аккаунт?
              Уведомления о бронированиях больше не будут приходить.
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
    </main>
  );
}