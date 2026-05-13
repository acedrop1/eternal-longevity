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
  /** Orders awaiting this physician's review (status='assigned'). */
  ordersByPhysician: (physicianId: string) => Order[];
  /** Active cases this physician is managing post-sign (signed / compounding / shipped). */
  activeCasesByPhysician: (physicianId: string) => Order[];
  /** Finished cases for this physician (delivered / declined-clinical). */
  recentByPhysician: (physicianId: string, limit?: number) => Order[];
  pendingAdminOrders: () => Order[];
  placeOrder: (
    order: Omit<Order, 'id' | 'placedAt' | 'status'>
  ) => Order;
  approveAndAssign: (id: string, physicianId: string, note?: string) => void;
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

  const approveAndAssign = useCallback<OrdersAPI['approveAndAssign']>(
    (id, physicianId, note) => {
      updateOrder(id, {
        status: 'assigned',
        assignedToPhysicianId: physicianId,
        adminNote: note,
      });
    },
    [updateOrder]
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

  const ordersByPhysician = useCallback(
    (physicianId: string) =>
      orders.filter(
        (o) =>
          o.assignedToPhysicianId === physicianId &&
          o.status === 'assigned'
      ),
    [orders]
  );

  const activeCasesByPhysician = useCallback(
    (physicianId: string) =>
      orders.filter(
        (o) =>
          o.assignedToPhysicianId === physicianId &&
          (['signed', 'compounding', 'shipped'] as OrderStatus[]).includes(
            o.status
          )
      ),
    [orders]
  );

  const recentByPhysician = useCallback(
    (physicianId: string, limit = 5) =>
      orders
        .filter(
          (o) =>
            o.assignedToPhysicianId === physicianId &&
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
      ordersByPhysician,
      activeCasesByPhysician,
      recentByPhysician,
      pendingAdminOrders,
      placeOrder,
      approveAndAssign,
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
      ordersByPhysician,
      activeCasesByPhysician,
      recentByPhysician,
      pendingAdminOrders,
      placeOrder,
      approveAndAssign,
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
