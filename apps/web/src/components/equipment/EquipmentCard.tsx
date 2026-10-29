"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  type EqModelResponseDto,
  EquipmentAccess,
  EquipmentCategory,
} from "@/app/models/equipment/equipment";
import { categoryIcons } from "@/components/equipment/categoryIcons";
import { Button } from "@/components/ui/button";
import { getApiResourceUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export const accessOptions: Record<
  EquipmentAccess,
  { label: string; dotClassName: string }
> = {
  [EquipmentAccess.User]: {
    label: "Все пользователи",
    dotClassName: "bg-green-500",
  },
  [EquipmentAccess.Osnova]: { label: "Основа", dotClassName: "bg-yellow-500" },
  [EquipmentAccess.Ronin]: {
    label: "Требуется разрешение",
    dotClassName: "bg-red-500",
  },
};

const categoryHues: Record<EquipmentCategory, number> = {
  [EquipmentCategory.Camera]: 264,
  [EquipmentCategory.Lens]: 300,
  [EquipmentCategory.Card]: 205,
  [EquipmentCategory.Battery]: 145,
  [EquipmentCategory.Charger]: 110,
  [EquipmentCategory.Sound]: 170,
  [EquipmentCategory.Stand]: 40,
  [EquipmentCategory.Light]: 80,
  [EquipmentCategory.Filters]: 335,
  [EquipmentCategory.Other]: 250,
};

type EquipmentCardProps = {
  model: EqModelResponseDto;
  categoryName: string;
  count?: number;
  selectedCount: number;
  actionLabel: string;
  isRemoval: boolean;
  disabled: boolean;
  onAction: () => void;
};

export function EquipmentCard({
  model,
  categoryName,
  count,
  selectedCount,
  actionLabel,
  isRemoval,
  disabled,
  onAction,
}: EquipmentCardProps) {
  const CategoryIcon = categoryIcons[model.category];
  const photo = model.photos?.[0];
  const access = accessOptions[model.access];
  const isSelected = selectedCount > 0;
  const ActionIcon = isRemoval ? Trash2 : isSelected ? Check : Plus;
  const specs = Object.values(model.attributes)
    .slice(0, 2)
    .map(String)
    .join(" · ");

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-border">
      <Link
        href={`/equipment/${model.id}`}
        className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div
          className="equipment-placeholder relative grid aspect-square place-items-center overflow-hidden sm:aspect-4/3"
          style={
            {
              "--equipment-hue": categoryHues[model.category],
            } as CSSProperties
          }
        >
          {photo ? (
            // biome-ignore lint/performance/noImgElement: API photos do not use Next Image's remote host configuration.
            <img
              src={getApiResourceUrl(photo.url)}
              alt={model.name}
              loading="lazy"
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <CategoryIcon
              className="size-[30%] max-h-14 max-w-14"
              strokeWidth={1.2}
              aria-hidden="true"
            />
          )}

          <span
            className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-background/75 p-1.5 text-[11px] backdrop-blur sm:px-2 sm:py-0.5"
            title={access.label}
          >
            <span
              className={cn("size-2 rounded-full", access.dotClassName)}
              aria-hidden="true"
            />
            <span className="sr-only sm:not-sr-only">{access.label}</span>
          </span>

          {isSelected && (
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              {selectedCount}
              <span className="sr-only">в брони</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-0.5 px-3 pt-3 sm:px-3.5">
          <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">
            {categoryName}
          </span>
          <h2 className="line-clamp-2 min-h-[2.5em] text-sm font-bold leading-tight sm:line-clamp-1 sm:min-h-0 sm:text-base">
            {model.name}
          </h2>
          <p className="hidden h-5 truncate text-xs text-muted-foreground sm:block">
            {specs}
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-3 sm:px-3.5 sm:pt-3 sm:pb-3.5">
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {count !== undefined && `${count} шт.`}
        </span>
        <Button
          size="sm"
          variant={isRemoval || isSelected ? "outline" : "default"}
          onClick={onAction}
          disabled={disabled}
          aria-label={`${actionLabel}: ${model.name}`}
          className={cn(
            "size-8 px-0 has-[>svg]:px-0 sm:w-auto sm:px-3 sm:has-[>svg]:px-2.5",
            isSelected &&
              !isRemoval &&
              "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 dark:border-primary/60 dark:bg-primary/25 dark:text-blue-300 dark:hover:bg-primary/35",
            isRemoval &&
              "text-destructive hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          <ActionIcon
            className={cn(
              "size-4 shrink-0",
              !isRemoval && !isSelected && "sm:hidden",
            )}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{actionLabel}</span>
        </Button>
      </div>
    </article>
  );
}
