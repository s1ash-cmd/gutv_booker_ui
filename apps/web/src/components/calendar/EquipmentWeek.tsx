import { addDays, format, isToday, isWeekend } from "date-fns";
import { ru } from "date-fns/locale";
import { Fragment, useLayoutEffect, useRef } from "react";
import type { BookingCalendarItemDto } from "@/app/models/booking/booking";
import { cn } from "@/lib/utils";

export type CalendarUnit = {
  modelName: string;
  inventoryNumber: string;
  category: string;
  operable: boolean;
};

export function overlapsDay(booking: BookingCalendarItemDto, day: Date) {
  return (
    Date.parse(booking.startTime) < addDays(day, 1).getTime() &&
    Date.parse(booking.endTime) > day.getTime()
  );
}

export function formatBookingPeriod(booking: BookingCalendarItemDto) {
  return [booking.startTime, booking.endTime]
    .map((time) => format(new Date(time), "d MMM HH:mm", { locale: ru }))
    .join(" — ");
}

function getTimelinePosition(time: number, days: Date[]) {
  const index = days.findIndex((day) => time < addDays(day, 1).getTime());
  if (index === -1) return days.length;
  const day = days[index];
  const elapsed = Math.max(0, time - day.getTime());
  return index + elapsed / (addDays(day, 1).getTime() - day.getTime());
}

function layoutTimeline(bookings: BookingCalendarItemDto[], days: Date[]) {
  const laneEnds: number[] = [];
  const bars = bookings.map((booking) => {
    const start = getTimelinePosition(Date.parse(booking.startTime), days);
    const end = getTimelinePosition(Date.parse(booking.endTime), days);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = end;
    return { booking, start, end, lane };
  });
  return { bars, lanes: Math.max(1, laneEnds.length) };
}

function slotText(booking: BookingCalendarItemDto, day: Date) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const startsToday = start >= day;
  const endsToday = end < addDays(day, 1);
  if (startsToday && endsToday)
    return `${format(start, "HH:mm")}–${format(end, "HH:mm")}`;
  if (startsToday) return `с ${format(start, "HH:mm")}`;
  if (endsToday) return `до ${format(end, "HH:mm")}`;
  return "Весь день";
}

