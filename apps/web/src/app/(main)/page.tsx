"use client";

import {
  ArrowRight,
  ArrowUpDown,
  LayoutGrid,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type EqModelResponseDto,
  EquipmentAccess,
  EquipmentCategory,
} from "@/app/models/equipment/equipment";
import { ErrorMessage } from "@/components/ErrorMessage";
import { categoryIcons } from "@/components/equipment/categoryIcons";
import {
  accessOptions,
  EquipmentCard,
} from "@/components/equipment/EquipmentCard";
import { InventoryPickerDialog } from "@/components/equipment/InventoryPickerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useEquipmentBooking } from "@/hooks/use-equipment-booking";
import { equipmentApi } from "@/lib/equipmentApi";
import { canBookEquipment } from "@/lib/roles";
import { getErrorMessage } from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

type SortOrder = "nameAsc" | "nameDesc";
type CategoryFilter = EquipmentCategory | "all";

const categoryNames: Record<EquipmentCategory, string> = {
  [EquipmentCategory.Camera]: "Камера",
  [EquipmentCategory.Lens]: "Объектив",
  [EquipmentCategory.Card]: "Карта памяти",
  [EquipmentCategory.Battery]: "Аккумулятор",
  [EquipmentCategory.Charger]: "Зарядное устройство",
  [EquipmentCategory.Sound]: "Звук",
  [EquipmentCategory.Stand]: "Штативы и стойки",
  [EquipmentCategory.Light]: "Свет",
  [EquipmentCategory.Filters]: "Фильтры и переходники",
  [EquipmentCategory.Other]: "Прочее",
};

const categoryGroupNames: Record<EquipmentCategory, string> = {
  [EquipmentCategory.Camera]: "Камеры",
  [EquipmentCategory.Lens]: "Объективы",
  [EquipmentCategory.Card]: "Карты памяти",
  [EquipmentCategory.Battery]: "Аккумуляторы",
  [EquipmentCategory.Charger]: "Зарядки",
  [EquipmentCategory.Sound]: "Звук",
  [EquipmentCategory.Stand]: "Штативы и стойки",
  [EquipmentCategory.Light]: "Свет",
  [EquipmentCategory.Filters]: "Фильтры",
  [EquipmentCategory.Other]: "Прочее",
};

const categories = Object.keys(categoryNames).map(
  Number,
) as EquipmentCategory[];

const sortNames: Record<SortOrder, string> = {
  nameAsc: "По названию: А–Я",
  nameDesc: "По названию: Я–А",
};

const pluralRules = new Intl.PluralRules("ru");

function plural(count: number, forms: Record<string, string>) {
  return `${count} ${forms[pluralRules.select(count)] ?? forms.other}`;
}

const modelForms = {
  one: "модель",
  few: "модели",
  many: "моделей",
  other: "модели",
};
const itemForms = {
  one: "экземпляр",
  few: "экземпляра",
  many: "экземпляров",
  other: "экземпляра",
};

function isNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;

  return (
    message.includes("не найдено") ||
    message.includes("не найден") ||
    status === 404 ||
    message.includes("not found")
  );
}

function AccessSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-accent/60"
    >
      <span
        className={cn(
          "relative h-[18px] w-8 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3.5 rounded-full transition-all",
            checked
              ? "left-4 bg-primary-foreground"
              : "left-0.5 bg-muted-foreground",
          )}
        />
      </span>
      Доступные мне
    </button>
  );
}

