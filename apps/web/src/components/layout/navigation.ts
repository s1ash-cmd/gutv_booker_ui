import {
  BookOpen,
  BookUser,
  CalendarDays,
  Home,
  Megaphone,
} from "lucide-react";

export const NAV_ITEMS = [
  { name: "Главная", href: "/", icon: Home },
  { name: "Календарь", href: "/calendar", icon: CalendarDays },
  { name: "Объявления", href: "/announcements", icon: Megaphone },
  { name: "Правила", href: "/rules", icon: BookOpen },
  { name: "Контакты", href: "/contacts", icon: BookUser },
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
