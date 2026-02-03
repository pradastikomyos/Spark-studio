1→import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { CartContext, type CartContextValue, type CartItem } from './cartStore';
3→import { useAuth } from './AuthContext';

type CartState = {
  items: CartItem[];
};

type CartAction =
  | { type: 'replace'; items: CartItem[] }
  | { type: 'add'; item: Omit<CartItem, 'quantity'>; quantity: number }
  | { type: 'setQuantity'; variantId: number; quantity: number }
  | { type: 'remove'; variantId: number }
  | { type: 'clear' };

const LEGACY_STORAGE_KEY = 'spark_cart_v1';
const STORAGE_KEY_PREFIX = 'spark_cart_v1_';

function getStorageKey(identity: string) {
  return `${STORAGE_KEY_PREFIX}${identity}`;
}

function clampQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

function reducer(state: CartState, action: CartAction): CartState {
  if (action.type === 'replace') {
    return { items: action.items };
  }

  if (action.type === 'clear') {
    return { items: [] };
  }

  if (action.type === 'remove') {
    return { items: state.items.filter((i) => i.variantId !== action.variantId) };
  }

  if (action.type === 'setQuantity') {
    const nextQuantity = clampQuantity(action.quantity);
    return {
      items: state.items.map((i) => (i.variantId === action.variantId ? { ...i, quantity: nextQuantity } : i)),
    };
  }

  if (action.type === 'add') {
    const nextQuantity = clampQuantity(action.quantity);
    const existing = state.items.find((i) => i.variantId === action.item.variantId);
    if (!existing) {
      return { items: [{ ...action.item, quantity: nextQuantity }, ...state.items] };
    }

    return {
      items: state.items.map((i) =>
        i.variantId === action.item.variantId ? { ...i, quantity: clampQuantity(i.quantity + nextQuantity) } : i
      ),
    };
  }

  return state;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const { user, initialized } = useAuth();
  const loadedIdentityRef = useRef<string | null>(null);
  const identity = user?.id ?? 'guest';

  useEffect(() => {
    try {
      if (!initialized) return;

      if (loadedIdentityRef.current === null) {
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          if (!user) {
            localStorage.setItem(getStorageKey('guest'), legacyRaw);
          }
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }

      if (loadedIdentityRef.current !== identity) {
        const storageKey = getStorageKey(identity);
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
          dispatch({ type: 'replace', items: [] });
        } else {
          const parsed = JSON.parse(raw) as unknown;
          const items = Array.isArray((parsed as { items?: unknown }).items)
            ? ((parsed as { items: unknown[] }).items as unknown[])
            : [];
          const normalized: CartItem[] = items
            .map((i) => i as Partial<CartItem>)
            .filter((i) => typeof i.variantId === 'number' && typeof i.productId === 'number')
            .map((i) => ({
              productId: Number(i.productId),
              productName: String(i.productName ?? ''),
              productImageUrl: typeof i.productImageUrl === 'string' ? i.productImageUrl : undefined,
              variantId: Number(i.variantId),
              variantName: String(i.variantName ?? ''),
              unitPrice: Number(i.unitPrice ?? 0),
              quantity: clampQuantity(Number(i.quantity ?? 1)),
            }))
            .filter((i) => i.productName && i.variantName && Number.isFinite(i.unitPrice) && i.unitPrice >= 0);

          dispatch({ type: 'replace', items: normalized });
        }
        loadedIdentityRef.current = identity;
      }
    } catch {
      dispatch({ type: 'replace', items: [] });
      loadedIdentityRef.current = identity;
    }
  }, [initialized, identity, user]);

  useEffect(() => {
    try {
      if (!initialized) return;
      const storageKey = getStorageKey(identity);
      localStorage.setItem(storageKey, JSON.stringify({ items: state.items }));
    } catch {
      return;
    }
  }, [state.items, initialized, identity]);

  const totalQuantity = useMemo(() => state.items.reduce((sum, i) => sum + i.quantity, 0), [state.items]);
  const subtotal = useMemo(() => state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [state.items]);

  const addItem = useCallback<CartContextValue['addItem']>((item, quantity = 1) => {
    dispatch({ type: 'add', item, quantity });
  }, []);

  const setQuantity = useCallback<CartContextValue['setQuantity']>((variantId, quantity) => {
    dispatch({ type: 'setQuantity', variantId, quantity });
  }, []);

  const removeItem = useCallback<CartContextValue['removeItem']>((variantId) => {
    dispatch({ type: 'remove', variantId });
  }, []);

  const clear = useCallback<CartContextValue['clear']>(() => {
    dispatch({ type: 'clear' });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      totalQuantity,
      subtotal,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [state.items, totalQuantity, subtotal, addItem, setQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

