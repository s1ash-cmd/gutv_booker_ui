"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CircleCheck,
  CircleX,
  Edit3,
  Hash,
  Minus,
  PackagePlus,
  Plus,
  Shield,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  type EqItemResponseDto,
  type EqModelResponseDto,
  EquipmentAccess,
  EquipmentCategory,
} from "@/app/models/equipment/equipment";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { equipmentApi } from "@/lib/equipmentApi";
import { getEquipmentRecommendations } from "@/lib/equipmentRecommendations";
import { canBookEquipment } from "@/lib/roles";
import { cn } from "@/lib/utils";

const categoryNames: Record<EquipmentCategory, string> = {
  [EquipmentCategory.Camera]: "Камера",
  [EquipmentCategory.Lens]: "Объектив",
  [EquipmentCategory.Card]: "Карта памяти",
  [EquipmentCategory.Battery]: "Аккумулятор",
  [EquipmentCategory.Charger]: "Зарядное устройство",
  [EquipmentCategory.Sound]: "Звук",
  [EquipmentCategory.Stand]: "Штатив",
  [EquipmentCategory.Light]: "Свет",
  [EquipmentCategory.Other]: "Прочее",
};

const accessNames: Record<EquipmentAccess, string> = {
  [EquipmentAccess.User]: "Все пользователи",
  [EquipmentAccess.Osnova]: "Основа",
  [EquipmentAccess.Ronin]: "Требуется разрешение",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getInventorySequence(inventoryNumber: string) {
  const parts = inventoryNumber.split("-");
  const sequence = parseInt(parts[parts.length - 1] ?? "", 10);
  return Number.isFinite(sequence) ? sequence : 0;
}

function compareInventoryItems(
  left: EqItemResponseDto,
  right: EqItemResponseDto,
) {
  const sequenceDiff =
    getInventorySequence(left.inventoryNumber) -
    getInventorySequence(right.inventoryNumber);

  return sequenceDiff === 0 ? left.id - right.id : sequenceDiff;
}

function getLastInventoryItem(items: EqItemResponseDto[]) {
  return [...items].sort(compareInventoryItems).at(-1) ?? null;
}

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();

  const { user } = useAuth();
  const { cart, addToCart, removeFromCart } = useCart();
  const isAdmin = user?.role === "Admin";
  const canUseBooking = canBookEquipment(user?.role);

  const [model, setModel] = useState<EqModelResponseDto | null>(null);
  const [allModels, setAllModels] = useState<EqModelResponseDto[]>([]);
  const [items, setItems] = useState<EqItemResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState(false);
  const [deletingModel, setDeletingModel] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteModelDialog, setShowDeleteModelDialog] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] =
    useState<EqItemResponseDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAttributesJson, setEditAttributesJson] = useState("{}");

  const [date, setDate] = useState<DateRange | undefined>();
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("18:00");

  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [rangeAvailableItems, setRangeAvailableItems] = useState<
    EqItemResponseDto[] | null
  >(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [togglingItemId, setTogglingItemId] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const id = parseInt(params.id as string);

        const [modelData, modelsData] = await Promise.all([
          equipmentApi.get_model_by_id(id),
          equipmentApi.get_all_models(),
        ]);

        let itemsData: EqItemResponseDto[] = [];
        try {
          itemsData = await equipmentApi.get_items_by_model(id);
        } catch (err) {
          console.log("Экземпляры не найдены:", err);
        }

        setModel(modelData);
        setAllModels(modelsData);
        setItems(itemsData);
      } catch (err) {
        setError("Ошибка загрузки оборудования");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  const isRangeMode = rangeAvailableItems !== null;

  const itemsToRender = useMemo(() => {
    return [...(isRangeMode ? (rangeAvailableItems ?? []) : items)].sort(
      compareInventoryItems,
    );
  }, [isRangeMode, rangeAvailableItems, items]);

  const lastInventoryItem = useMemo(() => getLastInventoryItem(items), [items]);

  const availableNowCount = useMemo(
    () => items.filter((i) => i.available).length,
    [items],
  );
  const availableInRangeCount = useMemo(
    () => rangeAvailableItems?.length ?? 0,
    [rangeAvailableItems],
  );

  const cartQuantity = model ? cart[model.id]?.quantity || 0 : 0;
  const recommendations = useMemo(
    () => (model ? getEquipmentRecommendations(model, allModels, 4) : []),
    [model, allModels],
  );

  const openEditDialog = () => {
    if (!model) {
      return;
    }

    setAdminError(null);
    setEditName(model.name);
    setEditDescription(model.description ?? "");
    setEditAttributesJson(JSON.stringify(model.attributes ?? {}, null, 2));
    setShowEditDialog(true);
  };

  const handleAddToCart = async () => {
    if (!model) {
      return;
    }

    if (!user) {
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
  };

  const handleAddRecommendedToCart = async (
    recommended: EqModelResponseDto,
  ) => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!canUseBooking) {
      alert("Представителям организаций недоступно бронирование оборудования");
      return;
    }

    try {
      await addToCart(recommended);
    } catch (error) {
      console.error("Ошибка добавления рекомендации в корзину:", error);
      alert("Не удалось добавить оборудование в корзину");
    }
  };

  const handleRemoveFromCart = async () => {
    if (!model) {
      return;
    }

    try {
      await removeFromCart(model.id);
    } catch (error) {
      console.error("Ошибка изменения корзины:", error);
      alert("Не удалось изменить корзину");
    }
  };

  const handleCreateItem = async () => {
    if (!model) return;

    try {
      setCreatingItem(true);
      await equipmentApi.create_item(model.id);

      const itemsData = await equipmentApi.get_items_by_model(model.id);
      setItems(itemsData);
    } catch (err) {
      console.error("Ошибка создания экземпляра:", err);
      alert("Не удалось создать экземпляр");
    } finally {
      setCreatingItem(false);
    }
  };

  const handleUpdateModelProperties = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!model) {
      return;
    }

    const name = editName.trim();
    const description = editDescription.trim();
    const attributesJson = editAttributesJson.trim() || "{}";

    if (!name) {
      setAdminError("Название не может быть пустым");
      return;
    }

    try {
      const parsedAttributes = JSON.parse(attributesJson);
      if (
        parsedAttributes === null ||
        Array.isArray(parsedAttributes) ||
        typeof parsedAttributes !== "object"
      ) {
        setAdminError("JSON свойства оборудования должны быть объектом");
        return;
      }
    } catch {
      setAdminError("JSON свойства оборудования заполнены некорректно");
      return;
    }

    try {
      setEditingModel(true);
      setAdminError(null);

      const updatedModel = await equipmentApi.update_model_properties(
        model.id,
        {
          name,
          description,
          attributesJson,
        },
      );

      setModel(updatedModel);
      setAllModels((prevModels) =>
        prevModels.map((item) =>
          item.id === updatedModel.id ? updatedModel : item,
        ),
      );
      setShowEditDialog(false);
    } catch (err) {
      setAdminError(
        getErrorMessage(err, "Не удалось обновить свойства оборудования"),
      );
    } finally {
      setEditingModel(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!model) {
      return;
    }

    try {
      setDeletingModel(true);
      setAdminError(null);
      await equipmentApi.delete_model(model.id);
      router.push("/");
    } catch (err) {
      setAdminError(getErrorMessage(err, "Не удалось удалить модель"));
      setShowDeleteModelDialog(false);
    } finally {
      setDeletingModel(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemPendingDelete || !model) {
      return;
    }

    if (itemPendingDelete.id !== lastInventoryItem?.id) {
      setAdminError(
        lastInventoryItem
          ? `Удалить можно только последний экземпляр: ${lastInventoryItem.inventoryNumber}`
          : "Удалить можно только последний экземпляр модели",
      );
      setItemPendingDelete(null);
      return;
    }

    try {
      setDeletingItemId(itemPendingDelete.id);
      setAdminError(null);
      await equipmentApi.delete_item(itemPendingDelete.id);
      setItems((prevItems) =>
        prevItems.filter((item) => item.id !== itemPendingDelete.id),
      );
      setRangeAvailableItems((prevItems) =>
        prevItems
          ? prevItems.filter((item) => item.id !== itemPendingDelete.id)
          : null,
      );
      setItemPendingDelete(null);
    } catch (err) {
      setAdminError(getErrorMessage(err, "Не удалось удалить экземпляр"));
      setItemPendingDelete(null);
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleConfirmDates = async () => {
    if (!model || !date?.from || !date?.to) {
      setRangeError("Выберите дату начала и окончания");
      return;
    }

    const start = new Date(date.from);
    start.setHours(
      parseInt(startTime.split(":")[0], 10),
      parseInt(startTime.split(":")[1], 10),
    );

    const end = new Date(date.to);
    end.setHours(
      parseInt(endTime.split(":")[0], 10),
      parseInt(endTime.split(":")[1], 10),
    );

    if (start >= end) {
      setRangeError("Дата начала должна быть раньше даты окончания");
      return;
    }

    try {
      setRangeLoading(true);
      setRangeError(null);

      const available = await equipmentApi.get_available_items_by_model(
        model.id,
        start.toISOString(),
        end.toISOString(),
      );

      setRangeAvailableItems(available);
      setShowDatePicker(false);
    } catch (e) {
      console.error(e);
      setRangeError("Ошибка при получении доступных экземпляров");
    } finally {
      setRangeLoading(false);
    }
  };

  const handleClearRange = () => {
    setDate(undefined);
    setStartTime("09:00");
    setEndTime("18:00");
    setRangeError(null);
    setRangeAvailableItems(null);
  };

  const handleToggleAvailability = async (itemId: number) => {
    try {
      setTogglingItemId(itemId);
      await equipmentApi.toggle_item_available(itemId);

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, available: !item.available } : item,
        ),
      );

      if (rangeAvailableItems) {
        setRangeAvailableItems(
          (prevItems) =>
            prevItems?.map((item) =>
              item.id === itemId
                ? { ...item, available: !item.available }
                : item,
            ) ?? null,
        );
      }
    } catch (error) {
      console.error("Ошибка переключения доступности:", error);
      alert("Не удалось изменить доступность элемента");
    } finally {
      setTogglingItemId(null);
    }
  };

  const formatDateRange = () => {
    if (!date?.from || !date?.to) return "Выберите период";
    return `${format(date.from, "d MMM", { locale: ru })} → ${format(date.to, "d MMM", { locale: ru })}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </main>
    );
  }

  if (error || !model) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-destructive">
            {error || "Оборудование не найдено"}
          </p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => router.push("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться назад
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к списку
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {adminError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {adminError}
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-6">
              <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-xs font-semibold mb-3">
                {categoryNames[model.category]}
              </span>
              <h1 className="text-3xl font-bold text-foreground">
                {model.name}
              </h1>
              {model.description && (
                <p className="text-muted-foreground mt-3">
                  {model.description}
                </p>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Проверка доступности
              </h2>

              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowDatePicker(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowDatePicker(true);
                  }
                }}
                className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border border-primary/20 rounded-xl transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground font-medium">
                      Выбранный период
                    </div>
                    <div className="text-sm font-semibold">
                      {formatDateRange()}
                    </div>
                  </div>
                </div>
                {(date || isRangeMode) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearRange();
                    }}
                    className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {rangeError && (
                <p className="text-xs text-destructive mt-3 flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {rangeError}
                </p>
              )}

              {isRangeMode && (
                <div className="mt-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Найдено {availableInRangeCount} свободных экземпляров в
                    выбранный период
                  </p>
                </div>
              )}
            </div>

            {Object.keys(model.attributes).length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Технические характеристики
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(model.attributes).map(([key, value]) => (
                    <div key={key} className="border-l-2 border-primary pl-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        {key}
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(items.length > 0 || isRangeMode) && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  Экземпляры оборудования
                </h2>

                <div className="space-y-2">
                  {itemsToRender.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      {isRangeMode
                        ? "Нет доступных экземпляров в выбранный период"
                        : "Нет экземпляров"}
                    </div>
                  ) : (
                    itemsToRender.map((item) => {
                      const isAvailable = isRangeMode || item.available;
                      const isToggling = togglingItemId === item.id;
                      const canDeleteItem = item.id === lastInventoryItem?.id;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors",
                            isAvailable
                              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full",
                                isAvailable ? "bg-green-500" : "bg-red-500",
                              )}
                            />
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm font-semibold">
                              {item.inventoryNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded-full",
                                isAvailable
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
                              )}
                            >
                              {isAvailable ? "Доступен" : "Недоступен"}
                            </span>

                            {isAdmin && !isRangeMode && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleToggleAvailability(item.id)
                                  }
                                  disabled={isToggling}
                                  className={cn(
                                    "h-8 w-8 p-0 transition-colors",
                                    isAvailable
                                      ? "text-red-600 hover:text-red-700 hover:bg-green-100 dark:hover:bg-red-900/30"
                                      : "text-green-600 hover:text-green-700 hover:bg-red-100 dark:hover:bg-green-900/30",
                                  )}
                                  title={
                                    isAvailable
                                      ? "Сделать недоступным"
                                      : "Сделать доступным"
                                  }
                                >
                                  {isToggling ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : isAvailable ? (
                                    <CircleX className="h-4 w-4" />
                                  ) : (
                                    <CircleCheck className="h-4 w-4" />
                                  )}
                                </Button>

                                {canDeleteItem && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setItemPendingDelete(item)}
                                    disabled={deletingItemId === item.id}
                                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    title="Удалить последний экземпляр"
                                  >
                                    {deletingItemId === item.id ? (
                                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Статистика</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Всего единиц
                    </span>
                    <span className="text-2xl font-bold">{items.length}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                {!isRangeMode ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Доступно сейчас
                      </span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {availableNowCount}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${items.length > 0 ? (availableNowCount / items.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Свободно в период
                      </span>
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {availableInRangeCount}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${items.length > 0 ? (availableInRangeCount / items.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Уровень доступа</h3>
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Shield
                  className={cn(
                    "w-5 h-5",
                    model.access === EquipmentAccess.User
                      ? "text-green-500"
                      : model.access === EquipmentAccess.Osnova
                        ? "text-yellow-500"
                        : "text-red-500",
                  )}
                />
                <div>
                  <div className="text-sm font-semibold">
                    {accessNames[model.access]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {model.access === EquipmentAccess.User &&
                      "Доступно всем пользователям"}
                    {model.access === EquipmentAccess.Osnova &&
                      "Доступно только основе"}
                    {model.access === EquipmentAccess.Ronin &&
                      "Требуется сдать экзамен"}
                  </div>
                </div>
              </div>
            </div>

            {recommendations.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <PackagePlus className="h-4 w-4 text-primary" />
                  Можно взять вместе
                </h3>

                <div className="divide-y divide-border">
                  {recommendations.map((recommended) => (
                    <div
                      key={recommended.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/equipment/${recommended.id}`)
                        }
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-sm font-medium">
                          {recommended.name}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {categoryNames[recommended.category]}
                        </div>
                      </button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() =>
                          void handleAddRecommendedToCart(recommended)
                        }
                        title="Добавить в бронирование"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="mb-3 text-sm font-semibold">Управление</h3>
                <div className="space-y-2">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={openEditDialog}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Изменить свойства
                  </Button>

                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={handleCreateItem}
                    disabled={creatingItem}
                  >
                    {creatingItem ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Создание...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Создать экземпляр
                      </>
                    )}
                  </Button>

                  <Button
                    className="w-full justify-start text-destructive hover:text-destructive"
                    variant="outline"
                    onClick={() => setShowDeleteModelDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить модель
                  </Button>
                </div>
              </div>
            )}

            {cartQuantity === 0 ? (
              <Button
                className="w-full"
                size="lg"
                onClick={() => void handleAddToCart()}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />В бронирование
              </Button>
            ) : (
              <div className="flex items-center justify-between bg-primary/10 rounded-lg p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-md"
                  onClick={() => void handleRemoveFromCart()}
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <span className="font-bold text-xl px-4">{cartQuantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-md"
                  onClick={() => void handleAddToCart()}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[95vw] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:max-w-[650px] md:max-w-[750px]">
          <DialogHeader>
            <DialogTitle>Выбор периода</DialogTitle>
            <DialogDescription>
              Выберите даты и время начала и окончания бронирования
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex justify-center w-full overflow-x-auto">
              <Calendar
                mode="range"
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={ru}
                className="rounded-lg border p-2"
                classNames={{
                  months:
                    "flex flex-col sm:flex-row space-y-4 sm:space-x-2 sm:space-y-0",
                  month: "space-y-2",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-xs sm:text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button:
                    "h-6 w-6 sm:h-7 sm:w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-0 sm:left-1",
                  nav_button_next: "absolute right-0 sm:right-1",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell:
                    "text-muted-foreground rounded-md w-7 sm:w-9 font-normal text-[10px] sm:text-xs",
                  row: "flex w-full mt-0.5 sm:mt-1",
                  cell: "h-7 w-7 sm:h-9 sm:w-9 text-center text-xs sm:text-sm p-0 relative",
                  day: "h-7 w-7 sm:h-9 sm:w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
                  day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground font-semibold",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
              />
            </div>

            <Separator />
            <div className="grid grid-cols-2 gap-3 px-2 sm:px-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="text-xs sm:text-sm">
                  Время начала
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 sm:h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-xs sm:text-sm">
                  Время окончания
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9 sm:h-10"
                />
              </div>
            </div>

            {date?.from && date?.to && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 sm:p-3 mx-2 sm:mx-4">
                <p className="text-xs sm:text-sm font-medium text-center wrap-break-word">
                  {format(date.from, "d MMMM yyyy", { locale: ru })} в{" "}
                  {startTime} → {format(date.to, "d MMMM yyyy", { locale: ru })}{" "}
                  в {endTime}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pb-[env(safe-area-inset-bottom)] flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowDatePicker(false);
                setRangeError(null);
              }}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirmDates}
              disabled={rangeLoading || !date?.from || !date?.to}
              className="w-full sm:w-auto"
            >
              {rangeLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Проверяем...
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Применить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={handleUpdateModelProperties} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Свойства оборудования</DialogTitle>
              <DialogDescription>
                Измените название, описание и JSON свойства модели.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="equipment-name">Название</Label>
              <Input
                id="equipment-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                disabled={editingModel}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment-description">Описание</Label>
              <Textarea
                id="equipment-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
                disabled={editingModel}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment-attributes">JSON свойства</Label>
              <Textarea
                id="equipment-attributes"
                value={editAttributesJson}
                onChange={(event) => setEditAttributesJson(event.target.value)}
                rows={8}
                className="font-mono text-sm"
                disabled={editingModel}
                spellCheck={false}
              />
            </div>

            {adminError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {adminError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={editingModel}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={editingModel}>
                {editingModel ? "Сохраняем..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeleteModelDialog}
        onOpenChange={setShowDeleteModelDialog}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Удалить модель?</DialogTitle>
            <DialogDescription>
              Модель и все ее экземпляры будут удалены из каталога.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModelDialog(false)}
              disabled={deletingModel}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteModel}
              disabled={deletingModel}
            >
              {deletingModel ? "Удаляем..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={itemPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setItemPendingDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Удалить экземпляр?</DialogTitle>
            <DialogDescription>
              Экземпляр {itemPendingDelete?.inventoryNumber} будет удален из
              этой модели.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setItemPendingDelete(null)}
              disabled={deletingItemId !== null}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={deletingItemId !== null}
            >
              {deletingItemId !== null ? "Удаляем..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
