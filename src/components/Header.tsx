import Link from "next/link";
import { LogIn } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-bg-light sticky top-0 z-10">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary text-bg-light p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
            <img src="/favicon-light.svg" alt="logo" className="w-8 h-8" />
          </div>

          <div className="font-roboto font-bold text-xl tracking-tight">
            GUtv <span className="text-primary">booker</span>
          </div>
        </Link>

        {/*<nav className="hidden md:flex gap-6 text-sm font-medium text-text-muted">*/}
        {/*    <Link href="/" className="hover:text-primary transition-colors">Оборудование</Link>*/}
        {/*    <Link href="/bookings" className="hover:text-primary transition-colors">Мои брони</Link>*/}
        {/*</nav>*/}

        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-fg hover:opacity-90 transition-opacity font-medium text-sm"
        >
          <LogIn size={16} />
          <span>Войти</span>
        </Link>
      </div>
    </header>
  );
}
