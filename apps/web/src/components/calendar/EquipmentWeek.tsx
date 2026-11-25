import { addDays, format, isToday } from "date-fns";
import { ru } from "date-fns/locale";
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
  compact,
  selectedId,
  onSelect,
}: {
  days: Date[];
  units: CalendarUnit[];
  bookings: BookingCalendarItemDto[];
  compact: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
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
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="max-h-[60vh] overflow-auto">
        <div className="min-w-[640px]">
          <div className="sticky top-0 z-20 grid grid-cols-[128px_repeat(7,minmax(0,1fr))] border-b bg-card text-center text-xs font-medium text-muted-foreground">
            <div className="sticky left-0 z-10 bg-card p-2 text-left">
              Техника
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-l px-1 py-2",
                  isToday(day) && "bg-primary/10",
                )}
              >
                <span className="block capitalize">
                  {format(day, "EEEEEE", { locale: ru })}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {format(day, "d")}
                </span>
              </div>
            ))}
          </div>
          {units.map((unit) => {
            const reservations = byInventory.get(unit.inventoryNumber) ?? [];
            const { bars, lanes } = layoutTimeline(reservations, days);
            return (
              <div
                key={unit.inventoryNumber}
                className="grid grid-cols-[128px_minmax(0,1fr)] border-b last:border-b-0"
              >
                <div
                  className={cn(
                    "sticky left-0 z-10 flex flex-col justify-center bg-card px-2 text-xs",
                    compact ? "py-0.5" : "py-1.5",
                  )}
                >
                  <span className="font-semibold">{unit.modelName}</span>
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
                      style={{ height: lanes * 30 + 8 }}
                    >
                      {bars.map(({ booking, start, end, lane }) => (
                        <button
                          key={booking.id}
                          type="button"
                          aria-pressed={selectedId === booking.id}
                          onClick={() => onSelect(booking.id)}
                          title={`${booking.userName} · ${formatBookingPeriod(booking)}`}
                          aria-label={`${booking.userName}, ${formatBookingPeriod(booking)}`}
                          className={cn(
                            "pointer-events-auto absolute h-6 min-w-0.5 truncate text-left",
                            bookingClass(booking),
                          )}
                          style={{
                            top: lane * 30 + 5,
                            left: `${(start / 7) * 100}%`,
                            width: `${((end - start) / 7) * 100}%`,
                          }}
                        >
                          {booking.userName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
