import {
  BookOpen,
  BookUser,
  Calendar,
  CalendarDays,
  Home,
  Megaphone,
  Package,
  Users,
} from "lucide-react";

export const NAV_ITEMS = [
  { name: "Главная", href: "/", icon: Home },
  { name: "Календарь", href: "/calendar", icon: CalendarDays },
  { name: "Объявления", href: "/announcements", icon: Megaphone },
  { name: "Правила", href: "/rules", icon: BookOpen },
  { name: "Контакты", href: "/contacts", icon: BookUser },
];

export const MY_BOOKINGS_ITEM = {
  name: "Мои бронирования",
  href: "/dashboard/bookings/my",
  icon: Package,
};

export const ADMIN_NAV_ITEMS = [
  { name: "Все бронирования", href: "/dashboard/bookings", icon: Calendar },
  { name: "Оборудование", href: "/dashboard/equipment", icon: Package },
  { name: "Пользователи", href: "/dashboard/users", icon: Users },
];

export function getInitials(login: string) {
  return login.slice(0, 1).toUpperCase();
}

export function isCurrentPath(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The most specific href matching the pathname, so nested sections win over their parents. */
export function getActiveHref(pathname: string, hrefs: string[]) {
  return hrefs
    .filter((href) => isCurrentPath(pathname, href))
    .sort((first, second) => second.length - first.length)[0];
}
