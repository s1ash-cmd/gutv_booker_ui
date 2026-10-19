import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { EqModelResponseDto } from "@/app/models/equipment/equipment";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cartApi } from "@/lib/cartApi";
import { equipmentApi } from "@/lib/equipmentApi";
import { canBookEquipment } from "@/lib/roles";
import { getErrorMessage } from "@/lib/userFacingMessages";

export function useEquipmentBooking() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, cartDraft, isCartLoading, isCartUpdating, setItemSelection } =
    useCart();
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [pickerModel, setPickerModel] = useState<EqModelResponseDto | null>(
    null,
  );
  const [pendingId, setPendingId] = useState<number | null>(null);
  const pending = useRef(false);
  const session = useRef(user);
  session.current = user;

  useEffect(() => {
    let active = true;
    void equipmentApi.get_inventory_counts().then(
      (result) => {
        if (active) setCounts(result);
      },
      () => {
        /* A click can still fetch the model's current inventory. */
      },
    );
    return () => {
      active = false;
    };
  }, []);

  function getLabel(modelId: number, count = counts[modelId]) {
    if (pendingId === modelId) return "Добавление…";
    if (count === 1) {
      return cart[modelId]?.selectedItemIds.length ? "В брони" : "В бронь";
    }
    return "Выбрать экземпляр";
  }

  async function select(model: EqModelResponseDto, count = counts[model.id]) {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!canBookEquipment(user.role)) {
      toast.error("Бронирование недоступно для вашего аккаунта");
      return;
    }
    if (pending.current || isCartLoading || isCartUpdating) return;
    if (count !== undefined && count !== 1) {
      setPickerModel(model);
      return;
    }

    pending.current = true;
    setPendingId(model.id);
    const actor = user;
    try {
      const from = new Date(cartDraft.startTime);
      const to = new Date(cartDraft.endTime);
      const hasPeriod =
        Number.isFinite(from.getTime()) &&
        Number.isFinite(to.getTime()) &&
        from < to;
      const options = await cartApi.get_equipment_options(
        model.id,
        hasPeriod ? from.toISOString() : null,
        hasPeriod ? to.toISOString() : null,
      );
      if (session.current !== actor) return;
      setCounts((previous) => ({ ...previous, [model.id]: options.length }));
      if (options.length !== 1) {
        setPickerModel(model);
        return;
      }
      const item = options[0];
      if (cart[model.id]?.selectedItemIds.includes(item.id)) {
        router.push("/cart");
        return;
      }
      if (!item.operable || item.available === false) {
        toast.error(
          !item.operable
            ? "Экземпляр неисправен"
            : "Экземпляр занят в выбранный период",
        );
        return;
      }
      await setItemSelection(model.id, [item.id]);
      toast.success("Добавлено в бронь");
    } catch (error) {
      if (session.current === actor)
        toast.error(getErrorMessage(error, "Не удалось добавить в бронь"));
    } finally {
      pending.current = false;
      setPendingId(null);
    }
  }

  return {
    getLabel,
    select,
    pickerModel,
    closePicker: () => setPickerModel(null),
    isBusy: isCartLoading || isCartUpdating || pendingId !== null,
  };
}
