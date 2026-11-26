import Link from "next/link";
import { Button } from "@/components/ui/button";

const views = [
  { id: "month", href: "/calendar", label: "Месяц" },
  { id: "new", href: "/calendar/new", label: "Таймлайн" },
] as const;

export function CalendarViewSwitch({
  current,
}: {
  current?: (typeof views)[number]["id"];
}) {
  return (
    <nav
      aria-label="Вид календаря"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1"
    >
      {views.map(({ id, href, label }) => (
        <Button
          asChild
          key={id}
          size="sm"
          variant={current === id ? "default" : "ghost"}
        >
          <Link href={href} aria-current={current === id ? "page" : undefined}>
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
