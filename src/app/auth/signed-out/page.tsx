'use client';

import { useEffect } from 'react';

/**
 * After logoutAction. The assessment keeps answers in this browser
 * (el-assessment:*); on a shared computer the next person must not find them.
 */
export default function SignedOutPage() {
  useEffect(() => {
    try {
      for (const k of Object.keys(window.localStorage)) {
        if (k.startsWith('el-assessment:')) window.localStorage.removeItem(k);
      }
    } catch {
      // Storage blocked: nothing was kept.
    }
    window.location.replace('/login');
  }, []);
  return <p className="p-8 text-center text-[15px]">Signing you out…</p>;
}
