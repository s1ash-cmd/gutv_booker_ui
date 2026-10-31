"use client";

import { LogOut, Menu, Package, SquareTerminal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import LogoDark from "@/assets/favicon-dark.svg";
import LogoLight from "@/assets/favicon-light.svg";
import {
  getActiveHref,
  getInitials,
  NAV_ITEMS,
} from "@/components/layout/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl } from "@/lib/avatar";
import { isAdminRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

const MY_BOOKINGS_HREF = "/dashboard/bookings/my";
const PROFILE_HREF = "/dashboard/profile";
const ADMIN_HREF = "/dashboard";

const linkClassName =
  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200";
const inactiveLinkClassName =
  "text-muted-foreground hover:text-foreground hover:bg-secondary/50";
const activeLinkClassName = "bg-muted text-foreground font-medium";

export function MobileMenu() {
  const pathname = usePathname();
  const { user, isAuth, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const signedInUser = isAuth ? user : null;
  const isAdmin = isAdminRole(signedInUser?.role);
  const navItems = signedInUser
    ? [
        ...NAV_ITEMS,
        { name: "Мои бронирования", href: MY_BOOKINGS_HREF, icon: Package },
      ]
    : NAV_ITEMS;
  const activeHref = getActiveHref(pathname, [
    ...navItems.map((item) => item.href),
    ...(signedInUser ? [PROFILE_HREF] : []),
    ...(isAdmin ? [ADMIN_HREF] : []),
  ]);

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 hover:bg-secondary/50"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[280px] sm:w-[320px] border-r border-border/50 bg-white/85 backdrop-blur-xl p-0 dark:bg-card/30 data-[state=open]:duration-300 data-[state=closed]:duration-200 [&>button]:hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Навигационное меню</SheetTitle>
          <SheetDescription>
            {signedInUser
              ? "Мобильное меню навигации и действий пользователя."
              : "Мобильное меню навигации, входа и регистрации."}
          </SheetDescription>
        </SheetHeader>
        <div className="h-full flex flex-col bg-transparent">
          <div className="px-6 py-6 border-b border-border/30">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-lg blur opacity-25"></div>
              <div className="relative flex items-center gap-3 rounded-lg border border-border/50 bg-muted/70 px-4 py-3 backdrop-blur dark:bg-card/50">
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
                    Меню
                  </h2>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-4">
              <p className="px-3 text-xs text-muted-foreground tracking-wider mb-2">
                НАВИГАЦИЯ
              </p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activeHref === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        linkClassName,
                        isActive ? activeLinkClassName : inactiveLinkClassName,
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-4 h-4 ml-2 transition-colors shrink-0",
                          isActive ? "text-primary" : "",
                        )}
                      />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {isAdmin && (
              <div className="px-3 pb-4">
                <p className="px-3 text-xs text-muted-foreground tracking-wider mb-2">
                  УПРАВЛЕНИЕ
                </p>
                <Link
                  href={`${ADMIN_HREF}/`}
                  onClick={close}
                  aria-current={activeHref === ADMIN_HREF ? "page" : undefined}
                  className={cn(
                    linkClassName,
                    "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20",
                    activeHref === ADMIN_HREF &&
                      "bg-blue-50 dark:bg-blue-950/30",
                  )}
                >
                  <SquareTerminal className="w-4 h-4 ml-2 shrink-0" />
                  <span className="text-sm font-semibold">
                    Панель управления
                  </span>
                </Link>
              </div>
            )}
          </div>

          {signedInUser ? (
            <div className="p-3 border-t border-border/30 bg-transparent space-y-3">
              <Link
                href={PROFILE_HREF}
                onClick={close}
                aria-current={activeHref === PROFILE_HREF ? "page" : undefined}
                className="relative block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 rounded-xl blur-sm opacity-50"></div>
                <div
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-3 bg-muted/70 backdrop-blur border border-border/50 rounded-xl transition-colors hover:bg-muted/90 dark:bg-card/50 dark:hover:bg-card/70",
                    activeHref === PROFILE_HREF &&
                      "border-primary/60 bg-muted dark:bg-card/80",
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      userRole={signedInUser.role}
                      className="h-10 w-10 relative border-2 border-background"
                    >
                      <AvatarImage
                        src={getAvatarUrl(
                          signedInUser.login,
                          signedInUser.role,
                          signedInUser.avatarSeed,
                          signedInUser.avatarUrl,
                        )}
                        alt={signedInUser.login}
                      />
                      <AvatarFallback
                        className={cn(
                          "text-sm font-bold",
                          isAdmin && "bg-primary text-primary-foreground",
                        )}
                      >
                        {getInitials(signedInUser.login)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {signedInUser.name}
                      </p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                          <span className="w-1 h-1 bg-primary rounded-full animate-pulse"></span>
                          Админ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {signedInUser.login}
                    </p>
                  </div>
                </div>
              </Link>

              <Separator className="bg-border/50" />

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  logout();
                  close();
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-sm">Выйти</span>
              </Button>
            </div>
          ) : (
            <div className="p-3 border-t border-border/30 bg-transparent space-y-2">
              <Button
                asChild
                variant="outline"
                onClick={close}
                className="w-full"
              >
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild onClick={close} className="w-full">
                <Link href="/register">Регистрация</Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
