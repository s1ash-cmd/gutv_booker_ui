"use client";

import { ChevronDown, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { CartEquipmentOption } from "@/app/models/cart/cart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cartApi } from "@/lib/cartApi";
import { getErrorMessage } from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

function bookingPeriod(start: string, end: string) {
  const from = new Date(start);
  const to = new Date(end);
  return Number.isFinite(from.getTime()) &&
    Number.isFinite(to.getTime()) &&
    from < to
    ? { start: from.toISOString(), end: to.toISOString() }
    : { start: null, end: null };
}

export function InventorySelection({
  modelId,
  selectedItemIds,
  startTime,
  endTime,
  editingBookingId,
  disabled,
  onChange,
  presentation = "dropdown",
  onConfirmEmpty,
}: {
  modelId: number;
  selectedItemIds: number[];
  startTime: string;
  endTime: string;
  editingBookingId: number | null;
  disabled: boolean;
  onChange: (ids: number[]) => Promise<void>;
  presentation?: "dropdown" | "list";
  onConfirmEmpty?: () => Promise<void>;
}) {
  const [result, setResult] = useState<{
    key: string;
    options: CartEquipmentOption[];
    error: string | null;
  } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { start, end } = bookingPeriod(startTime, endTime);
  const requestKey = `${modelId}:${start}:${end}:${editingBookingId}:${refresh}`;

  useEffect(() => {
    let active = true;
    void cartApi.get_equipment_options(modelId, start, end).then(
      (options) => {
        if (active) setResult({ key: requestKey, options, error: null });
      },
      (error: unknown) => {
        if (active)
          setResult({
            key: requestKey,
            options: [],
            error: getErrorMessage(error, "Не удалось загрузить номера"),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [modelId, start, end, requestKey]);

  const loaded = result?.key === requestKey;
  const options = loaded ? result.options : [];
  const query = search.trim().toLocaleLowerCase("ru");
  const filtered = options.filter((option) =>
    option.inventoryNumber.toLocaleLowerCase("ru").includes(query),
  );
  const selectable = filtered.filter(
    (option) => option.operable && option.available !== false,
  );
  const allSelected =
    selectable.length > 0 &&
    selectable.every((option) => selectedItemIds.includes(option.id));
  const missingIds =
    loaded && !result.error
      ? selectedItemIds.filter(
          (id) => !options.some((option) => option.id === id),
        )
      : [];
  const hasConflict =
    missingIds.length > 0 ||
    options.some(
      (option) =>
        selectedItemIds.includes(option.id) &&
        (!option.operable || option.available === false),
    );
  const selectedLabels = selectedItemIds
    .slice(0, 2)
    .map(
      (id) =>
        result?.options.find((option) => option.id === id)?.inventoryNumber ??
        null,
    );
  const summary = selectedLabels.some((label) => label === null)
    ? `Выбрано номеров: ${selectedItemIds.length}`
    : selectedLabels.join(", ") +
      (selectedItemIds.length > 2
        ? ` и ещё ${selectedItemIds.length - 2}`
        : "");

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setSearch("");
  }

  async function confirm() {
    if (disabled) return;
    if (selectedItemIds.length === 0 && onConfirmEmpty) await onConfirmEmpty();
    changeOpen(false);
  }

  const panel = (
    <div className="flex min-h-0 flex-col">
      <div className="relative border-b border-border/60">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
        />
        <input
          type="search"
          aria-label="Поиск по инвентарному номеру"
          placeholder="Найти инвентарный номер…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 w-full rounded-t-lg bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-xs">
        <button
          type="button"
          className="font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
          disabled={
            disabled ||
            !loaded ||
            !!result.error ||
            selectable.length === 0 ||
            allSelected
          }
          onClick={() =>
            void onChange([
              ...new Set([
                ...selectedItemIds,
                ...selectable.map((option) => option.id),
              ]),
            ])
          }
        >
          {query ? "Выбрать найденные" : "Выбрать все"}
        </button>
        <div className="flex items-center gap-3">
          {selectedItemIds.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              className="text-muted-foreground hover:text-foreground disabled:opacity-40"
              onClick={() => void onChange([])}
            >
              Очистить
            </button>
          )}
          <button
            type="button"
            aria-label="Обновить доступность"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
            disabled={disabled || !loaded}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-60 min-h-0 overflow-y-auto overscroll-contain p-1">
        {!loaded ? (
          <output className="block px-2 py-5 text-center text-sm text-muted-foreground">
            Загрузка номеров…
          </output>
        ) : result.error ? (
          <p className="px-2 py-3 text-sm text-destructive" role="alert">
            {result.error}
          </p>
        ) : (
          <fieldset disabled={disabled}>
            <legend className="sr-only">
              Выберите экземпляры оборудования
            </legend>
            {filtered.map((option) => {
              const checked = selectedItemIds.includes(option.id);
              const unavailable =
                !option.operable || option.available === false;
              const status = !option.operable
                ? "Неисправен"
                : option.available === false
                  ? "Занят"
                  : option.available === true
                    ? "Свободен"
                    : "Исправен";
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-secondary focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary",
                    checked && "bg-primary/[0.06]",
                    unavailable && !checked && "cursor-not-allowed opacity-45",
                    disabled && "pointer-events-none opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={checked}
                    disabled={!checked && unavailable}
                    aria-label={`${option.inventoryNumber}, ${status}`}
                    onChange={() =>
                      void onChange(
                        checked
                          ? selectedItemIds.filter((id) => id !== option.id)
                          : [...selectedItemIds, option.id],
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 break-all font-mono text-sm">
                    {option.inventoryNumber}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[11px]",
                      unavailable
                        ? checked
                          ? "text-destructive"
                          : "text-muted-foreground"
                        : "text-emerald-700 dark:text-emerald-400",
                    )}
                  >
                    {status}
                  </span>
                </label>
              );
            })}
            {missingIds.map((id) => (
              <label
                key={id}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-destructive"
              >
                <input
                  type="checkbox"
                  checked
                  onChange={() =>
                    void onChange(
                      selectedItemIds.filter((selected) => selected !== id),
                    )
                  }
                />
                Экземпляр недоступен (ID {id}). Снимите выбор.
              </label>
            ))}
            {filtered.length === 0 && missingIds.length === 0 && (
              <p className="px-2 py-5 text-center text-sm text-muted-foreground">
                {query ? "Номер не найден" : "У модели пока нет экземпляров."}
              </p>
            )}
          </fieldset>
        )}
      </div>
      {presentation === "dropdown" && (
        <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            Выбрано: {selectedItemIds.length}
          </span>
          <button
            type="button"
            disabled={disabled}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-40"
            onClick={() => void confirm()}
          >
            {selectedItemIds.length === 0 && onConfirmEmpty
              ? "Удалить из брони"
              : "Готово"}
          </button>
        </div>
      )}
    </div>
  );

  if (presentation === "list")
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        {panel}
      </div>
    );

  return (
    <div>
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Инвентарные номера, выбрано: ${selectedItemIds.length}`}
            className={cn(
              "flex min-h-10 w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60",
              hasConflict ? "border-destructive/70" : "border-border",
            )}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                selectedItemIds.length === 0 && "text-muted-foreground",
              )}
            >
              {summary || "Выберите инвентарные номера"}
            </span>
            {selectedItemIds.length > 0 && (
              <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                {selectedItemIds.length} шт.
              </span>
            )}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        {open && (
          <PopoverContent
            align="start"
            className="flex max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] max-w-[420px] flex-col overflow-hidden rounded-lg p-0"
          >
            {panel}
          </PopoverContent>
        )}
      </Popover>
      {hasConflict && (
        <p className="mt-1.5 text-xs text-destructive">
          Проверьте выбранные номера: есть недоступные экземпляры.
        </p>
      )}
    </div>
  );
}
