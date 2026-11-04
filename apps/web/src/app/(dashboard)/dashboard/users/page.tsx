"use client";

import { ArrowDown, ArrowUp, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl } from "@/lib/avatar";
import { getRoleLabel, hasRoninAccess } from "@/lib/roles";
import { userApi } from "@/lib/userApi";
import { getErrorMessage } from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

type Tab = "all" | "admins" | "osnova" | "users" | "banned";

const tabs: { id: Tab; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "admins", label: "Админы" },
  { id: "osnova", label: "Основа" },
  { id: "users", label: "Малыши" },
  { id: "banned", label: "Бан" },
];

function userTab(user: UserResponseDto): Exclude<Tab, "all"> {
  if (user.banned) return "banned";
  if (user.role === "Admin") return "admins";
  if (user.role === "Ronin" || user.role === "Osnova") return "osnova";
  return "users";
}

const peoplePluralRules = new Intl.PluralRules("ru");
const peopleForms: Record<string, string> = {
  one: "человек",
  few: "человека",
  many: "человек",
  other: "человека",
};

function isNotFoundError(error: unknown): boolean {
  const typedError = error as { message?: string; status?: number };
  return Boolean(
    typedError.message?.includes("не найдено") ||
      typedError.message?.includes("не найден") ||
      typedError.status === 404 ||
      typedError.message?.toLowerCase().includes("not found"),
  );
}

function UserAvatar({ user }: { user: UserResponseDto }) {
  return (
    <Avatar userRole={user.role} className="size-8">
      <AvatarImage
        src={getAvatarUrl(
          user.login,
          user.role,
          user.avatarSeed,
          user.avatarUrl,
        )}
        alt=""
      />
      <AvatarFallback className="text-xs">
        {user.name.substring(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function StatusLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
      <span className="size-1.5 rounded-full bg-destructive" />
      Забанен
    </span>
  );
}

const columns =
  "md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_3.5rem_minmax(0,1fr)_1rem] md:gap-x-4";

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [roninBusyId, setRoninBusyId] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      try {
        setUsers(await userApi.get_all());
      } catch (apiError: unknown) {
        if (!isNotFoundError(apiError)) throw apiError;
        setUsers([]);
      }
    } catch (err: unknown) {
      console.error("Ошибка загрузки пользователей:", err);
      setError(
        (err as { message?: string })?.message ||
          "Не удалось загрузить пользователей. Попробуйте позже.",
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function toggleRonin(user: UserResponseDto) {
    if (roninBusyId !== null) return;
    setRoninBusyId(user.id);
    setError(null);
    try {
      if (hasRoninAccess(user.role)) await userApi.make_user(user.id);
      else await userApi.grant_ronin(user.id);
      const updated = await userApi.get_by_id(user.id);
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Не удалось изменить доступ к Ronin"));
    } finally {
      setRoninBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const result: Record<Tab, number> = {
      all: users.length,
      admins: 0,
      osnova: 0,
      users: 0,
      banned: 0,
    };
    for (const user of users) result[userTab(user)] += 1;
    return result;
  }, [users]);

  const visibleUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users
      .filter(
        (user) =>
          (tab === "all" || userTab(user) === tab) &&
          (!query ||
            user.name.toLowerCase().includes(query) ||
            user.login.toLowerCase().includes(query) ||
            user.telegramUsername?.toLowerCase().includes(query)),
      )
      .sort((left, right) => {
        const result = left.name.localeCompare(right.name, "ru", {
          sensitivity: "base",
        });
        return sortOrder === "asc" ? result : -result;
      });
  }, [searchQuery, sortOrder, tab, users]);

  const SortIcon = sortOrder === "asc" ? ArrowUp : ArrowDown;

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <h1 className="text-xl font-bold sm:text-2xl">Пользователи</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {users.length}{" "}
              {peopleForms[peoplePluralRules.select(users.length)]}
            </p>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Поиск по имени, логину, Telegram"
              aria-label="Поиск пользователей"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="bg-card pl-9"
            />
          </div>
          <div
            role="tablist"
            aria-label="Фильтр по роли"
            className="flex shrink-0 gap-0.5 overflow-x-auto rounded-lg border border-border bg-card p-[3px]"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  tab === item.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                <span className="ml-1 opacity-60">{counts[item.id]}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => void loadUsers()}
            className="mb-4"
          />
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div
            className={cn(
              "hidden min-h-9 items-center border-b border-border px-4 text-xs text-muted-foreground",
              columns,
            )}
          >
            <button
              type="button"
              onClick={() =>
                setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
              }
              className="inline-flex items-center gap-1 justify-self-start hover:text-foreground"
              aria-label={
                sortOrder === "asc"
                  ? "Сортировать имена в обратном порядке"
                  : "Сортировать имена в алфавитном порядке"
              }
            >
              Пользователь <SortIcon className="size-3" />
            </button>
            <span>Telegram</span>
            <span>Роль</span>
            <span className="text-center">Ronin</span>
            <span>Статус</span>
            <span />
          </div>

          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Загрузка пользователей…
            </p>
          ) : visibleUsers.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {searchQuery || tab !== "all"
                ? "Никого не нашлось"
                : "Пользователей пока нет"}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleUsers.map((user) => {
                const isSelf = me?.id === String(user.id);
                return (
                  <li
                    key={user.id}
                    className={cn(
                      "relative flex min-h-14 items-center gap-3 px-4 py-2 transition-colors focus-within:bg-secondary/50 hover:bg-secondary/50",
                      columns,
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/users/${user.id}`}
                          className="block truncate text-sm outline-none after:absolute after:inset-0 after:content-['']"
                        >
                          {user.name}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              · вы
                            </span>
                          )}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.banned ? (
                            <span className="text-destructive">
                              <span className="md:hidden">Забанен · </span>
                              {user.banReason?.trim() || "Без причины"}
                            </span>
                          ) : (
                            <>
                              @{user.login}
                              <span className="md:hidden">
                                {" "}
                                · {getRoleLabel(user.role)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="hidden truncate text-sm text-muted-foreground md:block">
                      {user.telegramUsername
                        ? `@${user.telegramUsername}`
                        : "—"}
                    </span>
                    <span className="hidden truncate text-sm text-muted-foreground md:block">
                      {getRoleLabel(user.role)}
                    </span>
                    <div className="relative z-10 flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground md:justify-center">
                      <span aria-hidden="true" className="md:hidden">
                        Ronin
                      </span>
                      <Switch
                        checked={hasRoninAccess(user.role)}
                        disabled={
                          isSelf ||
                          user.role === "Admin" ||
                          roninBusyId === user.id
                        }
                        onCheckedChange={() => void toggleRonin(user)}
                        aria-label={
                          user.role === "Admin"
                            ? `${user.name}: у администратора доступ к Ronin есть всегда`
                            : `Доступ к Ronin для ${user.name}`
                        }
                      />
                    </div>
                    <span className="hidden md:block">
                      {user.banned && <StatusLabel />}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
