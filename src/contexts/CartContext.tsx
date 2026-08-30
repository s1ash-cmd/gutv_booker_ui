"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { BookingResponseDto } from "@/app/models/booking/booking";
import type {
  CartDetailsDto,
  CartItemDto,
  CartResponseDto,
  UpdateCartDetailsDto,
} from "@/app/models/cart/cart";
import type { EqModelResponseDto } from "@/app/models/equipment/equipment";
import { cartApi } from "@/lib/cartApi";
import { canBookEquipment } from "@/lib/roles";
import { useAuth } from "./AuthContext";

interface CartItem {
  model: EqModelResponseDto;
  quantity: number;
}

interface CartContextType {
  cart: Record<number, CartItem>;
  cartDetails: CartDetailsDto;
  editingBookingId: number | null;
  isCartLoading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (model: EqModelResponseDto) => Promise<void>;
  removeFromCart: (modelId: number) => Promise<void>;
  updateQuantity: (modelId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  addBookingItemsToCart: (bookingId: number) => Promise<void>;
  prepareBookingEdit: (bookingId: number) => Promise<void>;
  setCartDetails: (details: UpdateCartDetailsDto) => Promise<void>;
  createBookingFromCart: () => Promise<BookingResponseDto>;
  updateBookingFromCart: (bookingId: number) => Promise<BookingResponseDto>;
  getTotalItems: () => number;
  getCartItems: () => CartItem[];
}

const emptyCartDetails: CartDetailsDto = {
  reason: "",
  startTime: null,
  endTime: null,
  comment: null,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function cartItemsToRecord(items: CartItemDto[]): Record<number, CartItem> {
  return Object.fromEntries(
    items.map((item) => [
      item.model.id,
      {
        model: item.model,
        quantity: item.quantity,
      },
    ]),
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuth, isLoading: isAuthLoading } = useAuth();
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [cartDetails, setCartDetailsState] =
    useState<CartDetailsDto>(emptyCartDetails);
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const refreshIdRef = useRef(0);

  const applyCart = useCallback((remoteCart: CartResponseDto) => {
    setCart(cartItemsToRecord(remoteCart.items));
    setCartDetailsState({
      reason: remoteCart.reason,
      startTime: remoteCart.startTime,
      endTime: remoteCart.endTime,
      comment: remoteCart.comment,
    });
    setEditingBookingId(remoteCart.editingBookingId);
  }, []);

  const ensureAuthenticated = () => {
    if (!isAuth) {
      throw new Error("Для работы с корзиной войдите в аккаунт");
    }

    if (!canBookEquipment(user?.role)) {
      throw new Error(
        "Представителям организаций недоступно бронирование оборудования",
      );
    }
  };

  const refreshCart = useCallback(async () => {
    const refreshId = ++refreshIdRef.current;

    if (!isAuth || !canBookEquipment(user?.role)) {
      setCart({});
      setCartDetailsState(emptyCartDetails);
      setEditingBookingId(null);
      setIsCartLoading(false);
      return;
    }

    setCart({});
    setCartDetailsState(emptyCartDetails);
    setEditingBookingId(null);
    setIsCartLoading(true);
    try {
      const remoteCart = await cartApi.get_my_cart();
      if (refreshId === refreshIdRef.current) {
        applyCart(remoteCart);
      }
    } finally {
      if (refreshId === refreshIdRef.current) {
        setIsCartLoading(false);
      }
    }
  }, [applyCart, isAuth, user?.role]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    void refreshCart().catch((error: unknown) => {
      console.error("Ошибка загрузки корзины:", error);
    });
  }, [isAuthLoading, refreshCart]);

  const addToCart = async (model: EqModelResponseDto) => {
    ensureAuthenticated();
    const remoteCart = await cartApi.add_cart_item(model.id, 1);
    applyCart(remoteCart);
  };

  const removeFromCart = async (modelId: number) => {
    ensureAuthenticated();
    const item = cart[modelId];

    if (!item) {
      return;
    }

    if (item.quantity > 1) {
      const remoteCart = await cartApi.update_cart_item_quantity(
        modelId,
        item.quantity - 1,
      );
      applyCart(remoteCart);
      return;
    }

    const remoteCart = await cartApi.remove_cart_item(modelId);
    applyCart(remoteCart);
  };

  const updateQuantity = async (modelId: number, quantity: number) => {
    ensureAuthenticated();

    if (quantity <= 0) {
      const remoteCart = await cartApi.remove_cart_item(modelId);
      applyCart(remoteCart);
      return;
    }

    const remoteCart = await cartApi.update_cart_item_quantity(
      modelId,
      quantity,
    );
    applyCart(remoteCart);
  };

  const clearCart = async () => {
    ensureAuthenticated();
    await cartApi.clear_cart();
    setCart({});
    setCartDetailsState(emptyCartDetails);
    setEditingBookingId(null);
  };

  const addBookingItemsToCart = async (bookingId: number) => {
    ensureAuthenticated();
    const remoteCart = await cartApi.add_booking_items_to_cart(bookingId);
    applyCart(remoteCart);
  };

  const prepareBookingEdit = async (bookingId: number) => {
    ensureAuthenticated();
    const remoteCart = await cartApi.prepare_booking_edit(bookingId);
    applyCart(remoteCart);
  };

  const setCartDetails = async (details: UpdateCartDetailsDto) => {
    ensureAuthenticated();
    const remoteCart = await cartApi.set_cart_details(details);
    applyCart(remoteCart);
  };

  const createBookingFromCart = async () => {
    ensureAuthenticated();
    const booking = await cartApi.create_booking_from_cart();
    setCart({});
    setCartDetailsState(emptyCartDetails);
    setEditingBookingId(null);
    return booking;
  };

  const updateBookingFromCart = async (bookingId: number) => {
    ensureAuthenticated();
    const booking = await cartApi.update_booking_from_cart(bookingId);
    setCart({});
    setCartDetailsState(emptyCartDetails);
    setEditingBookingId(null);
    return booking;
  };

  const getTotalItems = () =>
    Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  const getCartItems = () => Object.values(cart);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartDetails,
        editingBookingId,
        isCartLoading,
        refreshCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        addBookingItemsToCart,
        prepareBookingEdit,
        setCartDetails,
        createBookingFromCart,
        updateBookingFromCart,
        getTotalItems,
        getCartItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