export default function HomePage() {
  const booking = useEquipmentBooking();
  const { user, isAuth, isLoading: isAuthLoading } = useAuth();
  const { cart, getTotalItems } = useCart();
  const canUseBooking = canBookEquipment(user?.role);
  const canFilterAvailable = isAuth && canUseBooking;

  const [models, setModels] = useState<EqModelResponseDto[]>([]);
  const [availableIds, setAvailableIds] = useState<Set<number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("nameAsc");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const didInitAvailabilityFilterRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthLoading || didInitAvailabilityFilterRef.current) return;
    if (canFilterAvailable) setOnlyAvailable(true);
    didInitAvailabilityFilterRef.current = true;
  }, [isAuthLoading, canFilterAvailable]);

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setModels(await equipmentApi.get_all_models());
    } catch (err: unknown) {
      if (isNotFoundError(err)) {
        setModels([]);
      } else {
        console.error("Ошибка загрузки оборудования:", err);
        setError(
          getErrorMessage(
            err,
            "Не удалось загрузить оборудование. Попробуйте позже.",
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const useAvailability = onlyAvailable && canFilterAvailable;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey restarts the request after an error.
  useEffect(() => {
    if (!useAvailability || availableIds) return;
    let active = true;
    equipmentApi
      .available_models_to_me()
      .then(
        (available) => new Set(available.map((model) => model.id)),
        (err: unknown) => {
          if (isNotFoundError(err)) return new Set<number>();
          throw err;
        },
      )
      .then(
        (ids) => {
          if (active) setAvailableIds(ids);
        },
        (err: unknown) => {
          if (!active) return;
          console.error("Ошибка загрузки доступного оборудования:", err);
          setError(
            getErrorMessage(err, "Не удалось проверить доступ к оборудованию."),
          );
        },
      );
    return () => {
      active = false;
    };
  }, [useAvailability, availableIds, reloadKey]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        target?.closest("input, textarea, select, [contenteditable='true']")
      )
        return;
      event.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const query = searchQuery.trim().toLocaleLowerCase("ru");

  const matchingModels = useMemo(
    () =>
      models.filter(
        (model) =>
          (!query || model.name.toLocaleLowerCase("ru").includes(query)) &&
          (!useAvailability || availableIds?.has(model.id)),
      ),
    [models, query, useAvailability, availableIds],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<EquipmentCategory, number>();
    for (const model of matchingModels)
      counts.set(model.category, (counts.get(model.category) ?? 0) + 1);
    return counts;
  }, [matchingModels]);

  const visibleModels = useMemo(
    () =>
      matchingModels
        .filter(
          (model) =>
            selectedCategory === "all" || model.category === selectedCategory,
        )
        .sort((left, right) => {
          const result = left.name.localeCompare(right.name, "ru", {
            sensitivity: "base",
          });
          return sortOrder === "nameAsc" ? result : -result;
        }),
    [matchingModels, selectedCategory, sortOrder],
  );

  const hasActiveFilters =
    Boolean(query) ||
    selectedCategory !== "all" ||
    onlyAvailable ||
    sortOrder !== "nameAsc";
  const sheetFilterCount =
    Number(useAvailability) + Number(sortOrder !== "nameAsc");
  const isBusy = loading || (useAvailability && !availableIds);
  const totalItems = canUseBooking ? getTotalItems() : 0;
  const cartModelCount = Object.values(cart).filter(
    (entry) => entry.selectedItemIds.length > 0,
  ).length;

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategory("all");
    setOnlyAvailable(false);
    setSortOrder("nameAsc");
  }

  const categoryOptions: {
    value: CategoryFilter;
    label: string;
    count: number;
    Icon: typeof LayoutGrid;
  }[] = [
    {
      value: "all",
      label: "Все",
      count: matchingModels.length,
      Icon: LayoutGrid,
    },
    ...categories.map((category) => ({
      value: category,
      label: categoryGroupNames[category],
      count: categoryCounts.get(category) ?? 0,
      Icon: categoryIcons[category],
    })),
  ];

  const sortSelect = (
    <Select
      value={sortOrder}
      onValueChange={(value) => setSortOrder(value as SortOrder)}
    >
      <SelectTrigger className="w-[210px] shrink-0 data-[size=default]:h-10">
        <ArrowUpDown className="size-4" aria-hidden="true" />
        <SelectValue placeholder="Сортировка" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(sortNames) as SortOrder[]).map((order) => (
          <SelectItem key={order} value={order}>
            {sortNames[order]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8">
      <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav
            aria-label="Категории"
            className="sticky top-20 flex flex-col gap-0.5"
          >
            <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Категории
            </p>
            {categoryOptions.map(({ value, label, count, Icon }) => {
              const active = selectedCategory === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedCategory(value)}
                  disabled={count === 0 && !active}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
                    active && "bg-accent text-foreground",
                  )}
                >
                  <Icon
                    className={cn("size-4 shrink-0", active && "text-primary")}
                    aria-hidden="true"
                  />
                  <span className="truncate">{label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}

            {canFilterAvailable && (
              <>
                <div className="mx-2.5 my-3 h-px bg-border" />
                <AccessSwitch
                  checked={onlyAvailable}
                  onChange={setOnlyAvailable}
                />
              </>
            )}

            <div className="mx-2.5 my-3 h-px bg-border" />
            <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Уровень доступа
            </p>
            <ul className="flex flex-col gap-2 px-2.5">
              {Object.values(EquipmentAccess)
                .filter((value): value is EquipmentAccess =>
                  Number.isInteger(value),
                )
                .map((value) => (
                  <li
                    key={value}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        accessOptions[value].dotClassName,
                      )}
                      aria-hidden="true"
                    />
                    {accessOptions[value].label}
                  </li>
                ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Search
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                placeholder="Поиск оборудования…"
                aria-label="Поиск оборудования"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 pr-9 pl-9"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
                  aria-label="Очистить поиск"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[11px] text-muted-foreground lg:block">
                  /
                </kbd>
              )}
            </div>

            <div className="hidden lg:flex lg:gap-2.5">
              {sortSelect}
              {totalItems > 0 && (
                <Button asChild className="h-10">
                  <Link href="/cart">
                    <ShoppingCart className="size-4" aria-hidden="true" />
                    Бронирование
                    <span className="rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                      {totalItems}
                    </span>
                  </Link>
                </Button>
              )}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative size-10 lg:hidden"
                  aria-label="Фильтры и сортировка"
                >
                  <SlidersHorizontal className="size-4" />
                  {sheetFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {sheetFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-6">
                <SheetHeader>
                  <SheetTitle>Фильтры</SheetTitle>
                  <SheetDescription className="sr-only">
                    Сортировка и доступность оборудования
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 px-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Сортировка
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(sortNames) as SortOrder[]).map((order) => (
                        <Button
                          key={order}
                          variant={sortOrder === order ? "default" : "outline"}
                          onClick={() => setSortOrder(order)}
                        >
                          {order === "nameAsc" ? "А–Я" : "Я–А"}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {canFilterAvailable && (
                    <div className="-mx-2.5">
                      <AccessSwitch
                        checked={onlyAvailable}
                        onChange={setOnlyAvailable}
                      />
                    </div>
                  )}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={clearFilters}
                    >
                      Сбросить всё
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
            {categoryOptions
              .filter(
                ({ value, count }) => count > 0 || selectedCategory === value,
              )
              .map(({ value, label, count }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedCategory(value)}
                  aria-pressed={selectedCategory === value}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-muted-foreground",
                    selectedCategory === value &&
                      "border-transparent bg-foreground text-background",
                  )}
                >
                  {label}
                  <span className="text-xs opacity-60">{count}</span>
                </button>
              ))}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {isBusy ? "Загрузка…" : plural(visibleModels.length, modelForms)}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="hidden items-center gap-1 hover:text-foreground lg:inline-flex"
              >
                <X className="size-3.5" aria-hidden="true" />
                Сбросить фильтры
              </button>
            )}
          </div>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => {
                setError(null);
                setAvailableIds(null);
                setReloadKey((key) => key + 1);
                void loadModels();
              }}
            />
          )}

          {error ? null : isBusy ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton
                  // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders.
                  key={index}
                  className="aspect-[3/4] rounded-2xl sm:aspect-[4/5]"
                />
              ))}
            </div>
          ) : visibleModels.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card/30 px-4 py-12 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-muted">
                <Search className="size-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                {hasActiveFilters
                  ? "Ничего не найдено"
                  : "Оборудование отсутствует"}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Попробуйте изменить параметры поиска или фильтры"
                  : "В данный момент в базе нет оборудования"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {visibleModels.map((model) => (
                <EquipmentCard
                  key={model.id}
                  model={model}
                  categoryName={categoryNames[model.category]}
                  count={booking.getCount(model.id)}
                  selectedCount={cart[model.id]?.selectedItemIds.length ?? 0}
                  actionLabel={booking.getCompactLabel(model.id)}
                  isRemoval={booking.isRemoval(model.id)}
                  disabled={booking.isBusy}
                  onAction={() => void booking.select(model)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {totalItems > 0 && (
        <Link
          href="/cart"
          className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex h-14 items-center gap-3 rounded-2xl bg-primary px-4 text-primary-foreground shadow-2xl lg:hidden"
        >
          <span className="grid size-7 place-items-center rounded-full bg-primary-foreground/20 text-sm font-bold">
            {totalItems}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-semibold">Бронирование</span>
            <span className="text-xs opacity-75">
              {plural(cartModelCount, modelForms)} ·{" "}
              {plural(totalItems, itemForms)}
            </span>
          </span>
          <ArrowRight className="ml-auto size-5" aria-hidden="true" />
        </Link>
      )}

      {booking.pickerModel && (
        <InventoryPickerDialog
          key={booking.pickerModel.id}
          model={booking.pickerModel}
          onClose={booking.closePicker}
        />
      )}
    </main>
  );
}
