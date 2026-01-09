"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, X, AlertCircle, User as UserIcon, Shield, Ban } from 'lucide-react';
import { userApi } from '@/lib/userApi';
import { UserResponseDto } from '@/app/models/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function isNotFoundError(error: any): boolean {
  return (
    error?.message?.includes('не найдено') ||
    error?.message?.includes('не найден') ||
    error?.status === 404 ||
    error?.message?.toLowerCase().includes('not found')
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserResponseDto[]>([]);
  const [currentUser, setCurrentUser] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBanStatus, setSelectedBanStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, users, selectedBanStatus]);

  async function loadCurrentUser() {
    try {
      const user = await userApi.get_me();
      setCurrentUser(user);
    } catch (err: any) {
      console.error('Ошибка загрузки текущего пользователя:', err);
    }
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);
      let data: UserResponseDto[] = [];

      try {
        data = await userApi.get_all();
      } catch (apiError: any) {
        if (isNotFoundError(apiError)) {
          data = [];
        } else {
          throw apiError;
        }
      }

      setUsers(data);
      setFilteredUsers(data);
    } catch (err: any) {
      console.error('Ошибка загрузки пользователей:', err);
      setError(err?.message || 'Не удалось загрузить пользователей. Попробуйте позже.');
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    let filtered = users;

    if (selectedBanStatus === 'banned') {
      filtered = filtered.filter(u => u.banned);
    } else if (selectedBanStatus === 'active') {
      filtered = filtered.filter(u => !u.banned);
    }

    if (!searchQuery.trim()) {
      setFilteredUsers(filtered);
      return;
    }

    const query = searchQuery.trim();
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(lowerQuery) ||
      u.login.toLowerCase().includes(lowerQuery) ||
      u.telegramUsername?.toLowerCase().includes(lowerQuery)
    );
    setFilteredUsers(filtered);
  }

  async function handleBan(id: number, currentBanStatus: boolean) {
    try {
      setActionLoading(id);
      if (currentBanStatus) {
        await userApi.unban(id);
      } else {
        await userApi.ban(id);
      }
      await loadUsers();
    } catch (err: any) {
      console.error('Ошибка при изменении статуса бана:', err);
      setError(err?.message || 'Не удалось изменить статус пользователя');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRoleChange(id: number, newRole: 'admin' | 'user') {
    try {
      setActionLoading(id);
      if (newRole === 'admin') {
        await userApi.make_admin(id);
      } else {
        await userApi.make_user(id);
      }
      await loadUsers();
    } catch (err: any) {
      console.error('Ошибка при изменении роли:', err);
      setError(err?.message || 'Не удалось изменить роль пользователя');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRoninToggle(id: number, currentRoninAccess: boolean) {
    try {
      setActionLoading(id);
      if (currentRoninAccess) {
        await userApi.make_user(id);
      } else {
        await userApi.grant_ronin(id);
      }
      await loadUsers();
    } catch (err: any) {
      console.error('Ошибка при изменении Ronin доступа:', err);
      setError(err?.message || 'Не удалось изменить Ronin доступ');
    } finally {
      setActionLoading(null);
    }
  }

  function clearFilters() {
    setSearchQuery('');
    setSelectedBanStatus('all');
    setError(null);
    loadUsers();
  }

  function isCurrentUser(userId: number): boolean {
    return currentUser?.id === userId;
  }

  function hasRoninAccess(role: string): boolean {
    return role === 'Ronin' || role === 'Osnova' || role === 'Admin';
  }

  const hasActiveFilters = searchQuery || selectedBanStatus !== 'all';

  return (
    <main className="bg-background py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl lg:text-3xl font-bold">Все пользователи</h1>
        </div>

        <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, логину, Telegram..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedBanStatus} onValueChange={setSelectedBanStatus}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="banned">Забаненные</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="shrink-0"
                title="Сбросить все фильтры"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  Поиск: "{searchQuery}"
                </span>
              )}
              {selectedBanStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  {selectedBanStatus === 'banned' ? 'Забаненные' : 'Активные'}
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-3 h-3 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">Произошла ошибка</p>
                <p className="text-sm text-destructive/80">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    loadUsers();
                  }}
                  className="mt-3"
                >
                  Попробовать снова
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p>Загрузка...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-card/30 border border-border/50 rounded-xl">
            <div className="max-w-md mx-auto px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasActiveFilters ? 'Ничего не найдено' : 'Пользователи отсутствуют'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Попробуйте изменить параметры поиска или фильтры'
                  : 'В данный момент нет пользователей'
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="lg:hidden space-y-4">
              {filteredUsers.map((user) => {
                const isSelf = isCurrentUser(user.id);
                const roninAccess = hasRoninAccess(user.role);
                const isAdmin = user.role === 'Admin';

                return (
                  <div
                    key={user.id}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    {user.banned && (
                      <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Ban className="w-3 h-3 text-red-600 dark:text-red-400" />
                          <p className="text-xs font-medium text-red-600 dark:text-red-400">Забанен</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "font-medium text-sm truncate",
                              isAdmin ? "text-blue-600 dark:text-blue-400" : ""
                            )}>
                              {user.name}
                            </p>
                            {isSelf && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Вы</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">@{user.login}</p>
                        </div>
                      </div>

                      {user.telegramUsername && (
                        <div className="bg-secondary/30 rounded-lg px-3 py-2">
                          <p className="text-xs text-muted-foreground mb-1">Telegram</p>
                          <a
                            href={`https://t.me/${user.telegramUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base font-mono font-semibold text-primary hover:underline"
                          >
                            {user.telegramUsername}
                          </a>
                        </div>
                      )}

                      <div className="bg-secondary/30 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Доступ Ronin</p>
                          <Checkbox
                            checked={roninAccess}
                            onCheckedChange={(checked) => {
                              if (!isSelf && checked !== 'indeterminate') {
                                handleRoninToggle(user.id, roninAccess);
                              }
                            }}
                            disabled={isSelf || actionLoading === user.id}
                          />
                        </div>
                      </div>

                      {!isSelf && (
                        <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant={user.banned ? "default" : "destructive"}
                            onClick={() => handleBan(user.id, user.banned)}
                            disabled={actionLoading === user.id}
                            className="w-full"
                          >
                            {actionLoading === user.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Ban className="w-3 h-3 mr-1" />
                                {user.banned ? 'Разбанить' : 'Забанить'}
                              </>
                            )}
                          </Button>

                          {user.role !== 'Admin' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRoleChange(user.id, 'admin')}
                              disabled={actionLoading === user.id}
                              className="w-full"
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              Админ
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRoleChange(user.id, 'user')}
                              disabled={actionLoading === user.id}
                              className="w-full"
                            >
                              <UserIcon className="w-3 h-3 mr-1" />
                              Снять админа
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Логин</TableHead>
                    <TableHead>Telegram</TableHead>
                    <TableHead className="w-[100px]">Статус</TableHead>
                    <TableHead className="w-[120px] text-center">Ronin</TableHead>
                    <TableHead className="w-[360px]">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isSelf = isCurrentUser(user.id);
                    const roninAccess = hasRoninAccess(user.role);
                    const isAdmin = user.role === 'Admin';

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium",
                              isAdmin ? "text-blue-600 dark:text-blue-400" : ""
                            )}>
                              {user.name}
                            </span>
                            {isSelf && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Вы</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">@{user.login}</TableCell>
                        <TableCell>
                          {user.telegramUsername ? (
                            <a
                              href={`https://t.me/${user.telegramUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base font-mono font-semibold text-primary hover:underline"
                            >
                              {user.telegramUsername}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.banned ? (
                            <div className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                              <Ban className="w-3 h-3 text-red-600 dark:text-red-400" />
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">Забанен</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded px-2 py-1">
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">Без бана</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={roninAccess}
                              onCheckedChange={(checked) => {
                                if (!isSelf && checked !== 'indeterminate') {
                                  handleRoninToggle(user.id, roninAccess);
                                }
                              }}
                              disabled={isSelf || actionLoading === user.id}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSelf ? (
                            <div className="text-sm text-muted-foreground italic text-right">
                              Вы не можете изменять свой аккаунт
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                size="sm"
                                variant={user.banned ? "default" : "destructive"}
                                onClick={() => handleBan(user.id, user.banned)}
                                disabled={actionLoading === user.id}
                                className="w-full"
                              >
                                {actionLoading === user.id ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Ban className="w-3 h-3 mr-1" />
                                    {user.banned ? 'Разбанить' : 'Забанить'}
                                  </>
                                )}
                              </Button>

                              {user.role !== 'Admin' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRoleChange(user.id, 'admin')}
                                  disabled={actionLoading === user.id}
                                  className="w-full"
                                >
                                  <Shield className="w-3 h-3 mr-1" />
                                  Сделать админом
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRoleChange(user.id, 'user')}
                                  disabled={actionLoading === user.id}
                                  className="w-full"
                                >
                                  <UserIcon className="w-3 h-3 mr-1" />
                                  Снять админа
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
