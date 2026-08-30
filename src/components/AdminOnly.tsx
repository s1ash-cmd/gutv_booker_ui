"use client";

import { ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/");
    }
  }, [isLoading, isAdmin, router]);

  if (isLoading) {
    return (
      <output
        className="flex min-h-screen items-center justify-center"
        aria-live="polite"
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden="true"
        />
        <span className="sr-only">Проверка прав доступа</span>
      </output>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShieldX className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold">Доступ запрещен</h2>
          <p className="text-muted-foreground mt-2">
            Эта страница доступна только администраторам
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
