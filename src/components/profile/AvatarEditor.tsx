"use client";

import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import ImageEditor from "@uppy/image-editor";
import Russian from "@uppy/locales/lib/ru_RU.js";
import { Camera, Shuffle, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAvatarUrl } from "@/lib/avatar";
import { userApi } from "@/lib/userApi";
import styles from "./AvatarEditor.module.css";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import "@uppy/image-editor/css/style.min.css";

export function AvatarEditor({
  user,
  open,
  onOpenChange,
  onSaved,
}: {
  user: UserResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: UserResponseDto) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent
        className={styles.dialog}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Ваш аватар</DialogTitle>
          <DialogDescription>
            Выберите фото и настройте кадр или оставьте робота.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PhotoPicker
            user={user}
            busy={busy}
            setBusy={setBusy}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PhotoPicker({
  user,
  busy,
  setBusy,
  onSaved,
  onClose,
}: {
  user: UserResponseDto;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onSaved: (user: UserResponseDto) => void;
  onClose: () => void;
}) {
  const target = useRef<HTMLDivElement>(null);
  const [candidate, setCandidate] = useState<Blob | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!target.current) return;
    setCandidate(null);
    setEditing(false);
    const uppy = new Uppy({
      locale: Russian,
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize: 5 * 1024 * 1024,
        allowedFileTypes: ["image/jpeg", "image/png", "image/webp"],
      },
    })
      .use(Dashboard, {
        target: target.current,
        inline: true,
        width: "100%",
        height: 330,
        theme: resolvedTheme === "dark" ? "dark" : "light",
        autoOpen: "imageEditor",
        hideUploadButton: true,
        disableStatusBar: true,
        proudlyDisplayPoweredByUppy: false,
        note: "JPG, PNG или WebP · до 5 МБ",
        locale: {
          strings: {
            dropPasteFiles: "Перетащите фото сюда или %{browseFiles}",
            browseFiles: "выберите файл",
            editing: "Выберите кадр",
            saveChanges: "Готово",
            save: "Готово",
          },
        },
      })
      .use(ImageEditor, {
        quality: 0.85,
        cropperOptions: {
          aspectRatio: 1,
          initialAspectRatio: 1,
          viewMode: 1,
          autoCropArea: 0.85,
          croppedCanvasOptions: { width: 512, height: 512 },
        },
        actions: {
          revert: true,
          rotate: true,
          granularRotate: false,
          flip: false,
          zoomIn: true,
          zoomOut: true,
          cropSquare: false,
          cropWidescreen: false,
          cropWidescreenVertical: false,
        },
      });
    uppy.on("file-added", () => {
      setCandidate(null);
      setError(null);
    });
    uppy.on("file-removed", () => {
      setCandidate(null);
      setEditing(false);
    });
    uppy.on("file-editor:start", () => setEditing(true));
    uppy.on("file-editor:complete", (file) => {
      setCandidate(file.data instanceof Blob ? file.data : null);
      setEditing(false);
    });
    uppy.on("file-editor:cancel", () => setEditing(false));
    return () => uppy.destroy();
  }, [resolvedTheme]);

  const save = async (
    operation: () => Promise<UserResponseDto>,
    close = false,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await operation();
      onSaved(updated);
      if (close) onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить аватар",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={styles.current}>
        <Avatar userRole={user.role} className={styles.avatar}>
          <AvatarImage
            src={getAvatarUrl(
              user.login,
              user.role,
              user.avatarSeed,
              user.avatarUrl,
            )}
            alt="Текущий аватар"
          />
          <AvatarFallback>
            {user.name.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={styles.description}>
          <strong>{user.avatarUrl ? "Ваше фото" : "Ваш робот"}</strong>
          <p>
            {user.avatarUrl
              ? "Можно заменить фото или вернуться к роботу."
              : "Робот используется, пока вы не выберете фото."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() =>
            void save(
              user.avatarUrl
                ? userApi.remove_avatar
                : userApi.regenerate_avatar,
            )
          }
        >
          {user.avatarUrl ? <Trash2 size={15} /> : <Shuffle size={15} />}
          {user.avatarUrl ? "Удалить фото" : "Другой робот"}
        </Button>
      </div>
      <div
        className={styles.picker}
        ref={target}
        style={busy ? { pointerEvents: "none", opacity: 0.6 } : undefined}
        aria-busy={busy}
      />
      <p className={styles.hint} aria-live="polite">
        <Camera size={15} />
        {editing
          ? "Подвиньте фото и настройте масштаб. Затем нажмите «Готово»."
          : candidate
            ? "Кадр готов. Примените фото, чтобы обновить аватар."
            : "Выберите фото — затем сможете настроить кадр."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Закрыть
        </Button>
        <Button
          disabled={!candidate || editing || busy}
          onClick={() => {
            if (candidate)
              void save(() => userApi.upload_avatar(candidate), true);
          }}
        >
          {busy ? "Сохранение…" : "Применить фото"}
        </Button>
      </div>
    </>
  );
}
