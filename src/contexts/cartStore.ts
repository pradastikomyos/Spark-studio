import { createContext, useContext } from 'react';

export type CartItem = {
  productId: number;
  productName: string;
  productImageUrl?: string;
  variantId: number;
  variantName: string;
  unitPrice: number;
  quantity: number;
};

export type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  removeItem: (variantId: number) => void;
  clear: () => void;
};

export const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

