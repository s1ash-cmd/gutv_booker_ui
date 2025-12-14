"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, User, LogOut, Settings, Sun, Moon, Package, ShoppingCart, SquareTerminal } from "lucide-react";

import LogoDark from "@/assets/favicon-dark.svg";
import LogoLight from "@/assets/favicon-light.svg";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl } from "@/lib/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { name: "Главная", href: "/" },
  { name: "Правила", href: "/rules" },
  { name: "Контакты", href: "/contacts" },
];

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, isAuth, logout, isLoading } = useAuth();

  const getInitials = (login: string) => {
    return login.substring(0, 1).toUpperCase();
  };

  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
          <div>Загрузка...</div>
        </div>
      </header>
    );
  }

  const isAdmin = user?.role === "Admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
        <div className="flex items-center gap-2 md:gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative h-10 w-10">
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

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="Перейти к корзине"
          >
            <Link href="/cart">
              <ShoppingCart className="h-[1.2rem] w-[1.2rem]" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative"
            aria-label="Переключить тему"
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {isAuth && user ? (
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full group">
                    {isAdmin && (
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                    )}

                    <Avatar className="h-9 w-9 relative">
                      <AvatarImage
                        src={getAvatarUrl(user.login, user.role)}
                        alt={user.login}
                      />
                      <AvatarFallback className={cn(
                        isAdmin && "bg-primary text-primary-foreground font-bold"
                      )}>
                        {getInitials(user.login)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[12px] font-bold px-2 py-1 rounded-md border border-primary/20 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                            Администратор
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">
                        @{user.login}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard/"
                          className="cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/20"
                        >
                          <SquareTerminal className="mr-2 h-4 w-4" />
                          <span className="font-semibold">Панель управления</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Моя страница</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/bookings/my" className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      <span>Мои бронирования</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Настройки</span>
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

              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Регистрация</Link>
              </Button>

              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
