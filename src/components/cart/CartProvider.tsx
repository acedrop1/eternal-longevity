'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  SHOP_PRODUCTS,
  cadenceTiersForProduct,
  type ShopProduct,
} from '@/lib/shopProducts';

export type Cadence = 'monthly' | 'quarterly' | 'annual';

export interface CartItem {
  productId: string;
  cadence: Cadence;
  quantity: number;
  addedAt: number;
}

/** Derived item enriched with product detail + resolved price for the cadence. */
export interface ResolvedCartItem extends CartItem {
  product: ShopProduct;
  perMonth: number;
  total: number;
  cadenceLabel: string;
}

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
}

interface CartAPI extends CartState {
  resolvedItems: ResolvedCartItem[];
  subtotal: number;
  itemCount: number;
  addItem: (productId: string, cadence: Cadence) => void;
  removeItem: (productId: string, cadence: Cadence) => void;
  setQuantity: (productId: string, cadence: Cadence, qty: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartAPI | null>(null);
const STORAGE_KEY = 'el_cart_v1';

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it) =>
        it &&
        typeof it.productId === 'string' &&
        typeof it.cadence === 'string' &&
        typeof it.quantity === 'number'
    );
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>({ items: [], drawerOpen: false });
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once on mount (post-hydration)
  useEffect(() => {
    setState((s) => ({ ...s, items: loadFromStorage() }));
    setHydrated(true);
  }, []);

  // Mirror items to localStorage on every change (post-hydration only)
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(state.items);
  }, [state.items, hydrated]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!hydrated) return;
    if (state.drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [state.drawerOpen, hydrated]);

  const addItem = useCallback((productId: string, cadence: Cadence) => {
    setState((s) => {
      const existing = s.items.find(
        (it) => it.productId === productId && it.cadence === cadence
      );
      const next: CartItem[] = existing
        ? s.items.map((it) =>
            it.productId === productId && it.cadence === cadence
              ? { ...it, quantity: it.quantity + 1 }
              : it
          )
        : [
            ...s.items,
            { productId, cadence, quantity: 1, addedAt: Date.now() },
          ];
      return { items: next, drawerOpen: true };
    });
  }, []);

  const removeItem = useCallback((productId: string, cadence: Cadence) => {
    setState((s) => ({
      ...s,
      items: s.items.filter(
        (it) => !(it.productId === productId && it.cadence === cadence)
      ),
    }));
  }, []);

  const setQuantity = useCallback(
    (productId: string, cadence: Cadence, qty: number) => {
      setState((s) => ({
        ...s,
        items:
          qty <= 0
            ? s.items.filter(
                (it) => !(it.productId === productId && it.cadence === cadence)
              )
            : s.items.map((it) =>
                it.productId === productId && it.cadence === cadence
                  ? { ...it, quantity: qty }
                  : it
              ),
      }));
    },
    []
  );

  const clear = useCallback(() => {
    setState((s) => ({ ...s, items: [] }));
  }, []);

  const openDrawer = useCallback(
    () => setState((s) => ({ ...s, drawerOpen: true })),
    []
  );
  const closeDrawer = useCallback(
    () => setState((s) => ({ ...s, drawerOpen: false })),
    []
  );

  const { resolvedItems, subtotal, itemCount } = useMemo(() => {
    const resolved: ResolvedCartItem[] = [];
    let sub = 0;
    let count = 0;
    for (const it of state.items) {
      const product = SHOP_PRODUCTS.find((p) => p.id === it.productId);
      if (!product) continue;
      const tiers = cadenceTiersForProduct(product);
      const tier = tiers.find((t) => t.key === it.cadence) ?? tiers[0];
      resolved.push({
        ...it,
        product,
        perMonth: tier.perMonth,
        total: tier.total,
        cadenceLabel: tier.label,
      });
      sub += tier.total * it.quantity;
      count += it.quantity;
    }
    return { resolvedItems: resolved, subtotal: sub, itemCount: count };
  }, [state.items]);

  const api = useMemo<CartAPI>(
    () => ({
      items: state.items,
      drawerOpen: state.drawerOpen,
      resolvedItems,
      subtotal,
      itemCount,
      addItem,
      removeItem,
      setQuantity,
      clear,
      openDrawer,
      closeDrawer,
    }),
    [
      state,
      resolvedItems,
      subtotal,
      itemCount,
      addItem,
      removeItem,
      setQuantity,
      clear,
      openDrawer,
      closeDrawer,
    ]
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartAPI {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart() must be used inside <CartProvider>');
  }
  return ctx;
}
