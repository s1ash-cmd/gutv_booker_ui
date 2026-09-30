"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { cartApi } from "@/lib/cartApi";
import { createCartStore } from "@/lib/cartStore";
import { canBookEquipment } from "@/lib/roles";
import { useAuth } from "./AuthContext";

type CartStore = ReturnType<typeof createCartStore>;
type CartContextType = ReturnType<CartStore["getSnapshot"]> &
  Omit<
    CartStore,
    "getSnapshot" | "getServerSnapshot" | "subscribe" | "syncSession"
  > & {
    getTotalItems(): number;
    getCartItems(): ReturnType<CartStore["getSnapshot"]>["cart"][number][];
  };

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuth, isLoading: isAuthLoading } = useAuth();
  const authRef = useRef({ user, isAuth, isAuthLoading });
  authRef.current = { user, isAuth, isAuthLoading };
  const storeRef = useRef<CartStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCartStore(cartApi, {
      getSessionKey: () => {
        const auth = authRef.current;
        if (
          typeof window === "undefined" ||
          auth.isAuthLoading ||
          !auth.isAuth ||
          !auth.user ||
          !canBookEquipment(auth.user.role) ||
          !localStorage.getItem("access_token")
        )
          return null;
        return `${auth.user.id}:${localStorage.getItem("auth_session_id") ?? "legacy"}:${auth.user.role}`;
      },
      getDraftStorage: () =>
        typeof window === "undefined" ? undefined : window.sessionStorage,
    });
  }
  const store = storeRef.current;
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  useEffect(() => {
    store.syncSession();
    if (isAuthLoading || !isAuth || !user?.id || !canBookEquipment(user?.role))
      return;
    void store.refreshCart().catch((error: unknown) => {
      console.error("Ошибка загрузки корзины:", error);
    });
  }, [store, isAuthLoading, isAuth, user?.id, user?.role]);

  return (
    <CartContext.Provider
      value={{
        ...state,
        updateCartDraft: store.updateCartDraft,
        refreshCart: store.refreshCart,
        addToCart: store.addToCart,
        removeFromCart: store.removeFromCart,
        updateQuantity: store.updateQuantity,
        clearCart: store.clearCart,
        addBookingItemsToCart: store.addBookingItemsToCart,
        prepareBookingEdit: store.prepareBookingEdit,
        setCartDetails: store.setCartDetails,
        createBookingFromCart: store.createBookingFromCart,
        updateBookingFromCart: store.updateBookingFromCart,
        submitBookingFromCart: store.submitBookingFromCart,
        getTotalItems: () =>
          Object.values(state.cart).reduce(
            (total, item) => total + item.quantity,
            0,
          ),
        getCartItems: () => Object.values(state.cart),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined)
    throw new Error("useCart must be used within a CartProvider");
  return context;
}
