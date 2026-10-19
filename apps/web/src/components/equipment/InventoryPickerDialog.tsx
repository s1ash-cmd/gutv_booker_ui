"use client";

import { useState } from "react";
import type { EqModelResponseDto } from "@/app/models/equipment/equipment";
import { InventorySelection } from "@/components/equipment/InventorySelection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/contexts/CartContext";
import { getErrorMessage } from "@/lib/userFacingMessages";

export function InventoryPickerDialog({
  model,
  onClose,
}: {
  model: EqModelResponseDto;
  onClose: () => void;
}) {
  const {
    cart,
    cartDraft,
    editingBookingId,
    isCartUpdating,
    setItemSelection,
    updateQuantity,
  } = useCart();
  const [selectedIds, setSelectedIds] = useState(() => [
    ...(cart[model.id]?.selectedItemIds ?? []),
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving || isCartUpdating) return;
    setSaving(true);
    setError(null);
    try {
      if (selectedIds.length > 0) {
        await setItemSelection(model.id, selectedIds);
      } else if (cart[model.id]) {
        await updateQuantity(model.id, 0);
      }
      onClose();
    } catch (error) {
      setError(getErrorMessage(error, "Не удалось сохранить выбор"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="gap-6 rounded-2xl p-5 sm:max-w-[560px] sm:p-6">
        <DialogHeader className="gap-1.5 pr-6 text-left">
          <DialogTitle className="text-xl font-semibold">
            {model.name}
          </DialogTitle>
          <DialogDescription>
            Отметьте один или несколько номеров.
          </DialogDescription>
        </DialogHeader>
        <InventorySelection
          presentation="list"
          modelId={model.id}
          selectedItemIds={selectedIds}
          startTime={cartDraft.startTime}
          endTime={cartDraft.endTime}
          editingBookingId={editingBookingId}
          disabled={saving || isCartUpdating}
          onChange={async (ids) => {
            setSelectedIds(ids);
            setError(null);
          }}
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="flex-row items-center justify-between gap-3 border-t border-border/60 pt-4 sm:justify-between">
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            Выбрано:{" "}
            <strong className="font-semibold text-foreground">
              {selectedIds.length}
            </strong>
          </span>
          <Button
            onClick={() => void save()}
            disabled={saving || isCartUpdating}
            variant={
              selectedIds.length === 0 && cart[model.id]
                ? "destructive"
                : "default"
            }
            className="shrink-0"
          >
            {saving
              ? "Сохранение…"
              : selectedIds.length === 0
                ? cart[model.id]
                  ? "Удалить из брони"
                  : "Закрыть"
                : cart[model.id]
                  ? "Сохранить выбор"
                  : "Добавить выбранные"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
