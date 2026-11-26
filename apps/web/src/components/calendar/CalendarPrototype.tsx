"use client";

import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { BookingCalendarItemDto } from "@/app/models/booking/booking";
import { CalendarBookingCard } from "@/components/calendar/CalendarBookingCard";
import {
  type CalendarUnit,
  EquipmentWeek,
  formatBookingPeriod,
  overlapsDay,
} from "@/components/calendar/EquipmentWeek";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { bookingApi } from "@/lib/bookingApi";
import { equipmentApi } from "@/lib/equipmentApi";
import { getErrorMessage } from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

const variants = [
  { id: "1", label: "Таймлайн" },
  { id: "2", label: "Плотная сетка" },
  { id: "3", label: "По дням" },
] as const;

const categories: Record<string, string> = {
  Camera: "Камеры",
  Lens: "Объективы",
  Card: "Карты памяти",
  Battery: "Аккумуляторы",
  Charger: "Зарядные устройства",
  Sound: "Звук",
  Stand: "Штативы и стойки",
  Light: "Свет",
  Filters: "Фильтры и переходники",
  Other: "Прочее",
};

const weekStart = (day: Date) => startOfWeek(day, { weekStartsOn: 1 });

export function CalendarPrototype({
  variant,
}: {
  variant: (typeof variants)[number]["id"];
}) {
  const router = useRouter();
  const { isAuth, isLoading } = useAuth();
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const bookingDetails = useRef<HTMLElement>(null);
  const timeline = variant === "1";
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [bookings, setBookings] = useState<BookingCalendarItemDto[]>([]);
  const [inventory, setInventory] = useState<CalendarUnit[]>([]);
  const [loadedWeek, setLoadedWeek] = useState<string | null>(null);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const start = weekStart(day);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const startIso = start.toISOString();
  const endIso = addDays(start, 7).toISOString();
  const last = days[6];
  const interval =
    start.getMonth() === last.getMonth()
      ? `${format(start, "d")}–${format(last, "d MMMM", { locale: ru })}`
      : `${format(start, "d MMM", { locale: ru })} — ${format(last, "d MMM", { locale: ru })}`;
  const showEquipment = variant !== "3";

  useEffect(() => {
    if (!isLoading && !isAuth) router.replace("/login");
  }, [isLoading, isAuth, router]);

  useEffect(() => {
    if (!isAuth) return;
    let active = true;
    setBookingError(null);
    bookingApi
      .get_calendar(startIso, endIso)
      .then((result) => {
        if (!active) return;
        setBookings(result);
        setLoadedWeek(startIso);
      })
      .catch((error: unknown) => {
        if (active)
          setBookingError(
            getErrorMessage(error, "Не удалось загрузить календарь"),
          );
      });
    return () => {
      active = false;
    };
  }, [isAuth, startIso, endIso]);

  useEffect(() => {
    if (!isAuth || !showEquipment) return;
    let active = true;
    equipmentApi
      .get_all_items()
      .then((items) => {
        if (!active) return;
        setInventory(
          items.map((item) => ({
            modelName: item.modelName ?? "Оборудование",
            inventoryNumber: item.inventoryNumber,
            category: item.modelCategory ?? "Other",
            operable: item.available,
          })),
        );
        setInventoryReady(true);
      })
      .catch((error: unknown) => {
        if (active)
          setInventoryError(
            getErrorMessage(error, "Не удалось загрузить оборудование"),
          );
      });
    return () => {
      active = false;
    };
  }, [isAuth, showEquipment]);

  const normalized = query.trim().toLocaleLowerCase("ru");
  const matches = (value: string) =>
    value.toLocaleLowerCase("ru").includes(normalized);
  const filtered = bookings.filter((booking) =>
    matches(
      [
        booking.userName,
        booking.telegramUsername,
        booking.reason,
        ...booking.equipment.map(
          (item) => `${item.modelName} ${item.inventoryNumber}`,
        ),
      ].join(" "),
    ),
  );
  const units = new Map(inventory.map((unit) => [unit.inventoryNumber, unit]));
  for (const booking of bookings) {
    for (const item of booking.equipment) {
      if (!units.has(item.inventoryNumber)) {
        units.set(item.inventoryNumber, {
          ...item,
          category: "Other",
          operable: true,
        });
      }
    }
  }
  const matchingInventory = new Set(
    filtered.flatMap((booking) =>
      booking.equipment.map((item) => item.inventoryNumber),
    ),
  );
  const visibleUnits = Array.from(units.values())
    .filter(
      (unit) =>
        (!category || unit.category === category) &&
        (matchingInventory.has(unit.inventoryNumber) ||
          matches(`${unit.modelName} ${unit.inventoryNumber}`)),
    )
    .sort(
      (a, b) =>
        (timeline
          ? (categories[a.category] ?? a.category).localeCompare(
              categories[b.category] ?? b.category,
              "ru",
            )
          : 0) ||
        a.inventoryNumber.localeCompare(b.inventoryNumber, "ru", {
          numeric: true,
        }),
    );
  const visibleOnGrid = new Set(
    visibleUnits.map((unit) => unit.inventoryNumber),
  );
  const selected = filtered.find(
    (booking) =>
      booking.id === selectedId &&
      booking.equipment.some((item) => visibleOnGrid.has(item.inventoryNumber)),
  );
  const agenda = filtered.filter((booking) => overlapsDay(booking, day));
  const error = bookingError ?? (showEquipment ? inventoryError : null);
  const loading = loadedWeek !== startIso || (showEquipment && !inventoryReady);

  useEffect(() => {
    if (
      timeline &&
      selected &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      bookingDetails.current?.scrollIntoView({ block: "nearest" });
    }
  }, [timeline, selected]);

  function changeDay(nextDay: Date) {
    if (!isSameDay(weekStart(nextDay), start)) setLoadedWeek(null);
    setDay(nextDay);
    setSelectedId(null);
  }

  if (!isAuth || isLoading) {
    return (
      <p className="py-12 text-center text-muted-foreground">Загрузка...</p>
    );
  }

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold md:text-3xl">
            Календарь бронирований
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Предыдущая неделя"
              onClick={() => changeDay(addWeeks(day, -1))}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-28 text-center text-sm font-semibold">
              {interval}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Следующая неделя"
              onClick={() => changeDay(addWeeks(day, 1))}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              onClick={() => changeDay(startOfDay(new Date()))}
            >
              Сегодня
            </Button>
          </div>
        </div>

        <nav aria-label="Вид календаря" className="flex flex-wrap gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/calendar">Месяц</Link>
          </Button>
          {variants.map((view) => (
            <Button
              key={view.id}
              asChild
              variant={view.id === variant ? "default" : "ghost"}
              size="sm"
            >
              <Link
                href={`/calendar/${view.id}`}
                aria-current={view.id === variant ? "page" : undefined}
              >
                {view.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Поиск броней и техники"
              placeholder="Поиск по человеку, технике или причине"
              className="pl-9"
            />
          </div>
          {showEquipment && (
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Категория техники"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Вся техника</option>
              {Object.entries(categories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>

        {error ? (
          <ErrorMessage message={error} />
        ) : loading ? (
          <output className="block py-12 text-center text-muted-foreground">
            Загружаем...
          </output>
        ) : showEquipment ? (
          <>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-sm border bg-secondary" />
                Одобрено
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-sm border border-dashed border-muted-foreground" />
                Ожидает
              </span>
            </div>
            <div
              className={cn(
                "grid items-start gap-5",
                (timeline || selected) && "lg:grid-cols-[minmax(0,1fr)_320px]",
              )}
            >
              {visibleUnits.length ? (
                <EquipmentWeek
                  days={days}
                  units={visibleUnits}
                  bookings={filtered}
                  compact={!timeline}
                  categoryLabels={categories}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelectedId}
                />
              ) : (
                <p className="py-12 text-center text-muted-foreground">
                  Техника не найдена.
                </p>
              )}
              {selected && (
                <aside
                  ref={bookingDetails}
                  aria-label="Детали брони"
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="font-semibold">Детали брони</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedId(null)}
                    >
                      Закрыть
                    </Button>
                  </div>
                  <CalendarBookingCard
                    booking={selected}
                    period={formatBookingPeriod(selected)}
                  />
                </aside>
              )}
              {timeline && !selected && (
                <aside className="hidden rounded-xl border border-border bg-card p-4 lg:block">
                  <h2 className="font-semibold">Детали брони</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Выберите бронь на таймлайне, чтобы увидеть время и список
                    техники.
                  </p>
                </aside>
              )}
            </div>
          </>
        ) : (
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {days.map((date) => (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => changeDay(date)}
                  aria-pressed={isSameDay(day, date)}
                  className={cn(
                    "border-r px-1 py-2 text-xs last:border-r-0 hover:bg-secondary",
                    isSameDay(day, date) &&
                      "bg-primary/10 ring-1 ring-inset ring-primary",
                  )}
                >
                  <span className="block capitalize text-muted-foreground">
                    {format(date, "EEEEEE", { locale: ru })}
                  </span>
                  <span className="text-sm font-semibold">
                    {format(date, "d")}
                  </span>
                </button>
              ))}
            </div>
            <div className="space-y-4 p-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <CalendarDays className="size-5 text-primary" />
                {format(day, "d MMMM yyyy", { locale: ru })}
              </h2>
              {agenda.length ? (
                <div className="grid items-start gap-3 md:grid-cols-2">
                  {agenda.map((booking) => (
                    <CalendarBookingCard
                      key={booking.id}
                      booking={booking}
                      period={formatBookingPeriod(booking)}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  На этот день ничего не забронировано.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
