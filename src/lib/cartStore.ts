import type { BookingResponseDto } from "../app/models/booking/booking";
import type {
  CartDetailsDto,
  CartResponseDto,
  UpdateCartDetailsDto,
} from "../app/models/cart/cart";
import type { EqModelResponseDto } from "../app/models/equipment/equipment";

export type CartDraft = {
  reason: string;
  startTime: string;
  endTime: string;
  comment: string;
};

export type CartItem = { model: EqModelResponseDto; quantity: number };

export type CartState = {
  cart: Record<number, CartItem>;
  cartDetails: CartDetailsDto;
  cartDraft: CartDraft;
  editingBookingId: number | null;
  isCartLoading: boolean;
  isCartUpdating: boolean;
};

type CartApi = {
  get_my_cart(): Promise<CartResponseDto>;
  add_cart_item(modelId: number, quantity: number): Promise<CartResponseDto>;
  update_cart_item_quantity(
    modelId: number,
    quantity: number,
  ): Promise<CartResponseDto>;
  remove_cart_item(modelId: number): Promise<CartResponseDto>;
  clear_cart(): Promise<void>;
  add_booking_items_to_cart(bookingId: number): Promise<CartResponseDto>;
  prepare_booking_edit(bookingId: number): Promise<CartResponseDto>;
  set_cart_details(details: UpdateCartDetailsDto): Promise<CartResponseDto>;
  create_booking_from_cart(): Promise<BookingResponseDto>;
  update_booking_from_cart(bookingId: number): Promise<BookingResponseDto>;
};

type CartStoreOptions = {
  getSessionKey(): string | null;
  getDraftStorage?():
    | Pick<Storage, "getItem" | "setItem" | "removeItem">
    | undefined;
};

const draftFields = ["reason", "startTime", "endTime", "comment"] as const;
const emptyDraft: CartDraft = {
  reason: "",
  startTime: "",
  endTime: "",
  comment: "",
};
const emptyDetails: CartDetailsDto = {
  reason: "",
  startTime: null,
  endTime: null,
  comment: null,
};

