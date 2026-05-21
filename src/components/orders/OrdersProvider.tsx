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
  SEED_ORDERS,
  type Order,
  type OrderStatus,
  type OrderUpdate,
  type UpdateAuthorRole,
} from '@/lib/orders';

interface OrdersAPI {
  orders: Order[];
  ordersByMember: (email: string) => Order[];
  /** Orders the admin has approved, awaiting physician sign-off (status='assigned'). */
  clinicalQueue: () => Order[];
  /** Active cases post-sign (signed / compounding / shipped). */
  activeClinicalCases: () => Order[];
  /** Finished cases (delivered / declined-clinical). */
  recentClinicalCases: (limit?: number) => Order[];
  pendingAdminOrders: () => Order[];
  placeOrder: (
    order: Omit<Order, 'id' | 'placedAt' | 'status'>
  ) => Order;
  /** Admin approves an order, releasing it to the physician for sign-off. */
  approve: (id: string, note?: string) => void;
  denyAdmin: (id: string, note: string) => void;
  signRx: (
    id: string,
    author: string,
    note?: string
  ) => void;
  declineClinical: (id: string, author: string, note: string) => void;
  /** Post-sign progression — usually called by physician or pharmacy. */
  markCompounding: (id: string, author: string, note?: string) => void;
  markShipped: (
    id: string,
    author: string,
    tracking: string,
    carrier: string,
    note?: string
  ) => void;
  markDelivered: (id: string, author: string, note?: string) => void;
  /** Free-form note appended to the order timeline without changing status. */
  addUpdate: (
    id: string,
    author: string,
    role: UpdateAuthorRole,
    note: string
  ) => void;
  /** Demo: clear localStorage and re-seed */
  resetToSeed: () => void;
}

const OrdersContext = createContext<OrdersAPI | null>(null);
const STORAGE_KEY = 'el_orders_v1';

function loadFromStorage(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_ORDERS;
    const parsed = JSON.parse(raw) as Order[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_ORDERS;
    return parsed;
  } catch {
    return SEED_ORDERS;
  }
}

