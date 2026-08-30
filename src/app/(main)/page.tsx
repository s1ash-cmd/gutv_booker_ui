"use client";

import {
  AlertCircle,
  Filter,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import {
  type EqModelResponseDto,
  EquipmentAccess,
  EquipmentCategory,
} from "@/app/models/equipment/equipment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { equipmentApi } from "@/lib/equipmentApi";
import { canBookEquipment } from "@/lib/roles";

const categoryNames: Record<EquipmentCategory, string> = {
  [EquipmentCategory.Camera]: "Камера",
  [EquipmentCategory.Lens]: "Объектив",
  [EquipmentCategory.Card]: "Карта памяти",
  [EquipmentCategory.Battery]: "Аккумулятор",
  [EquipmentCategory.Charger]: "Зарядное устройство",
  [EquipmentCategory.Sound]: "Звук",
  [EquipmentCategory.Stand]: "Штативы и стойки",
  [EquipmentCategory.Light]: "Свет",
  [EquipmentCategory.Filters]: "Фильтры и переходники",
  [EquipmentCategory.Other]: "Прочее",
};

const accessNames: Record<EquipmentAccess, string> = {
  [EquipmentAccess.User]: "Все пользователи",
  [EquipmentAccess.Osnova]: "Основа",
  [EquipmentAccess.Ronin]: "Требуется разрешение",
};

const markdownPreviewComponents: Components = {
  a: ({ children }) => <span>{children}</span>,
  blockquote: ({ children }) => <span className="block">{children}</span>,
  br: () => <br />,
  h1: ({ children }) => <strong className="block">{children}</strong>,
  h2: ({ children }) => <strong className="block">{children}</strong>,
  h3: ({ children }) => <strong className="block">{children}</strong>,
  h4: ({ children }) => <strong className="block">{children}</strong>,
  h5: ({ children }) => <strong className="block">{children}</strong>,
  h6: ({ children }) => <strong className="block">{children}</strong>,
  img: ({ alt }) => <span className="block">{alt ?? ""}</span>,
  li: ({ children }) => <span className="block">{children}</span>,
  ol: ({ children }) => <span className="block">{children}</span>,
  p: ({ children }) => <span className="block">{children}</span>,
  pre: ({ children }) => <span className="block">{children}</span>,
  table: ({ children }) => <span className="block">{children}</span>,
  tbody: ({ children }) => <span className="block">{children}</span>,
  td: ({ children }) => <span>{children} </span>,
  th: ({ children }) => <span>{children} </span>,
  thead: ({ children }) => <span className="block">{children}</span>,
  tr: ({ children }) => <span className="block">{children}</span>,
  ul: ({ children }) => <span className="block">{children}</span>,
};

function isNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;

  return (
    message.includes("не найдено") ||
    message.includes("не найден") ||
    status === 404 ||
    message.includes("not found")
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function sortModelsByName(
  models: EqModelResponseDto[],
  sortOrder: "nameAsc" | "nameDesc",
) {
  return [...models].sort((left, right) => {
    const result = left.name.localeCompare(right.name, "ru", {
      sensitivity: "base",
    });

    return sortOrder === "nameAsc" ? result : -result;
  });
}

export default function HomePage() {
  const [models, setModels] = useState<EqModelResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"nameAsc" | "nameDesc">("nameAsc");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const didInitAvailabilityFilterRef = useRef(false);
  const requestIdRef = useRef(0);
  const router = useRouter();
  const { user, isAuth, isLoading: isAuthLoading } = useAuth();
  const { cart, addToCart, removeFromCart, getTotalItems } = useCart();
  const canUseBooking = canBookEquipment(user?.role);

  useEffect(() => {
    if (isAuthLoading || didInitAvailabilityFilterRef.current) {
      return;
    }

    if (isAuth && canUseBooking) {
      setOnlyAvailable(true);
    }

    didInitAvailabilityFilterRef.current = true;
  }, [isAuthLoading, isAuth, canUseBooking]);

  const loadModels = useCallback(
    async (query: string, requestId: number) => {
      try {
        setLoading(true);
        setError(null);
        let data: EqModelResponseDto[] = [];

        try {
          if (query) {
            data = await equipmentApi.get_model_by_name(query);
          } else if (selectedCategory !== "all") {
            data = await equipmentApi.get_model_by_category(
              parseInt(selectedCategory, 10) as EquipmentCategory,
            );
          } else {
            data = await equipmentApi.get_all_models();
          }
        } catch (apiError: unknown) {
          if (isNotFoundError(apiError)) {
            data = [];
          } else {
            throw apiError;
          }
        }

        if (onlyAvailable && isAuth && canUseBooking) {
          try {
            const available = await equipmentApi.available_models_to_me();
            const availableIds = new Set(available.map((item) => item.id));
            data = data.filter((item) => availableIds.has(item.id));
          } catch (availabilityError: unknown) {
            if (!isNotFoundError(availabilityError)) {
              throw availabilityError;
            }
            data = [];
          }
        }

        if (query && selectedCategory !== "all") {
          const category = parseInt(selectedCategory, 10);
          data = data.filter((item) => item.category === category);
        }

        if (requestId === requestIdRef.current) {
          setModels(data);
        }
      } catch (err: unknown) {
        console.error("Ошибка загрузки оборудования:", err);
        if (requestId === requestIdRef.current) {
          setError(
            getErrorMessage(
              err,
              query
                ? "Ошибка при поиске. Попробуйте еще раз."
                : "Не удалось загрузить оборудование. Попробуйте позже.",
            ),
          );
          setModels([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [canUseBooking, isAuth, onlyAvailable, selectedCategory],
  );

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const query = searchQuery.trim();
    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(
      () => void loadModels(query, requestId),
      query ? 500 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [isAuthLoading, loadModels, searchQuery]);

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategory("all");
    setOnlyAvailable(false);
    setSortOrder("nameAsc");
    setError(null);
  }

  function getCartQuantity(modelId: number): number {
    return cart[modelId]?.quantity || 0;
  }

  async function handleAddToCart(model: EqModelResponseDto) {
    if (!isAuth) {
      router.push("/login");
      return;
    }

    if (!canUseBooking) {
      alert("Представителям организаций недоступно бронирование оборудования");
      return;
    }

    try {
      await addToCart(model);
    } catch (error) {
      console.error("Ошибка добавления в корзину:", error);
      alert("Не удалось добавить оборудование в корзину");
    }
  }

  async function handleRemoveFromCart(modelId: number) {
    try {
      await removeFromCart(modelId);
    } catch (error) {
      console.error("Ошибка удаления из корзины:", error);
      alert("Не удалось изменить корзину");
    }
  }

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== "all" ||
    onlyAvailable ||
    sortOrder !== "nameAsc";
  const sortedModels = useMemo(
    () => sortModelsByName(models, sortOrder),
    [models, sortOrder],
  );

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск оборудования..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full md:w-[250px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {Object.entries(categoryNames).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortOrder}
              onValueChange={(value) =>
                setSortOrder(value as "nameAsc" | "nameDesc")
              }
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nameAsc">По названию: А-Я</SelectItem>
                <SelectItem value="nameDesc">По названию: Я-А</SelectItem>
              </SelectContent>
            </Select>

            {isAuth && canUseBooking && (
              <Button
                variant={onlyAvailable ? "default" : "outline"}
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className="whitespace-nowrap"
              >
                Доступные мне
              </Button>
            )}

            {canUseBooking && getTotalItems() > 0 && (
              <Button
                onClick={() => router.push("/cart")}
                className="whitespace-nowrap"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Бронирование ({getTotalItems()})
              </Button>
            )}

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
              {selectedCategory !== "all" && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  {
                    categoryNames[
                      parseInt(selectedCategory, 10) as EquipmentCategory
                    ]
                  }
                </span>
              )}
              {onlyAvailable && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  Только доступные
                </span>
              )}
              {sortOrder !== "nameAsc" && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  По названию: Я-А
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
                <p className="text-sm font-medium text-destructive mb-1">
                  Произошла ошибка
                </p>
                <p className="text-sm text-destructive/80">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    const requestId = ++requestIdRef.current;
                    void loadModels(searchQuery.trim(), requestId);
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
        ) : models.length === 0 ? (
          <div className="text-center py-12 bg-card/30 border border-border/50 rounded-xl">
            <div className="max-w-md mx-auto px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasActiveFilters
                  ? "Ничего не найдено"
                  : "Оборудование отсутствует"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "Попробуйте изменить параметры поиска или фильтры"
                  : "В данный момент в базе нет оборудования"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {sortedModels.map((model) => {
              const quantity = getCartQuantity(model.id);

              return (
                <div
                  key={model.id}
                  className="relative backdrop-blur-sm bg-card/70 border border-border/50 rounded-2xl p-3 sm:p-5 overflow-hidden hover:bg-card/90 transition-all group flex flex-col"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>

                  <Link
                    href={`/equipment/${model.id}`}
                    className="relative flex flex-col flex-1 cursor-pointer"
                  >
                    <div className="mb-3 sm:mb-4">
                      <div className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                        {categoryNames[model.category]}
                      </div>
                      <h2 className="text-base sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {model.name}
                      </h2>
                    </div>

                    {model.description && (
                      <div className="mb-3 line-clamp-3 break-words text-xs leading-relaxed text-muted-foreground sm:mb-4 sm:text-sm">
                        <ReactMarkdown
                          components={markdownPreviewComponents}
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          skipHtml
                        >
                          {model.description}
                        </ReactMarkdown>
                      </div>
                    )}

                    {Object.keys(model.attributes).length > 0 && (
                      <div className="space-y-2 mb-4">
                        {Object.entries(model.attributes)
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-2 bg-secondary/30 backdrop-blur rounded-lg px-2 sm:px-3 py-2"
                            >
                              <span className="min-w-0 truncate text-[10px] sm:text-xs text-muted-foreground font-medium">
                                {key}
                              </span>
                              <span className="min-w-0 truncate text-[10px] sm:text-xs text-foreground font-semibold">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs mt-auto pt-3 border-t border-border/30">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          model.access === EquipmentAccess.User
                            ? "bg-green-500"
                            : model.access === EquipmentAccess.Osnova
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        } shadow-lg`}
                      ></div>
                      <span className="text-muted-foreground">
                        <span className="text-foreground font-medium">
                          {accessNames[model.access]}
                        </span>
                      </span>
                    </div>
                  </Link>

                  <div className="relative mt-3">
                    {quantity === 0 ? (
                      <Button
                        onClick={() => void handleAddToCart(model)}
                        className="w-full h-10"
                        size="sm"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />В бронь
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between bg-primary/10 rounded-lg p-1 h-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md"
                          onClick={() => void handleRemoveFromCart(model.id)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-bold text-lg px-2 min-w-[2rem] text-center">
                          {quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md"
                          onClick={() => void handleAddToCart(model)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
