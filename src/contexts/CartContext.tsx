"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { EqModelResponseDto } from '@/app/models/equipment/equipment';

interface CartItem {
  model: EqModelResponseDto;
  quantity: number;
}

interface CartContextType {
  cart: Record<number, CartItem>;
  addToCart: (model: EqModelResponseDto) => void;
  removeFromCart: (modelId: number) => void;
  updateQuantity: (modelId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getCartItems: () => CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Record<number, CartItem>>({});

  const addToCart = (model: EqModelResponseDto) => {
    setCart(prev => ({
      ...prev,
      [model.id]: {
        model,
        quantity: (prev[model.id]?.quantity || 0) + 1
      }
    }));
  };

  const removeFromCart = (modelId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[modelId] && newCart[modelId].quantity > 1) {
        newCart[modelId].quantity -= 1;
      } else {
        delete newCart[modelId];
      }
      return newCart;
    });
  };

  const updateQuantity = (modelId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => {
        const newCart = { ...prev };
        delete newCart[modelId];
        return newCart;
      });
    } else {
      setCart(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          quantity
        }
      }));
    }
  };

  const clearCart = () => {
    setCart({});
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  };

  const getCartItems = () => {
    return Object.values(cart);
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalItems,
      getCartItems
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