function saveToStorage(orders: Order[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    /* ignore quota */
  }
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOrders(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(orders);
  }, [orders, hydrated]);

  const updateOrder = useCallback(
    (id: string, patch: Partial<Order>) => {
      setOrders((curr) =>
        curr.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );
    },
    []
  );

  /** Internal: append an update entry to an order's timeline. */
  const appendUpdate = useCallback(
    (
      id: string,
      author: string,
      role: UpdateAuthorRole,
      note: string,
      statusChange?: OrderStatus
    ) => {
      const entry: OrderUpdate = {
        id: `upd-${Math.random().toString(36).slice(2, 8)}`,
        at: Date.now(),
        author,
        role,
        note,
        statusChange,
      };
      setOrders((curr) =>
        curr.map((o) =>
          o.id === id
            ? { ...o, updates: [...(o.updates ?? []), entry] }
            : o
        )
      );
    },
    []
  );

  const placeOrder = useCallback<OrdersAPI['placeOrder']>((draft) => {
    const order: Order = {
      ...draft,
      id: `ord-${Math.random().toString(36).slice(2, 8)}`,
      placedAt: Date.now(),
      status: 'pending-admin' as OrderStatus,
    };
    setOrders((curr) => [order, ...curr]);
    return order;
  }, []);

  const approve = useCallback<OrdersAPI['approve']>(
    (id, note) => {
      updateOrder(id, { status: 'assigned', adminNote: note });
      appendUpdate(
        id,
        'Admin',
        'admin',
        note ?? 'Approved. Released to the physician for sign-off.',
        'assigned'
      );
    },
    [updateOrder, appendUpdate]
  );

  const denyAdmin = useCallback<OrdersAPI['denyAdmin']>(
    (id, note) => {
      updateOrder(id, { status: 'denied-admin', adminNote: note });
    },
    [updateOrder]
  );

  const signRx = useCallback<OrdersAPI['signRx']>(
    (id, author, note) => {
      updateOrder(id, { status: 'signed', physicianNote: note });
      appendUpdate(
        id,
        author,
        'physician',
        note ?? 'Prescription signed. Releasing to pharmacy.',
        'signed'
      );
    },
    [updateOrder, appendUpdate]
  );

  const declineClinical = useCallback<OrdersAPI['declineClinical']>(
    (id, author, note) => {
      updateOrder(id, { status: 'declined-clinical', physicianNote: note });
      appendUpdate(id, author, 'physician', note, 'declined-clinical');
    },
    [updateOrder, appendUpdate]
  );

  const markCompounding = useCallback<OrdersAPI['markCompounding']>(
    (id, author, note) => {
      updateOrder(id, { status: 'compounding' });
      appendUpdate(
        id,
        author,
        'physician',
        note ?? 'Pharmacy is compounding now.',
        'compounding'
      );
    },
    [updateOrder, appendUpdate]
  );

  const markShipped = useCallback<OrdersAPI['markShipped']>(
    (id, author, tracking, carrier, note) => {
      updateOrder(id, { status: 'shipped', tracking, carrier });
      appendUpdate(
        id,
        author,
        'physician',
        note ?? `Shipped via ${carrier} · ${tracking}`,
        'shipped'
      );
    },
    [updateOrder, appendUpdate]
  );

  const markDelivered = useCallback<OrdersAPI['markDelivered']>(
    (id, author, note) => {
      updateOrder(id, { status: 'delivered' });
      appendUpdate(
        id,
        author,
        'physician',
        note ?? 'Delivery confirmed.',
        'delivered'
      );
    },
    [updateOrder, appendUpdate]
  );

  const addUpdate = useCallback<OrdersAPI['addUpdate']>(
    (id, author, role, note) => {
      appendUpdate(id, author, role, note);
    },
    [appendUpdate]
  );

  const resetToSeed = useCallback(() => {
    setOrders(SEED_ORDERS);
  }, []);

  const ordersByMember = useCallback(
    (email: string) =>
      orders.filter(
        (o) => o.memberEmail.toLowerCase() === email.toLowerCase()
      ),
    [orders]
  );

  // One medical director signs every case, so the clinical queue is not
  // routed per-physician — it's simply every order the admin has approved.
  const clinicalQueue = useCallback(
    () => orders.filter((o) => o.status === 'assigned'),
    [orders]
  );

  const activeClinicalCases = useCallback(
    () =>
      orders.filter((o) =>
        (['signed', 'compounding', 'shipped'] as OrderStatus[]).includes(
          o.status
        )
      ),
    [orders]
  );

  const recentClinicalCases = useCallback(
    (limit = 5) =>
      orders
        .filter((o) =>
          (['delivered', 'declined-clinical'] as OrderStatus[]).includes(
            o.status
          )
        )
        .slice(0, limit),
    [orders]
  );

  const pendingAdminOrders = useCallback(
    () => orders.filter((o) => o.status === 'pending-admin'),
    [orders]
  );

  const api = useMemo<OrdersAPI>(
    () => ({
      orders,
      ordersByMember,
      clinicalQueue,
      activeClinicalCases,
      recentClinicalCases,
      pendingAdminOrders,
      placeOrder,
      approve,
      denyAdmin,
      signRx,
      declineClinical,
      markCompounding,
      markShipped,
      markDelivered,
      addUpdate,
      resetToSeed,
    }),
    [
      orders,
      ordersByMember,
      clinicalQueue,
      activeClinicalCases,
      recentClinicalCases,
      pendingAdminOrders,
      placeOrder,
      approve,
      denyAdmin,
      signRx,
      declineClinical,
      markCompounding,
      markShipped,
      markDelivered,
      addUpdate,
      resetToSeed,
    ]
  );

  return <OrdersContext.Provider value={api}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersAPI {
  const ctx = useContext(OrdersContext);
  if (!ctx) {
    throw new Error('useOrders() must be used inside <OrdersProvider>');
  }
  return ctx;
}
