import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import type {
  EqItemResponseDto,
  EqModelResponseDto,
} from "@/app/models/equipment/equipment";
import { equipmentApi } from "@/lib/equipmentApi";

export function useEquipmentDetails(modelId: string) {
  const [model, setModel] = useState<EqModelResponseDto | null>(null);
  const [allModels, setAllModels] = useState<EqModelResponseDto[]>([]);
  const [items, setItems] = useState<EqItemResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setModel(null);
    setAllModels([]);
    setItems([]);

    async function loadData() {
      try {
        const id = Number(modelId);
        if (!Number.isInteger(id) || id <= 0) {
          throw new Error("Некорректный идентификатор оборудования");
        }
        const [modelData, modelsData, itemsData] = await Promise.all([
          equipmentApi.get_model_by_id(id),
          equipmentApi.get_all_models(),
          equipmentApi.get_items_by_model(id),
        ]);
        if (!active) return;
        setModel(modelData);
        setAllModels(modelsData);
        setItems(itemsData);
      } catch (error) {
        if (!active) return;
        setError(
          error instanceof Error
            ? error.message
            : "Ошибка загрузки оборудования",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [modelId]);

  return {
    model,
    setModel,
    allModels,
    setAllModels,
    items,
    setItems,
    loading,
    error,
  };
}

export function useEquipmentAvailability(modelId: string) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [appliedDate, setAppliedDate] = useState<DateRange | undefined>();
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [rangeAvailableItems, setRangeAvailableItems] = useState<
    EqItemResponseDto[] | null
  >(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const requestVersion = useRef(0);

  const handleClearRange = useCallback(() => {
    requestVersion.current += 1;
    setDate(undefined);
    setAppliedDate(undefined);
    setStartTime("09:00");
    setEndTime("18:00");
    setRangeLoading(false);
    setRangeError(null);
    setRangeAvailableItems(null);
    setShowDatePicker(false);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: A model change intentionally resets its period and invalidates its requests.
  useEffect(() => {
    // The keyed page also resets its admin dialogs on a model change.
    handleClearRange();
    return () => {
      requestVersion.current += 1;
    };
  }, [modelId, handleClearRange]);

  const handleConfirmDates = async () => {
    // A new confirmation invalidates an older request even when validation fails.
    const version = ++requestVersion.current;
    setRangeLoading(false);
    if (!date?.from || !date?.to) {
      setRangeError("Выберите дату начала и окончания");
      return;
    }

    const start = new Date(date.from);
    const end = new Date(date.to);
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);
    start.setHours(startHours, startMinutes, 0, 0);
    end.setHours(endHours, endMinutes, 0, 0);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      start >= end
    ) {
      setRangeError("Дата начала должна быть раньше даты окончания");
      return;
    }

    try {
      setRangeLoading(true);
      setRangeError(null);
      const available = await equipmentApi.get_available_items_by_model(
        Number(modelId),
        start.toISOString(),
        end.toISOString(),
      );
      if (requestVersion.current !== version) return;
      setRangeAvailableItems(available);
      setAppliedDate(date);
      setShowDatePicker(false);
    } catch (error) {
      if (requestVersion.current === version) {
        setRangeError(
          error instanceof Error
            ? error.message
            : "Ошибка при получении доступных экземпляров",
        );
      }
    } finally {
      if (requestVersion.current === version) setRangeLoading(false);
    }
  };

  return {
    date,
    setDate,
    appliedDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    rangeLoading,
    rangeError,
    setRangeError,
    rangeAvailableItems,
    setRangeAvailableItems,
    showDatePicker,
    setShowDatePicker,
    handleConfirmDates,
    handleClearRange,
  };
}
