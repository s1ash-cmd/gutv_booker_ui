import { Clock, Package, User } from "lucide-react";
import type { BookingCalendarItemDto } from "@/app/models/booking/booking";

export function CalendarBookingCard({
  booking,
  period,
}: {
  booking: BookingCalendarItemDto;
  period: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{booking.userName}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {booking.telegramUsername
              ? `@${booking.telegramUsername}`
              : "Контакт не указан"}
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
          {booking.status === "Pending" ? "Ожидает" : "Одобрено"}
        </span>
      </div>

      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {period}
      </div>

      <div className="mb-2 text-sm">{booking.reason}</div>

      <div className="space-y-1">
        {booking.equipment.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-md bg-secondary/60 px-2 py-1 text-xs"
          >
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">{item.modelName}</span>
            <span className="ml-auto font-mono text-muted-foreground">
              {item.inventoryNumber}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
