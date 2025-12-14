"use client";

import {
  Calendar,
  Home,
  LogOut,
  Moon,
  Package,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import LogoDark from "@/assets/favicon-dark.svg";
import LogoLight from "@/assets/favicon-light.svg";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const mainMenuItems = [
  { title: "Главная", icon: Home, href: "/" },
  { title: "Мои бронирования", icon: Package, href: "/dashboard/bookings/my" },
  { title: "Настройки", icon: Settings, href: "/dashboard/settings" },
];

const adminMenuItems = [
  { title: "Все бронирования", icon: Calendar, href: "/dashboard/bookings" },
  { title: "Оборудование", icon: Package, href: "/dashboard/equipment" },
  { title: "Пользователи", icon: Users, href: "/dashboard/users" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const getInitials = (login: string) => {
    return login.substring(0, 1).toUpperCase();
  };

  if (!user) return null;

  const isAdmin = user.role === "Admin";

  const renderMenuItem = (item: typeof mainMenuItems[0]) => {
    const isActive = pathname === item.href;
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild className="group">
          <Link
            href={item.href}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              isActive
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>
            )}

            <item.icon className={cn(
              "w-4 h-4 ml-2 transition-colors",
              isActive ? "text-primary" : ""
            )} />
            <span className="text-sm">{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className="border-r border-border/50 bg-card/30 backdrop-blur-xl">
      <SidebarContent className="bg-gradient-to-b from-background/80 to-background/40 flex flex-col">
        <div className="px-6 py-6 border-b border-border/30">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-lg blur opacity-25"></div>
            <div className="relative flex items-center gap-3 bg-card/50 backdrop-blur rounded-lg px-4 py-3 border border-border/50">
              <div className="relative w-10 h-10 shrink-0">
                <Image
                  src={LogoDark}
                  alt="Logo"
                  fill
                  className="dark:hidden object-contain"
                />
                <Image
                  src={LogoLight}
                  alt="Logo"
                  fill
                  className="hidden dark:block object-contain"
                />
              </div>
              <div>
                <h2 className="text-base font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  GUtv Booker
                </h2>
              </div>
            </div>
          </div>
        </div>

        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="px-3 text-xs text-muted-foreground tracking-wider mb-2">
            НАВИГАЦИЯ
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainMenuItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="px-3 pb-4 mt-auto">
            <SidebarGroupLabel className="px-3 text-xs text-muted-foreground tracking-wider mb-2">
              АДМИНИСТРИРОВАНИЕ
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminMenuItems.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/30 bg-gradient-to-t from-background/60 to-transparent space-y-3">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 rounded-xl blur-sm opacity-50"></div>

          <div className="relative flex items-center gap-3 px-3 py-3 bg-card/50 backdrop-blur border border-border/50 rounded-xl">
            <div className="relative shrink-0">
              {isAdmin && (
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur opacity-75"></div>
              )}
              <Avatar className="h-10 w-10 relative border-2 border-background">
                <AvatarImage
                  src={getAvatarUrl(user.login, user.role)}
                  alt={user.login}
                />
                <AvatarFallback
                  className={cn(
                    "text-sm font-bold",
                    isAdmin && "bg-primary text-primary-foreground"
                  )}
                >
                  {getInitials(user.login)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name}
                </p>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                    <span className="w-1 h-1 bg-primary rounded-full animate-pulse"></span>
                    Админ
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                @{user.login}
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-secondary/50"
            asChild
          >
            <Link href="/dashboard/profile">
              <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <span className="text-sm">Моя страница</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-secondary/50"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center relative">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </div>
            <span className="text-sm">
              {theme === "dark" ? "Светлая тема" : "Темная тема"}
            </span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={logout}
          >
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <LogOut className="h-4 w-4" />
            </div>
            <span className="text-sm">Выйти</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
