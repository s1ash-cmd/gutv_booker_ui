"use client";

import {
  LogOut,
  Moon,
  Package,
  ShoppingCart,
  SquareTerminal,
  Sun,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import LogoDark from "@/assets/favicon-dark.svg";
import LogoLight from "@/assets/favicon-light.svg";
import { MobileMenu } from "@/components/layout/MobileMenu";
import {
  getInitials,
  isCurrentPath,
  NAV_ITEMS,
} from "@/components/layout/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl } from "@/lib/avatar";
import { canBookEquipment, isAdminRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const currentTheme = resolvedTheme ?? "dark";
  const { user, isAuth, logout, isLoading } = useAuth();
  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
          <output aria-live="polite">
            <span
              className="block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden="true"
            />
            <span className="sr-only">Загрузка профиля</span>
          </output>
        </div>
      </header>
    );
  }

  const isAdmin = isAdminRole(user?.role);
  const canOpenCart = canBookEquipment(user?.role);
  const personalDashboardHref = "/dashboard/bookings/my";
  const personalDashboardLabel = "Мои бронирования";
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/30 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
        <div className="flex items-center gap-2 lg:gap-6">
          <MobileMenu />
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative w-8 h-8">
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
            <span className="font-bold inline-block text-foreground">
              GUtv booker
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = isCurrentPath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "text-foreground bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {canOpenCart && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="relative hover:bg-secondary/50"
              aria-label="Перейти к корзине"
            >
              <Link href="/cart">
                <ShoppingCart className="h-[1.1rem] w-[1.1rem]" />
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
            className="relative hover:bg-secondary/50"
            aria-label="Переключить тему"
          >
            <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {isAuth && user ? (
            <div className="flex items-center gap-2 ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full group hidden lg:flex hover:bg-secondary/50"
                    aria-label="Открыть меню пользователя"
                  >
                    <Avatar
                      userRole={user.role}
                      className="h-9 w-9 relative border-2 border-background"
                    >
                      <AvatarImage
                        src={getAvatarUrl(
                          user.login,
                          user.role,
                          user.avatarSeed,
                          user.avatarUrl,
                        )}
                        alt={user.login}
                      />
                      <AvatarFallback
                        className={cn(
                          "text-sm font-bold",
                          isAdmin && "bg-primary text-primary-foreground",
                        )}
                      >
                        {getInitials(user.login)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link
                      href="/dashboard/profile"
                      className="flex flex-col items-start space-y-1 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">
                          {user.name}
                        </p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20">
                            <span className="w-1 h-1 bg-primary rounded-full animate-pulse"></span>
                            Админ
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.login}
                      </p>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard/"
                          className="cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/20"
                        >
                          <SquareTerminal className="mr-2 h-4 w-4" />
                          <span className="font-semibold">
                            Панель управления
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem asChild>
                    <Link
                      href={personalDashboardHref}
                      className="cursor-pointer"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      <span>{personalDashboardLabel}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={logout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <Button variant="ghost" asChild className="hover:bg-secondary/50">
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Регистрация</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