function emptyState(isCartLoading: boolean): CartState {
  return {
    cart: {},
    cartDetails: { ...emptyDetails },
    cartDraft: { ...emptyDraft },
    editingBookingId: null,
    isCartLoading,
    isCartUpdating: false,
  };
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

class CartSessionChangedError extends Error {
  constructor() {
    super("Сессия корзины изменилась. Повторите действие");
    this.name = "SessionChangedError";
  }
}

export function createCartStore(api: CartApi, options: CartStoreOptions) {
  let state = emptyState(true);
  const serverSnapshot = state;
  let sessionKey: string | null = null;
  let didSyncSession = false;
  let generation = 0;
  let pending = 0;
  let pendingReads = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const dirtyFields = new Set<keyof CartDraft>();
  const listeners = new Set<() => void>();

  function publish(next: CartState) {
    state = next;
    for (const listener of listeners) listener();
  }

  function storageKey() {
    return `gutv-booker:cart-draft:${sessionKey}`;
  }

  function persistDraft(remove = false) {
    if (!sessionKey) return;
    try {
      const storage = options.getDraftStorage?.();
      if (remove) storage?.removeItem(storageKey());
      else
        storage?.setItem(
          storageKey(),
          JSON.stringify({
            sessionKey,
            draft: state.cartDraft,
            dirtyFields: [...dirtyFields],
            editingBookingId: state.editingBookingId,
          }),
        );
    } catch {
      // Storage may be disabled or full; the in-memory draft remains available.
    }
  }

  function syncSession() {
    const current = options.getSessionKey();
    if (didSyncSession && current === sessionKey) return;
    didSyncSession = true;
    sessionKey = current;
    generation++;
    pending = 0;
    pendingReads = 0;
    queue = Promise.resolve();
    dirtyFields.clear();
    let next = emptyState(Boolean(current));
    if (current) {
      try {
        const saved = JSON.parse(
          options.getDraftStorage?.()?.getItem(storageKey()) ?? "null",
        ) as {
          sessionKey?: string;
          draft?: Partial<CartDraft>;
          dirtyFields?: unknown;
          editingBookingId?: unknown;
        } | null;
        if (
          saved?.sessionKey === current &&
          saved.draft &&
          draftFields.every(
            (field) => typeof saved.draft?.[field] === "string",
          ) &&
          Array.isArray(saved.dirtyFields) &&
          (saved.editingBookingId === null ||
            (Number.isInteger(saved.editingBookingId) &&
              Number(saved.editingBookingId) > 0))
        ) {
          for (const field of draftFields) {
            if (saved.dirtyFields.includes(field)) dirtyFields.add(field);
          }
          next = {
            ...next,
            cartDraft: saved.draft as CartDraft,
            editingBookingId: saved.editingBookingId as number | null,
          };
        }
      } catch {
        // Invalid persisted drafts never prevent loading the server cart.
      }
    }
    publish(next);
  }

  function enqueue<T>(
    operation: (checkSession: () => void) => Promise<T>,
    read = false,
  ): Promise<T> {
    syncSession();
    const expectedKey = sessionKey;
    const expectedGeneration = generation;
    if (!expectedKey)
      return Promise.reject(
        new Error("Для работы с корзиной войдите в аккаунт"),
      );
    const checkSession = () => {
      if (
        expectedGeneration !== generation ||
        expectedKey !== sessionKey ||
        options.getSessionKey() !== expectedKey
      ) {
        throw new CartSessionChangedError();
      }
    };
    pending++;
    if (read) pendingReads++;
    publish({
      ...state,
      isCartUpdating: true,
      isCartLoading: pendingReads > 0,
    });
    const result = queue.then(async () => {
      checkSession();
      try {
        return await operation(checkSession);
      } catch (error) {
        checkSession();
        throw error;
      }
    });
    // Each caller sees its own failure, while later jobs can still run.
    queue = result.catch(() => undefined);
    return result.finally(() => {
      if (expectedGeneration === generation && expectedKey === sessionKey) {
        pending--;
        if (read) pendingReads--;
        publish({
          ...state,
          isCartUpdating: pending > 0,
          isCartLoading: pendingReads > 0,
        });
      }
    });
  }

  function applyCart(remote: CartResponseDto, resetDraft = false) {
    if (resetDraft || remote.editingBookingId !== state.editingBookingId)
      dirtyFields.clear();
    const remoteDraft: CartDraft = {
      reason: remote.reason,
      startTime: toDatetimeLocal(remote.startTime),
      endTime: toDatetimeLocal(remote.endTime),
      comment: remote.comment ?? "",
    };
    for (const field of dirtyFields)
      remoteDraft[field] = state.cartDraft[field];
    publish({
      ...state,
      cart: Object.fromEntries(
        remote.items.map((item) => [
          item.model.id,
          { model: item.model, quantity: item.quantity },
        ]),
      ),
      cartDetails: {
        reason: remote.reason,
        startTime: remote.startTime,
        endTime: remote.endTime,
        comment: remote.comment,
      },
      cartDraft: remoteDraft,
      editingBookingId: remote.editingBookingId,
    });
    persistDraft(resetDraft);
  }

  function resetCart() {
    dirtyFields.clear();
    publish({
      ...emptyState(state.isCartLoading),
      isCartUpdating: state.isCartUpdating,
    });
    persistDraft(true);
  }

  function remoteCartOperation(
    request: () => Promise<CartResponseDto>,
    resetDraft = false,
    read = false,
  ) {
    return enqueue(async (check) => {
      const remote = await request();
      check();
      applyCart(remote, resetDraft);
    }, read);
  }

  async function checkout(check: () => void, bookingId?: number | null) {
    const booking = bookingId
      ? await api.update_booking_from_cart(bookingId)
      : await api.create_booking_from_cart();
    check();
    resetCart();
    return booking;
  }

  return {
    getSnapshot: () => state,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncSession,
    updateCartDraft(patch: Partial<CartDraft>) {
      syncSession();
      if (!sessionKey)
        throw new Error("Для работы с корзиной войдите в аккаунт");
      for (const field of draftFields) {
        if (patch[field] !== undefined) dirtyFields.add(field);
      }
      publish({ ...state, cartDraft: { ...state.cartDraft, ...patch } });
      persistDraft();
    },
    refreshCart: () =>
      remoteCartOperation(() => api.get_my_cart(), false, true),
    addToCart: (model: EqModelResponseDto) =>
      remoteCartOperation(() => api.add_cart_item(model.id, 1)),
    removeFromCart(modelId: number) {
      return enqueue(async (check) => {
        const item = state.cart[modelId];
        if (!item) return;
        const remote =
          item.quantity > 1
            ? await api.update_cart_item_quantity(modelId, item.quantity - 1)
            : await api.remove_cart_item(modelId);
        check();
        applyCart(remote);
      });
    },
    updateQuantity: (modelId: number, quantity: number) =>
      remoteCartOperation(() =>
        quantity <= 0
          ? api.remove_cart_item(modelId)
          : api.update_cart_item_quantity(modelId, quantity),
      ),
    clearCart: () =>
      enqueue(async (check) => {
        await api.clear_cart();
        check();
        resetCart();
      }),
    addBookingItemsToCart: (bookingId: number) =>
      remoteCartOperation(() => api.add_booking_items_to_cart(bookingId)),
    prepareBookingEdit: (bookingId: number) =>
      remoteCartOperation(() => api.prepare_booking_edit(bookingId), true),
    setCartDetails: (details: UpdateCartDetailsDto) =>
      remoteCartOperation(() => api.set_cart_details(details)),
    createBookingFromCart: () => enqueue((check) => checkout(check)),
    updateBookingFromCart: (bookingId: number) =>
      enqueue((check) => checkout(check, bookingId)),
    submitBookingFromCart: (
      details: UpdateCartDetailsDto,
      bookingId?: number | null,
    ) =>
      enqueue(async (check) => {
        if ((bookingId ?? null) !== state.editingBookingId)
          throw new Error("Режим бронирования изменился. Обновите корзину");
        const remote = await api.set_cart_details(details);
        check();
        applyCart(remote);
        return checkout(check, bookingId);
      }),
  };
}
