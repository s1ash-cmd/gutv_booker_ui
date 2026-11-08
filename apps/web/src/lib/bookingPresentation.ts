export const bookingStatusNames: Record<string, string> = {
  Pending: "Ожидает",
  Approved: "Одобрено",
  Completed: "Завершено",
  Cancelled: "Отменено",
};

export const bookingStatusColors: Record<string, string> = {
  Pending: "bg-booking-pending",
  Approved: "bg-booking-approved",
  Completed: "bg-booking-completed",
  Cancelled: "bg-booking-cancelled",
};

export function formatBookingPeriod(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const currentYear = new Date().getFullYear();
  const day = (date: Date) =>
    date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      ...(date.getFullYear() !== currentYear && { year: "numeric" }),
    });
  const time = (date: Date) =>
    date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return start.toDateString() === end.toDateString()
    ? `${day(start)}, ${time(start)} – ${time(end)}`
    : `${day(start)}, ${time(start)} – ${day(end)}, ${time(end)}`;
}

const pluralRules = new Intl.PluralRules("ru");

export function pluralize(
  count: number,
  forms: { one: string; few: string; many: string },
) {
  const form = pluralRules.select(count);
  return `${count} ${form === "one" ? forms.one : form === "few" ? forms.few : forms.many}`;
}

export const unitForms = { one: "единица", few: "единицы", many: "единиц" };
export const bookingForms = {
  one: "бронирование",
  few: "бронирования",
  many: "бронирований",
};

/**
 * Admin comments are stored as "<admin name>: <text>". Splits off the name so
 * it can be shown as the author; legacy comments without a name stay whole.
 */
export function splitAdminComment(comment: string): {
  author: string | null;
  text: string;
} {
  const match = /^([^\n:]{1,60}): ([\s\S]+)$/.exec(comment.trim());
  const author = match ? match[1].trim() : null;
  const text = (match ? match[2] : comment).trim();
  // A bare dash is the Telegram "skip comment" reply saved by mistake.
  return { author, text: /^[-–—]$/.test(text) ? "" : text };
}
