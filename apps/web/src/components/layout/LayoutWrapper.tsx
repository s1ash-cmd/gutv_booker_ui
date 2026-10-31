"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import {
  ADMIN_NAV_ITEMS,
  getActiveHref,
  MY_BOOKINGS_ITEM,
} from "@/components/layout/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const showSidebar = pathname?.startsWith("/dashboard");
  const menuItems = isAdminRole(user?.role)
    ? [MY_BOOKINGS_ITEM, ...ADMIN_NAV_ITEMS]
    : [MY_BOOKINGS_ITEM];
  const activeHref = getActiveHref(
    pathname,
    menuItems.map((item) => item.href),
  );

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-svh w-full min-w-0 flex-col">
      <div className="sticky top-0 z-40 w-full min-w-0">
        <Header />
        {user && (
          <nav
            aria-label="Личный кабинет"
            className="border-b border-border/50 bg-background"
          >
            <div className="container mx-auto flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:flex-wrap md:px-8">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={activeHref === item.href ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeHref === item.href
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
