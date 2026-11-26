"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const views = [
  { href: "/calendar", label: "Месяц" },
  { href: "/calendar/new", label: "Таймлайн" },
] as const;

export function CalendarViewSwitch() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Вид календаря"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1"
    >
      {views.map(({ href, label }) => (
        <Button
          asChild
          key={href}
          size="sm"
          variant={pathname === href ? "default" : "ghost"}
        >
          <Link
            href={href}
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
