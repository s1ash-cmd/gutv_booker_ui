"use client";

import { Calendar, Package, Users } from "lucide-react";
import Link from "next/link";
import { AdminOnly } from "@/components/AdminOnly";
import { Button } from "@/components/ui/button";

export default function DashboardHome() {
  return (
    <AdminOnly>
      <main className="p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-2xl border border-border bg-card/60 p-8">
            <h1 className="text-3xl font-bold">
              Панель управления
            </h1>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/50 p-6">
              <Calendar className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold">Все бронирования</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Просмотр, фильтрация и обработка заявок на оборудование.
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/bookings">Открыть бронирования</Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card/50 p-6">
              <Package className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold">Оборудование</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Добавление моделей, экземпляров и управление доступностью.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/dashboard/equipment">Открыть оборудование</Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card/50 p-6">
              <Users className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold">Пользователи</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Управление ролями, блокировкой и данными учетных записей.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/dashboard/users">Открыть пользователей</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </AdminOnly>
  );
}