export function EquipmentWeek({
  days,
  units,
  bookings,
  busy,
  emptyMessage,
  compact,
  categoryLabels,
  selectedId,
  onSelect,
}: {
  days: Date[];
  units: CalendarUnit[];
  bookings: BookingCalendarItemDto[];
  busy: boolean;
  emptyMessage: string;
  compact: boolean;
  categoryLabels: Record<string, string>;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef({ left: 0, top: 0, unit: "", offset: 0 });
  const week = days[0].getTime();
  const previousWeek = useRef(week);

  function rememberScroll(element: HTMLDivElement) {
    const viewportTop = element.getBoundingClientRect().top;
    const headerBottom =
      element.querySelector("[data-calendar-header]")?.getBoundingClientRect()
        .bottom ?? viewportTop;
    const row = Array.from(
      element.querySelectorAll<HTMLElement>("[data-calendar-unit]"),
    ).find((item) => item.getBoundingClientRect().bottom > headerBottom);
    scrollPosition.current = {
      left: element.scrollLeft,
      top: element.scrollTop,
      unit: row?.dataset.calendarUnit ?? "",
      offset: row ? row.getBoundingClientRect().top - viewportTop : 0,
    };
  }

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || compact || previousWeek.current === week) return;
    previousWeek.current = week;
    const previous = scrollPosition.current;
    const row = Array.from(
      element.querySelectorAll<HTMLElement>("[data-calendar-unit]"),
    ).find((item) => item.dataset.calendarUnit === previous.unit);
    const top = row
      ? element.scrollTop +
        row.getBoundingClientRect().top -
        element.getBoundingClientRect().top -
        previous.offset
      : previous.top;
    element.scrollTo({ left: previous.left, top });
  }, [compact, week]);

  const byInventory = new Map<string, BookingCalendarItemDto[]>();
  for (const booking of bookings) {
    for (const item of booking.equipment) {
      const reservations = byInventory.get(item.inventoryNumber) ?? [];
      reservations.push(booking);
      byInventory.set(item.inventoryNumber, reservations);
    }
  }
  function bookingClass(booking: BookingCalendarItemDto) {
    return cn(
      "rounded-md border px-1.5 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-primary",
      booking.status === "Pending"
        ? "border-dashed border-muted-foreground bg-background"
        : "border-border bg-secondary",
      selectedId === booking.id &&
        "bg-primary/10 ring-1 ring-inset ring-primary",
    );
  }

  return (
    <section
      aria-label="Расписание по инвентарным номерам"
      aria-busy={busy}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div
        ref={scroller}
        className={cn(
          "max-h-[60vh] overflow-auto",
          !compact && "[overflow-anchor:none]",
        )}
        onScroll={
          compact ? undefined : (event) => rememberScroll(event.currentTarget)
        }
      >
        <div className={compact ? "min-w-[640px]" : "min-w-0 md:min-w-[640px]"}>
          <div
            data-calendar-header
            className={cn(
              "sticky top-0 z-20 grid border-b bg-card text-center text-xs font-medium text-muted-foreground",
              compact
                ? "grid-cols-[128px_repeat(7,minmax(0,1fr))]"
                : "grid-cols-[88px_repeat(7,minmax(0,1fr))] md:grid-cols-[128px_repeat(7,minmax(0,1fr))]",
            )}
          >
            <div className="sticky left-0 z-10 bg-card p-2 text-left">
              Техника
            </div>
            {days.map((day) => (
              <div
                aria-current={isToday(day) ? "date" : undefined}
                key={day.toISOString()}
                className={cn(
                  "border-l py-2",
                  !compact && isWeekend(day) && "bg-muted/50",
                  isToday(day) && "bg-primary/10",
                )}
              >
                <span className="block capitalize">
                  {format(day, "EEEEEE", { locale: ru })}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold text-foreground",
                    !compact &&
                      isToday(day) &&
                      "text-primary dark:text-blue-300",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            ))}
          </div>
          {units.length === 0 && (
            <p className="sticky left-0 w-fit px-4 py-8 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          )}
          {units.map((unit, index) => {
            const reservations = byInventory.get(unit.inventoryNumber) ?? [];
            const { bars, lanes } = layoutTimeline(reservations, days);
            return (
              <Fragment key={unit.inventoryNumber}>
                {!compact && units[index - 1]?.category !== unit.category && (
                  <div className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                    <div className="sticky left-0 inline-block px-2 py-1.5">
                      {categoryLabels[unit.category] ?? "Прочее"}
                    </div>
                  </div>
                )}
                <div
                  data-calendar-unit={unit.inventoryNumber}
                  className={cn(
                    "grid border-b last:border-b-0",
                    compact
                      ? "grid-cols-[128px_minmax(0,1fr)]"
                      : "grid-cols-[88px_minmax(0,1fr)] md:grid-cols-[128px_minmax(0,1fr)]",
                  )}
                >
                  <div
                    className={cn(
                      "sticky left-0 z-10 flex flex-col justify-center bg-card px-2 text-xs",
                      compact ? "py-0.5" : "py-1.5",
                    )}
                  >
                    <span className="break-words font-semibold">
                      {unit.modelName}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {unit.inventoryNumber}
                    </span>
                    {!unit.operable && (
                      <span className="text-[10px] text-muted-foreground">
                        Неисправно
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "relative grid grid-cols-7",
                      compact ? "min-h-7" : "min-h-10",
                    )}
                  >
                    {days.map((day, index) => (
                      <div
                        key={day.toISOString()}
                        style={{ gridColumn: index + 1 }}
                        className={cn(
                          "row-start-1 min-w-0 border-l",
                          compact && "space-y-0.5 p-0.5",
                          !compact && isWeekend(day) && "bg-muted/30",
                          isToday(day) && "bg-primary/5",
                        )}
                      >
                        {compact &&
                          reservations
                            .filter((booking) => overlapsDay(booking, day))
                            .map((booking) => (
                              <button
                                key={booking.id}
                                type="button"
                                aria-pressed={selectedId === booking.id}
                                disabled={busy}
                                onClick={() => onSelect(booking.id)}
                                title={`${booking.userName} · ${formatBookingPeriod(booking)}`}
                                aria-label={`${booking.userName}, ${slotText(booking, day)}`}
                                className={cn(
                                  "block min-h-5 w-full truncate",
                                  bookingClass(booking),
                                )}
                              >
                                {slotText(booking, day)}
                              </button>
                            ))}
                      </div>
                    ))}
                    {!compact && (
                      <div
                        className="pointer-events-none col-span-7 col-start-1 row-start-1"
                        style={{ height: lanes * 36 + 8 }}
                      >
                        {bars.map(({ booking, start, end, lane }) => (
                          <button
                            key={booking.id}
                            type="button"
                            aria-pressed={selectedId === booking.id}
                            disabled={busy}
                            onClick={() => onSelect(booking.id)}
                            title={`${booking.userName} · ${formatBookingPeriod(booking)}`}
                            aria-label={`${booking.userName}, ${formatBookingPeriod(booking)}`}
                            className={cn(
                              "@container pointer-events-auto absolute h-8 min-w-[7px] truncate text-left",
                              bookingClass(booking),
                              "px-0.5 md:px-1.5",
                            )}
                            style={{
                              top: lane * 36 + 5,
                              left: `min(${(start / 7) * 100}%, calc(100% - 7px))`,
                              width: `${((end - start) / 7) * 100}%`,
                            }}
                          >
                            <span className="hidden truncate @[42px]:block md:block">
                              {booking.userName}
                            </span>
                            <span
                              aria-hidden="true"
                              className="hidden truncate text-[10px] leading-tight text-muted-foreground @[80px]:block"
                            >
                              {format(new Date(booking.startTime), "HH:mm")}–
                              {format(new Date(booking.endTime), "HH:mm")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
