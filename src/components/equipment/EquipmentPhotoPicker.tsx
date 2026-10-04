"use client";

import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import ImageEditor from "@uppy/image-editor";
import Russian from "@uppy/locales/lib/ru_RU.js";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import type { EqPhotoDto } from "@/app/models/equipment/equipment";
import styles from "@/components/profile/AvatarEditor.module.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { equipmentApi } from "@/lib/equipmentApi";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import "@uppy/image-editor/css/style.min.css";

export function EquipmentPhotoPicker({
  open,
  onOpenChange,
  modelId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: number;
  onSaved: (photo: EqPhotoDto) => void;
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
          <DialogTitle>Фото оборудования</DialogTitle>
          <DialogDescription>
            Выберите фотографию. Можно повернуть её или настроить кадр.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <Picker
            modelId={modelId}
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

function Picker({
  modelId,
  busy,
  setBusy,
  onSaved,
  onClose,
}: {
  modelId: number;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onSaved: (photo: EqPhotoDto) => void;
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
        hideUploadButton: true,
        disableStatusBar: true,
        proudlyDisplayPoweredByUppy: false,
        note: "JPG, PNG или WebP · до 5 МБ",
        locale: {
          strings: {
            dropPasteFiles: "Перетащите фото сюда или %{browseFiles}",
            browseFiles: "выберите файл",
          },
        },
      })
      .use(ImageEditor, {
        quality: 0.85,
        cropperOptions: { viewMode: 1, autoCropArea: 1 },
      });
    uppy.on("file-added", (file) => {
      setCandidate(file.data instanceof Blob ? file.data : null);
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
  return (
    <>
      <div
        ref={target}
        className={styles.picker}
        aria-busy={busy}
        style={busy ? { pointerEvents: "none", opacity: 0.6 } : undefined}
      />
      <p className="text-xs text-muted-foreground">
        Пропорции фото сохраняются. Для изменения кадра нажмите на значок
        карандаша.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Отмена
        </Button>
        <Button
          disabled={!candidate || editing || busy}
          onClick={async () => {
            if (!candidate) return;
            setBusy(true);
            setError(null);
            try {
              const photo = await equipmentApi.upload_photo(modelId, candidate);
              onSaved(photo);
              onClose();
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Не удалось сохранить фото",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Сохранение…" : "Добавить фото"}
        </Button>
      </div>
    </>
  );
}
