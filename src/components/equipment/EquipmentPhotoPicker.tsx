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
            Выберите одну или несколько фотографий. Каждую можно повернуть или
            обрезать.
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
  const uppyRef = useRef<Uppy | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [progress, setProgress] = useState({ saved: 0, total: 0 });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!target.current) return;
    setFileCount(0);
    setEditing(false);
    const uppy = new Uppy({
      locale: Russian,
      restrictions: {
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
            browseFiles: "выберите файлы",
          },
        },
      })
      .use(ImageEditor, {
        quality: 0.85,
        cropperOptions: { viewMode: 1, autoCropArea: 1 },
      });
    uppyRef.current = uppy;
    const updateFileCount = () => setFileCount(uppy.getFiles().length);
    uppy.on("file-added", () => {
      updateFileCount();
      setError(null);
    });
    uppy.on("file-removed", updateFileCount);
    uppy.on("file-editor:start", () => setEditing(true));
    uppy.on("file-editor:complete", () => setEditing(false));
    uppy.on("file-editor:cancel", () => setEditing(false));
    return () => {
      uppyRef.current = null;
      uppy.destroy();
    };
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
          disabled={!fileCount || editing || busy}
          onClick={async () => {
            const uppy = uppyRef.current;
            const files = uppy?.getFiles();
            if (!uppy || !files?.length) return;
            setProgress({ saved: 0, total: files.length });
            setBusy(true);
            setError(null);
            try {
              for (const [index, file] of files.entries()) {
                if (!(file.data instanceof Blob)) {
                  throw new Error("Не удалось прочитать фото");
                }
                const photo = await equipmentApi.upload_photo(
                  modelId,
                  file.data,
                );
                onSaved(photo);
                uppy.removeFile(file.id);
                setProgress({ saved: index + 1, total: files.length });
              }
              onClose();
            } catch (err) {
              setError(
                err instanceof Error
                  ? `${err.message}. Оставшиеся фото можно загрузить повторно.`
                  : "Не удалось сохранить фото. Оставшиеся фото можно загрузить повторно.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? `Сохранение ${progress.saved} / ${progress.total}…`
            : fileCount > 1
              ? `Добавить фото (${fileCount})`
              : "Добавить фото"}
        </Button>
      </div>
    </>
  );
}
