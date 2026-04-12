"use client";

import type { BookingResponseDto } from "@/app/models/booking/booking";
import type {
  CartDetailsDto,
  CartItemDto,
  CartResponseDto,
  UpdateCartDetailsDto,
} from "@/app/models/cart/cart";
import type { EqModelResponseDto } from "@/app/models/equipment/equipment";
import { cartApi } from "@/lib/cartApi";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

interface CartItem {
  model: EqModelResponseDto;
  quantity: number;
}

interface CartContextType {
  cart: Record<number, CartItem>;
  cartDetails: CartDetailsDto;
  isCartLoading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (model: EqModelResponseDto) => Promise<void>;
  removeFromCart: (modelId: number) => Promise<void>;
  updateQuantity: (modelId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  setCartDetails: (details: UpdateCartDetailsDto) => Promise<void>;
  createBookingFromCart: () => Promise<BookingResponseDto>;
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
  const { isAuth, isLoading: isAuthLoading } = useAuth();
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [cartDetails, setCartDetailsState] =
    useState<CartDetailsDto>(emptyCartDetails);
  const [isCartLoading, setIsCartLoading] = useState(true);

  const applyCart = (remoteCart: CartResponseDto) => {
    setCart(cartItemsToRecord(remoteCart.items));
    setCartDetailsState({
      reason: remoteCart.reason,
      startTime: remoteCart.startTime,
      endTime: remoteCart.endTime,
      comment: remoteCart.comment,
    });
  };

  const ensureAuthenticated = () => {
    if (!isAuth) {
      throw new Error("Для работы с корзиной войдите в аккаунт");
    }
  };

  const refreshCart = async () => {
    if (!isAuth) {
      setCart({});
      setCartDetailsState(emptyCartDetails);
      setIsCartLoading(false);
      return;
    }

    setIsCartLoading(true);
    try {
      const remoteCart = await cartApi.get_my_cart();
      applyCart(remoteCart);
    } finally {
      setIsCartLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    void refreshCart();
  }, [isAuth, isAuthLoading]);

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

    const remoteCart = await cartApi.update_cart_item_quantity(modelId, quantity);
    applyCart(remoteCart);
  };

  const clearCart = async () => {
    ensureAuthenticated();
    await cartApi.clear_cart();
    setCart({});
    setCartDetailsState(emptyCartDetails);
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
        isCartLoading,
        refreshCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setCartDetails,
        createBookingFromCart,
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
