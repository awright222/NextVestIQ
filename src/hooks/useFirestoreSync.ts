// ============================================
// useFirestoreSync — Syncs Redux deals ↔ Firestore
// ============================================
// - Loads deals from Firestore when user logs in
// - Auto-saves deal mutations (add/update/delete/favorite/scenario) to Firestore
// - Clears Redux state on logout

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { setDeals, setLoading, setError } from '@/store/dealsSlice';
import { fetchDeals, saveDeal, deleteDeal } from '@/lib/firestore';
import type { Deal } from '@/types';

export function useFirestoreSync() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const deals = useAppSelector((s) => s.deals.items);

  // Track the previous user ID so we know when auth changes
  const prevUserIdRef = useRef<string | null>(null);
  // Track whether initial load is done (prevents saving stale/empty state)
  const loadedRef = useRef(false);
  // Track the previous deals snapshot to detect actual changes
  const prevDealsRef = useRef<string>('');

  // ─── Load deals when user logs in ────────────────────

  useEffect(() => {
    const userId = user?.uid ?? null;

    if (userId === prevUserIdRef.current) return;
    prevUserIdRef.current = userId;
    loadedRef.current = false;
    prevDealsRef.current = '';

    if (!userId) {
      // Logged out — clear deals
      dispatch(setDeals([]));
      return;
    }

    // Logged in — fetch deals from Firestore
    (async () => {
      dispatch(setLoading(true));
      try {
        const remotDeals = await fetchDeals(userId);
        dispatch(setDeals(remotDeals));
        prevDealsRef.current = JSON.stringify(remotDeals);
        loadedRef.current = true;
      } catch (err) {
        console.error('Failed to load deals:', err);
        dispatch(setError('Failed to load your deals. Please refresh.'));
        loadedRef.current = true;
      }
    })();
  }, [user, dispatch]);

  // ─── Auto-save deal changes to Firestore ─────────────

  const syncToFirestore = useCallback(
    async (current: Deal[], previous: Deal[]) => {
      if (!user) return;

      const prevMap = new Map(previous.map((d) => [d.id, d]));
      const currMap = new Map(current.map((d) => [d.id, d]));

      // Find added or updated deals
      const upserts: Deal[] = [];
      for (const deal of current) {
        const prev = prevMap.get(deal.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(deal)) {
          upserts.push(deal);
        }
      }

      // Find deleted deals
      const deletions: string[] = [];
      for (const prev of previous) {
        if (!currMap.has(prev.id)) {
          deletions.push(prev.id);
        }
      }

      // Execute in parallel
      const ops: Promise<void>[] = [
        ...upserts.map((d) => saveDeal(d)),
        ...deletions.map((id) => deleteDeal(user.uid, id)),
      ];

      if (ops.length > 0) {
        try {
          await Promise.all(ops);
        } catch (err) {
          console.error('Failed to sync deals to Firestore:', err);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    if (!loadedRef.current || !user) return;

    const currentSnapshot = JSON.stringify(deals);
    if (currentSnapshot === prevDealsRef.current) return;

    // Parse previous state for diff
    const previous: Deal[] = prevDealsRef.current
      ? JSON.parse(prevDealsRef.current)
      : [];
    prevDealsRef.current = currentSnapshot;

    syncToFirestore(deals, previous);
  }, [deals, user, syncToFirestore]);
}
