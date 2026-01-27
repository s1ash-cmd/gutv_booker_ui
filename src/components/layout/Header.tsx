"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, User, LogOut, Settings, Sun, Moon, Package, ShoppingCart, SquareTerminal, Home, BookOpen, BookUser } from "lucide-react";
import { useState } from "react";

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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { name: "Главная", href: "/", icon: Home },
  { name: "Правила", href: "/rules", icon: BookOpen },
  { name: "Контакты", href: "/contacts", icon: BookUser },
];

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, isAuth, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (login: string) => {
    return login.substring(0, 1).toUpperCase();
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </header>
    );
  }

  const isAdmin = user?.role === "Admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/30 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
        <div className="flex items-center gap-2 md:gap-6">
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

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
                  pathname === item.href
                    ? "text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
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

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full group hidden md:flex hover:bg-secondary/50">
                    {isAdmin && (
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                    )}
                    <Avatar className="h-9 w-9 relative border-2 border-background">
                      <AvatarImage
                        src={getAvatarUrl(user.login, user.role)}
                        alt={user.login}
                      />
                      <AvatarFallback className={cn(
                        "text-sm font-bold",
                        isAdmin && "bg-primary text-primary-foreground"
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
                          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20">
                            <span className="w-1 h-1 bg-primary rounded-full animate-pulse"></span>
                            Админ
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
                      <span>Мой профиль</span>
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

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden shrink-0 hover:bg-secondary/50">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px] border-r border-border/50 bg-card/30 backdrop-blur-xl p-0 [&>button]:hidden">
                  <div className="bg-gradient-to-b from-background/80 to-background/40 h-full flex flex-col">
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
                            const isActive = pathname === item.href;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMobileMenu}
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
                                  "w-4 h-4 ml-2 transition-colors shrink-0",
                                  isActive ? "text-primary" : ""
                                )} />
                                <span className="text-sm">{item.name}</span>
                              </Link>
                            );
                          })}
                        </nav>
                      </div>

                      <div className="px-3 pb-4">
                        <p className="px-3 text-xs text-muted-foreground tracking-wider mb-2">
                          ДЕЙСТВИЯ
                        </p>
                        <div className="space-y-1">
                          {isAdmin && (
                            <Link
                              href="/dashboard/"
                              onClick={closeMobileMenu}
                              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-200"
                            >
                              <SquareTerminal className="w-4 h-4 ml-2 shrink-0" />
                              <span className="text-sm font-semibold">Панель управления</span>
                            </Link>
                          )}
                          <Link
                            href="/dashboard/profile"
                            onClick={closeMobileMenu}
                            className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                          >
                            <User className="w-4 h-4 ml-2 shrink-0" />
                            <span className="text-sm">Мой профиль</span>
                          </Link>
                          <Link
                            href="/dashboard/bookings/my"
                            onClick={closeMobileMenu}
                            className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                          >
                            <Package className="w-4 h-4 ml-2 shrink-0" />
                            <span className="text-sm">Мои бронирования</span>
                          </Link>
                          <Link
                            href="/dashboard/settings"
                            onClick={closeMobileMenu}
                            className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                          >
                            <Settings className="w-4 h-4 ml-2 shrink-0" />
                            <span className="text-sm">Настройки</span>
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-border/30 bg-gradient-to-t from-background/60 to-transparent space-y-3">
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
                          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        >
                          <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center relative shrink-0">
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
                          onClick={handleLogout}
                        >
                          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                            <LogOut className="h-4 w-4" />
                          </div>
                          <span className="text-sm">Выйти</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-2 ml-2">
                <Button variant="ghost" asChild className="hover:bg-secondary/50">
                  <Link href="/login">Войти</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Регистрация</Link>
                </Button>
              </div>

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden shrink-0 hover:bg-secondary/50">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px] border-r border-border/50 bg-card/30 backdrop-blur-xl p-0 [&>button]:hidden">
                  <div className="bg-gradient-to-b from-background/80 to-background/40 h-full flex flex-col">
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
                            const isActive = pathname === item.href;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMobileMenu}
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
                                  "w-4 h-4 ml-2 transition-colors shrink-0",
                                  isActive ? "text-primary" : ""
                                )} />
                                <span className="text-sm">{item.name}</span>
                              </Link>
                            );
                          })}
                        </nav>
                      </div>
                    </div>

                    <div className="p-3 border-t border-border/30 bg-gradient-to-t from-background/60 to-transparent space-y-2">
                      <Button asChild variant="outline" onClick={closeMobileMenu} className="w-full">
                        <Link href="/login">Войти</Link>
                      </Button>
                      <Button asChild onClick={closeMobileMenu} className="w-full">
                        <Link href="/register">Регистрация</Link>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </header>
  );
}