"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, X, AlertCircle, Plus, Minus, ShoppingCart } from 'lucide-react';
import { equipmentApi } from '@/lib/equipmentApi';
import { EqModelResponseDto, EquipmentCategory, EquipmentAccess } from '@/app/types/equipment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

const categoryNames: Record<EquipmentCategory, string> = {
  [EquipmentCategory.Camera]: 'Камера',
  [EquipmentCategory.Lens]: 'Объектив',
  [EquipmentCategory.Card]: 'Карта памяти',
  [EquipmentCategory.Battery]: 'Аккумулятор',
  [EquipmentCategory.Charger]: 'Зарядное устройство',
  [EquipmentCategory.Sound]: 'Звук',
  [EquipmentCategory.Stand]: 'Штатив',
  [EquipmentCategory.Light]: 'Свет',
  [EquipmentCategory.Other]: 'Прочее',
};

const accessNames: Record<EquipmentAccess, string> = {
  [EquipmentAccess.User]: 'Все пользователи',
  [EquipmentAccess.Osnova]: 'Основа',
  [EquipmentAccess.Ronin]: 'Требуется разрешение',
};

function isNotFoundError(error: any): boolean {
  return (
    error?.message?.includes('не найдено') ||
    error?.message?.includes('не найден') ||
    error?.status === 404 ||
    error?.message?.toLowerCase().includes('not found')
  );
}

export default function HomePage() {
  const [models, setModels] = useState<EqModelResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const router = useRouter();
  const { isAuth } = useAuth();
  const { cart, addToCart, removeFromCart, getTotalItems } = useCart();

  useEffect(() => {
    loadModels();
  }, [selectedCategory, onlyAvailable]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchByName();
      } else {
        loadModels();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function loadModels() {
    try {
      setLoading(true);
      setError(null);
      let data: EqModelResponseDto[] = [];

      try {
        if (onlyAvailable && isAuth && selectedCategory !== 'all') {
          const availableData = await equipmentApi.available_models_to_me();
          data = availableData.filter(m => m.category === parseInt(selectedCategory));
        } else if (onlyAvailable && isAuth) {
          data = await equipmentApi.available_models_to_me();
        } else if (selectedCategory !== 'all') {
          data = await equipmentApi.get_model_by_category(parseInt(selectedCategory) as EquipmentCategory);
        } else {
          data = await equipmentApi.get_all_models();
        }
      } catch (apiError: any) {
        if (isNotFoundError(apiError)) {
          data = [];
        } else {
          throw apiError;
        }
      }

      setModels(data);
    } catch (err: any) {
      console.error('Ошибка загрузки оборудования:', err);
      setError(err?.message || 'Не удалось загрузить оборудование. Попробуйте позже.');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  async function searchByName() {
    try {
      setLoading(true);
      setError(null);

      let data: EqModelResponseDto[] = [];

      try {
        const searchResult = await equipmentApi.get_model_by_name(searchQuery.trim());
        data = searchResult;
      } catch (searchError: any) {
        if (isNotFoundError(searchError)) {
          data = [];
        } else {
          throw searchError;
        }
      }

      if (onlyAvailable && isAuth) {
        try {
          const available = await equipmentApi.available_models_to_me();
          const availableIds = new Set(available.map(m => m.id));
          data = data.filter(m => availableIds.has(m.id));
        } catch (availError: any) {
          if (!isNotFoundError(availError)) {
            throw availError;
          }
          data = [];
        }
      }

      if (selectedCategory !== 'all') {
        data = data.filter(m => m.category === parseInt(selectedCategory));
      }

      setModels(data);
    } catch (err: any) {
      console.error('Ошибка поиска:', err);
      setError(err?.message || 'Ошибка при поиске. Попробуйте еще раз.');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setSearchQuery('');
    setSelectedCategory('all');
    setOnlyAvailable(false);
    setError(null);
  }

  function getCartQuantity(modelId: number): number {
    return cart[modelId]?.quantity || 0;
  }

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || onlyAvailable;

  return (
    <main className="bg-background py-6 px-4">
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

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

            {isAuth && (
              <Button
                variant={onlyAvailable ? 'default' : 'outline'}
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className="whitespace-nowrap"
              >
                Доступные мне
              </Button>
            )}

            {getTotalItems() > 0 && (
              <Button
                onClick={() => router.push('/cart')}
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
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  {categoryNames[parseInt(selectedCategory) as EquipmentCategory]}
                </span>
              )}
              {onlyAvailable && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  Только доступные
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
                    if (searchQuery.trim()) {
                      searchByName();
                    } else {
                      loadModels();
                    }
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
                {hasActiveFilters ? 'Ничего не найдено' : 'Оборудование отсутствует'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Попробуйте изменить параметры поиска или фильтры'
                  : 'В данный момент в базе нет оборудования'
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {models.map((model) => {
              const quantity = getCartQuantity(model.id);

              return (
                <div
                  key={model.id}
                  className="relative backdrop-blur-sm bg-card/70 border border-border/50 rounded-2xl p-5 overflow-hidden hover:bg-card/90 transition-all group flex flex-col"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>

                  <div
                    onClick={() => router.push(`/equipment/${model.id}`)}
                    className="relative flex flex-col flex-1 cursor-pointer"
                  >
                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                        {categoryNames[model.category]}
                      </div>
                      <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {model.name}
                      </h2>
                    </div>

                    {model.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {model.description}
                      </p>
                    )}

                    {Object.keys(model.attributes).length > 0 && (
                      <div className="space-y-2 mb-4">
                        {Object.entries(model.attributes).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between bg-secondary/30 backdrop-blur rounded-lg px-3 py-2">
                            <span className="text-xs text-muted-foreground font-medium">{key}</span>
                            <span className="text-xs text-foreground font-semibold">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs mt-auto pt-3 border-t border-border/30">
                      <div className={`w-2 h-2 rounded-full ${model.access === EquipmentAccess.User ? 'bg-green-500' :
                        model.access === EquipmentAccess.Osnova ? 'bg-yellow-500' :
                          'bg-red-500'
                        } shadow-lg`}></div>
                      <span className="text-muted-foreground">
                        <span className="text-foreground font-medium">{accessNames[model.access]}</span>
                      </span>
                    </div>
                  </div>

                  <div className="relative mt-3" onClick={(e) => e.stopPropagation()}>
                    {quantity === 0 ? (
                      <Button
                        onClick={() => addToCart(model)}
                        className="w-full h-10"
                        size="sm"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        В бронирование
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between bg-primary/10 rounded-lg p-1 h-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md"
                          onClick={() => removeFromCart(model.id)}
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
                          onClick={() => addToCart(model)}
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
