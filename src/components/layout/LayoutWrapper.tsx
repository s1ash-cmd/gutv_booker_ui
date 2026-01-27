"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showSidebar = pathname?.startsWith("/dashboard");

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-border/50 bg-background/95 px-6 backdrop-blur supports-backdrop-filter:bg-background/60">
            <SidebarTrigger className="hover:bg-secondary/80 transition-colors" />
            <div className="h-4 w-px bg-border/50" />
            <div className="flex-1" />
          </header>
          <div className="flex-1 overflow-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
