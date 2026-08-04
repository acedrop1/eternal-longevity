'use client';

import {
  patchProfileAction,
  addAddressAction,
  updateAddressAction,
  removeAddressAction,
  setPrimaryAddressAction,
  addCardAction,
  removeCardAction,
  setPrimaryCardAction,
} from '@/lib/profile-db';
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
  SEED_PROFILE,
  type MemberProfile,
  type SavedAddress,
  type SavedCard,
} from '@/lib/memberProfile';

interface MemberProfileAPI {
  profile: MemberProfile;
  /** Update top-level fields like phone, dob */
  patchProfile: (patch: Partial<Omit<MemberProfile, 'addresses' | 'cards'>>) => void;
  addAddress: (a: Omit<SavedAddress, 'id'>) => SavedAddress;
  updateAddress: (id: string, patch: Partial<SavedAddress>) => void;
  removeAddress: (id: string) => void;
  setPrimaryAddress: (id: string) => void;
  addCard: (c: Omit<SavedCard, 'id'>) => SavedCard;
  removeCard: (id: string) => void;
  setPrimaryCard: (id: string) => void;
  /** Demo: reset to seed */
  resetProfile: () => void;
}

const MemberProfileContext = createContext<MemberProfileAPI | null>(null);
const STORAGE_KEY = 'el_member_profile_v1';

function load(): MemberProfile {
  if (typeof window === 'undefined') return SEED_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PROFILE;
    const parsed = JSON.parse(raw) as MemberProfile;
    if (!parsed || !Array.isArray(parsed.addresses) || !Array.isArray(parsed.cards)) {
      return SEED_PROFILE;
    }
    return parsed;
  } catch {
    return SEED_PROFILE;
  }
}

function save(p: MemberProfile) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function randId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

interface MemberProfileProviderProps {
  children: ReactNode;
  /** Profile loaded on the server: scalar fields, addresses, saved cards. */
  initialProfile?: MemberProfile;
  /** True when signed in with Supabase — writes then go to the database. */
  live?: boolean;
}

export function MemberProfileProvider({
  children,
  initialProfile,
  live = false,
}: MemberProfileProviderProps) {
  const [profile, setProfile] = useState<MemberProfile>(
    live ? initialProfile ?? { addresses: [], cards: [] } : SEED_PROFILE,
  );
  const [hydrated, setHydrated] = useState(false);

  // Demo mode only: hydrate from localStorage.
  useEffect(() => {
    if (live) return;
    setProfile(load());
    setHydrated(true);
  }, [live]);

  // Keep in step with fresh server data after a refresh.
  useEffect(() => {
    if (!live || !initialProfile) return;
    setProfile(initialProfile);
  }, [live, initialProfile]);

  useEffect(() => {
    if (live || !hydrated) return;
    save(profile);
  }, [profile, hydrated, live]);

  /** Fire a server action in live mode; local state already updated. */
  const sync = useCallback(
    (run: () => Promise<{ ok: boolean; error?: string }>) => {
      if (!live) return;
      void run()
        .then((r) => {
          if (!r.ok) console.error('[profile] action failed:', r.error);
        })
        .catch((err) => console.error('[profile] action threw:', err));
    },
    [live],
  );

  const patchProfile = useCallback<MemberProfileAPI['patchProfile']>(
    (patch) => {
      setProfile((p) => ({ ...p, ...patch }));
      sync(() => patchProfileAction(patch));
    },
    [sync],
  );

  const addAddress = useCallback<MemberProfileAPI['addAddress']>((a) => {
    const created: SavedAddress = { ...a, id: randId('addr') };
    setProfile((p) => {
      let addresses = [...p.addresses, created];
      // If new is marked primary, demote the others
      if (created.isPrimary) {
        addresses = addresses.map((x) =>
          x.id === created.id ? x : { ...x, isPrimary: false }
        );
      } else if (addresses.length === 1) {
        // First address auto-primary
        addresses = addresses.map((x) => ({ ...x, isPrimary: true }));
      }
      return { ...p, addresses };
    });
    sync(() => addAddressAction(a));
    return created;
  }, [sync]);

  const updateAddress = useCallback<MemberProfileAPI['updateAddress']>(
    (id, patch) => {
      setProfile((p) => ({
        ...p,
        addresses: p.addresses.map((a) =>
          a.id === id ? { ...a, ...patch } : a
        ),
      }));
      sync(() => updateAddressAction(id, patch));
    },
    [sync]
  );

  const removeAddress = useCallback<MemberProfileAPI['removeAddress']>(
    (id) => {
      setProfile((p) => {
        const remaining = p.addresses.filter((a) => a.id !== id);
        // If we removed the primary, mark the first remaining as primary.
        if (
          remaining.length > 0 &&
          !remaining.some((a) => a.isPrimary)
        ) {
          remaining[0] = { ...remaining[0], isPrimary: true };
        }
        return { ...p, addresses: remaining };
      });
      sync(() => removeAddressAction(id));
    },
    [sync]
  );

  const setPrimaryAddress = useCallback<MemberProfileAPI['setPrimaryAddress']>(
    (id) => {
      setProfile((p) => ({
        ...p,
        addresses: p.addresses.map((a) => ({
          ...a,
          isPrimary: a.id === id,
        })),
      }));
      sync(() => setPrimaryAddressAction(id));
    },
    [sync]
  );

  const addCard = useCallback<MemberProfileAPI['addCard']>((c) => {
    const created: SavedCard = { ...c, id: randId('card') };
    setProfile((p) => {
      let cards = [...p.cards, created];
      if (created.isPrimary) {
        cards = cards.map((x) =>
          x.id === created.id ? x : { ...x, isPrimary: false }
        );
      } else if (cards.length === 1) {
        cards = cards.map((x) => ({ ...x, isPrimary: true }));
      }
      return { ...p, cards };
    });
    sync(() => addCardAction(c));
    return created;
  }, [sync]);

  const removeCard = useCallback<MemberProfileAPI['removeCard']>((id) => {
    setProfile((p) => {
      const remaining = p.cards.filter((c) => c.id !== id);
      if (remaining.length > 0 && !remaining.some((c) => c.isPrimary)) {
        remaining[0] = { ...remaining[0], isPrimary: true };
      }
      return { ...p, cards: remaining };
    });
    sync(() => removeCardAction(id));
  }, [sync]);

  const setPrimaryCard = useCallback<MemberProfileAPI['setPrimaryCard']>(
    (id) => {
      setProfile((p) => ({
        ...p,
        cards: p.cards.map((c) => ({ ...c, isPrimary: c.id === id })),
      }));
      sync(() => setPrimaryCardAction(id));
    },
    [sync]
  );

  const resetProfile = useCallback(() => {
    setProfile(SEED_PROFILE);
  }, []);

  const api = useMemo<MemberProfileAPI>(
    () => ({
      profile,
      patchProfile,
      addAddress,
      updateAddress,
      removeAddress,
      setPrimaryAddress,
      addCard,
      removeCard,
      setPrimaryCard,
      resetProfile,
    }),
    [
      profile,
      patchProfile,
      addAddress,
      updateAddress,
      removeAddress,
      setPrimaryAddress,
      addCard,
      removeCard,
      setPrimaryCard,
      resetProfile,
    ]
  );

  return (
    <MemberProfileContext.Provider value={api}>
      {children}
    </MemberProfileContext.Provider>
  );
}

export function useMemberProfile(): MemberProfileAPI {
  const ctx = useContext(MemberProfileContext);
  if (!ctx) {
    throw new Error(
      'useMemberProfile() must be used inside <MemberProfileProvider>'
    );
  }
  return ctx;
}
