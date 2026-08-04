'use client';

import { useRouter } from 'next/navigation';
import {
  placeOrderAction,
  approveOrderAction,
  denyOrderAction,
  signRxAction,
  declineClinicalAction,
  advanceOrderAction,
} from '@/lib/orders-db';
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

interface OrdersProviderProps {
  children: ReactNode;
  /**
   * Orders fetched on the server for this session. Present in live mode; the
   * provider then treats Supabase as the source of truth and only keeps a
   * local copy for optimistic updates between refreshes.
   */
  initialOrders?: Order[];
  /** True when Supabase is configured and `initialOrders` is authoritative. */
  live?: boolean;
}

export function OrdersProvider({
  children,
  initialOrders,
  live = false,
}: OrdersProviderProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(live ? initialOrders ?? [] : []);
  const [hydrated, setHydrated] = useState(false);

  // Demo mode only: hydrate from localStorage. In live mode the server
  // already handed us the rows.
  useEffect(() => {
    if (live) return;
    setOrders(loadFromStorage());
    setHydrated(true);
  }, [live]);

  // Keep local state in step with fresh server data after router.refresh().
  useEffect(() => {
    if (!live || !initialOrders) return;
    setOrders(initialOrders);
  }, [live, initialOrders]);

  useEffect(() => {
    if (live || !hydrated) return;
    saveToStorage(orders);
  }, [orders, hydrated, live]);

  /**
   * Run a server action in live mode, then pull fresh rows. The optimistic
   * local update has already happened, so the UI does not wait on the round
   * trip; the refresh reconciles it.
   */
  const sync = useCallback(
    (run: () => Promise<{ ok: boolean; error?: string }>) => {
      if (!live) return;
      void run()
        .then((res) => {
          if (!res.ok) console.error('[orders] action failed:', res.error);
          router.refresh();
        })
        .catch((err) => console.error('[orders] action threw:', err));
    },
    [live, router],
  );

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

  const placeOrder = useCallback<OrdersAPI['placeOrder']>(
    (draft) => {
      const order: Order = {
        ...draft,
        id: `ord-${Math.random().toString(36).slice(2, 8)}`,
        placedAt: Date.now(),
        status: 'pending-admin' as OrderStatus,
      };
      setOrders((curr) => [order, ...curr]);
      sync(() =>
        placeOrderAction({
          lines: draft.lines,
          subtotal: draft.subtotal,
          shippingCost: draft.shippingCost,
          tax: draft.tax,
          total: draft.total,
          shippingAddress: draft.shippingAddress,
          cardLast4: draft.cardLast4,
        }),
      );
      return order;
    },
    [sync],
  );

  const approve = useCallback<OrdersAPI['approve']>(
    (id, note) => {
      updateOrder(id, { status: 'assigned', adminNote: note });
      appendUpdate(
        id,
        'Admin',
        'admin',
        note ?? 'Confirmed. Released for compounding.',
        'assigned'
      );
      sync(() => approveOrderAction(id, undefined, note));
    },
    [updateOrder, appendUpdate, sync]
  );

  const denyAdmin = useCallback<OrdersAPI['denyAdmin']>(
    (id, note) => {
      updateOrder(id, { status: 'denied-admin', adminNote: note });
      sync(() => denyOrderAction(id, note));
    },
    [updateOrder, sync]
  );

  /**
   * Physician sign-off. This is the moment billing starts: the first cycle is
   * charged to the card on file, and only then is the order released to the
   * pharmacy. Recorded as two timeline entries — the sign-off and the charge.
   */
  const signRx = useCallback<OrdersAPI['signRx']>((id, author, note) => {
    const now = Date.now();
    setOrders((curr) =>
      curr.map((o) => {
        if (o.id !== id) return o;
        const signEntry: OrderUpdate = {
          id: `upd-${Math.random().toString(36).slice(2, 8)}`,
          at: now,
          author,
          role: 'physician',
          note: note ?? 'Order confirmed. Billing starts now.',
          statusChange: 'signed',
        };
        const payEntry: OrderUpdate = {
          id: `upd-${Math.random().toString(36).slice(2, 8)}`,
          at: now + 1,
          author: 'Billing',
          role: 'system',
          note: `First cycle billed. $${o.total} charged to the card on file. Order released to the pharmacy.`,
        };
        return {
          ...o,
          status: 'signed' as OrderStatus,
          physicianNote: note,
          paidAt: now,
          firstChargeAmount: o.total,
          updates: [...(o.updates ?? []), signEntry, payEntry],
        };
      })
    );
    const charged = orders.find((o) => o.id === id)?.total ?? 0;
    sync(() => signRxAction(id, note, charged));
  }, [orders, sync]);

  const declineClinical = useCallback<OrdersAPI['declineClinical']>(
    (id, author, note) => {
      updateOrder(id, { status: 'declined-clinical', physicianNote: note });
      appendUpdate(id, author, 'physician', note, 'declined-clinical');
      sync(() => declineClinicalAction(id, note));
    },
    [updateOrder, appendUpdate, sync]
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
      sync(() => advanceOrderAction(id, 'compounding', { note }));
    },
    [updateOrder, appendUpdate, sync]
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
      sync(() => advanceOrderAction(id, 'shipped', { note, carrier, tracking }));
    },
    [updateOrder, appendUpdate, sync]
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
      sync(() => advanceOrderAction(id, 'delivered', { note }));
    },
    [updateOrder, appendUpdate, sync]
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
