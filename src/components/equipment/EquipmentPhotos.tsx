"use client";

import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { EqPhotoDto } from "@/app/models/equipment/equipment";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiResourceUrl } from "@/lib/api";
import { equipmentApi } from "@/lib/equipmentApi";
import { cn } from "@/lib/utils";
import { EquipmentPhotoPicker } from "./EquipmentPhotoPicker";

export function EquipmentPhotos({
  modelId,
  name,
  photos,
  onPhotosChange,
  isAdmin,
}: {
  modelId: number;
  name: string;
  photos: EqPhotoDto[];
  onPhotosChange?: (update: (photos: EqPhotoDto[]) => EqPhotoDto[]) => void;
  isAdmin: boolean;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const touchStart = useRef<number | null>(null);
  const selectedIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === selectedId),
  );
  const selected = photos[selectedIndex];
  const move = (offset: number) =>
    setSelectedId(
      photos[(selectedIndex + offset + photos.length) % photos.length]?.id ??
        null,
    );

  if (!photos.length && !isAdmin) return null;

  return (
    <section className="mt-5 space-y-3" aria-label="Фотографии оборудования">
      {selected && (
        <fieldset
          className="min-w-0 relative overflow-hidden rounded-xl border bg-muted/30"
          aria-roledescription="карусель"
          aria-label={`Фото ${name}`}
        >
          <div
            className="flex aspect-[4/3] max-h-[480px] items-center justify-center"
            onTouchStart={(event) => {
              touchStart.current = event.touches[0].clientX;
            }}
            onTouchEnd={(event) => {
              const start = touchStart.current;
              touchStart.current = null;
              if (start === null || photos.length < 2) return;
              const distance = event.changedTouches[0].clientX - start;
              if (Math.abs(distance) > 50) move(distance < 0 ? 1 : -1);
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: Stored photos are served by the configured API origin. */}
            <img
              key={selected.id}
              src={getApiResourceUrl(selected.url)}
              alt={`${name} — фото ${selectedIndex + 1}`}
              className="h-full w-full object-contain"
            />
          </div>
          {photos.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-sm"
                aria-label="Предыдущее фото"
                onClick={() => move(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-sm"
                aria-label="Следующее фото"
                onClick={() => move(1)}
              >
                <ChevronRight />
              </Button>
              <span
                className="absolute bottom-3 right-3 rounded-full bg-background/90 px-3 py-1 text-xs tabular-nums"
                aria-live="polite"
              >
                {selectedIndex + 1} / {photos.length}
              </span>
            </>
          )}
        </fieldset>
      )}
      {photos.length > 1 && (
        <fieldset
          className="min-w-0 flex gap-2 overflow-x-auto py-1"
          aria-label="Выбрать фото"
        >
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`Показать фото ${index + 1}`}
              aria-pressed={photo.id === selected?.id}
              onClick={() => setSelectedId(photo.id)}
              className={cn(
                "h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-muted/30 p-1 transition-colors",
                photo.id === selected?.id
                  ? "border-primary"
                  : "border-transparent hover:border-border",
              )}
            >
              {/* biome-ignore lint/performance/noImgElement: API photos do not use Next Image's remote host configuration. */}
              <img
                src={getApiResourceUrl(photo.url)}
                alt=""
                loading="lazy"
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </fieldset>
      )}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              setPickerOpen(true);
            }}
            disabled={busy}
          >
            <ImagePlus size={16} />
            Добавить фото
          </Button>
          {selected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null);
                setDeleteOpen(true);
              }}
              disabled={busy}
            >
              <Trash2 size={15} />
              Удалить фото
            </Button>
          )}
          {!selected && (
            <span className="text-xs text-muted-foreground">
              Пока нет фотографий
            </span>
          )}
        </div>
      )}
      {error && <ErrorMessage message={error} />}
      {isAdmin && (
        <EquipmentPhotoPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          modelId={modelId}
          onSaved={(photo) => {
            onPhotosChange?.((current) =>
              [...current, photo].sort(
                (a, b) => a.order - b.order || a.id - b.id,
              ),
            );
            setSelectedId(photo.id);
          }}
        />
      )}
      <Dialog
        open={deleteOpen && isAdmin}
        onOpenChange={(open) => {
          if (!busy) setDeleteOpen(open);
        }}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Удалить фото?</DialogTitle>
            <DialogDescription>
              Фотография будет удалена из галереи «{name}».
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDeleteOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!selected) return;
                setBusy(true);
                setError(null);
                try {
                  await equipmentApi.delete_photo(modelId, selected.id);
                  onPhotosChange?.((current) =>
                    current.filter((photo) => photo.id !== selected.id),
                  );
                  setSelectedId(
                    photos[selectedIndex + 1]?.id ??
                      photos[selectedIndex - 1]?.id ??
                      null,
                  );
                  setDeleteOpen(false);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Не удалось удалить фото",
                  );
                  setDeleteOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Удаление…" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
