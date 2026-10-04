"use client";

import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import ImageEditor from "@uppy/image-editor";
import Russian from "@uppy/locales/lib/ru_RU.js";
import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import type { EqPhotoDto } from "@/app/models/equipment/equipment";
import { ErrorMessage } from "@/components/ErrorMessage";
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
  const [files, setFiles] = useState<ReturnType<Uppy["getFiles"]>>([]);
  const fileCount = files.length;
  const [progress, setProgress] = useState({ saved: 0, total: 0 });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!target.current) return;
    setFiles([]);
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
    const updateFiles = () => {
      const next = uppy.getFiles();
      setFiles((current) => {
        const ordered = current.flatMap((file) => {
          const updated = next.find((candidate) => candidate.id === file.id);
          return updated ? [updated] : [];
        });
        return [
          ...ordered,
          ...next.filter((file) => !current.some((old) => old.id === file.id)),
        ];
      });
    };
    uppy.on("file-added", () => {
      updateFiles();
      setError(null);
    });
    uppy.on("file-removed", updateFiles);
    uppy.on("thumbnail:generated", updateFiles);
    uppy.on("file-editor:start", () => setEditing(true));
    uppy.on("file-editor:complete", () => {
      updateFiles();
      setEditing(false);
    });
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
      {fileCount > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Перетащите миниатюры, чтобы задать порядок добавления фото в
            галерею.
          </p>
          <Reorder.Group
            axis="x"
            values={files}
            onReorder={setFiles}
            className="flex gap-2 overflow-x-auto p-1"
            aria-label="Порядок загрузки фотографий"
          >
            {files.map((file, index) => (
              <Reorder.Item
                key={file.id}
                value={file}
                dragListener={!busy && !editing}
                tabIndex={busy || editing ? -1 : 0}
                aria-label={`Фото ${index + 1}: ${file.name}. Для перемещения используйте стрелки влево и вправо.`}
                onKeyDown={(event) => {
                  if (busy || editing) return;
                  const offset =
                    event.key === "ArrowLeft"
                      ? -1
                      : event.key === "ArrowRight"
                        ? 1
                        : 0;
                  const destination = index + offset;
                  if (!offset || destination < 0 || destination >= files.length)
                    return;
                  event.preventDefault();
                  const reordered = [...files];
                  reordered.splice(
                    destination,
                    0,
                    reordered.splice(index, 1)[0],
                  );
                  setFiles(reordered);
                }}
                className="relative w-24 shrink-0 cursor-grab rounded-lg border bg-card p-1 focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
                style={{ touchAction: "pan-y" }}
              >
                {file.preview ? (
                  // biome-ignore lint/performance/noImgElement: Uppy generates local image previews.
                  <img
                    src={file.preview}
                    alt=""
                    draggable={false}
                    className="h-16 w-full rounded object-cover"
                  />
                ) : (
                  <div className="h-16 rounded bg-muted" />
                )}
                <span className="mt-1 flex items-center gap-1 text-xs">
                  <GripVertical className="size-3 shrink-0" />
                  <span className="truncate">
                    {index + 1}. {file.name}
                  </span>
                </span>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Пропорции фото сохраняются. Для изменения кадра нажмите на значок
        карандаша.
      </p>
      {error && <ErrorMessage message={error} />}
      <div className={styles.footer}>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Отмена
        </Button>
        <Button
          disabled={!fileCount || editing || busy}
          onClick={async () => {
            const uppy = uppyRef.current;
            const orderedFiles = files.map((file) => uppy?.getFile(file.id));
            if (!uppy || !orderedFiles.length) return;
            setProgress({ saved: 0, total: files.length });
            setBusy(true);
            setError(null);
            try {
              for (const [index, file] of orderedFiles.entries()) {
                if (!file || !(file.data instanceof Blob)) {
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
