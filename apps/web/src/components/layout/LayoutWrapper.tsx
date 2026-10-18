"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  AppSidebar,
  adminMenuItems,
  mainMenuItems,
} from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const showSidebar = pathname?.startsWith("/dashboard");
  const menuItems = (
    user?.role === "Admin"
      ? [...mainMenuItems, ...adminMenuItems]
      : mainMenuItems
  ).filter((item) => item.href !== "/announcements");
  const activeHref = menuItems
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider className="min-w-0 flex-col">
      {isMobile && <AppSidebar />}
      <div className="sticky top-0 z-40 hidden w-full min-w-0 md:block">
        <Header />
        {user && (
          <nav
            aria-label="Личный кабинет"
            className="border-b border-border/50 bg-background"
          >
            <div className="container mx-auto flex flex-wrap gap-1 px-4 py-2 md:px-8">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={activeHref === item.href ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeHref === item.href
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur md:hidden">
        <SidebarTrigger
          aria-label="Открыть боковое меню"
          className="hover:bg-secondary/80 transition-colors"
        />
        <Link href="/" className="font-semibold">
          GUtv Booker
        </Link>
      </header>
      <div className="flex w-full min-w-0 flex-1 flex-col">{children}</div>
    </SidebarProvider>
  );
}
