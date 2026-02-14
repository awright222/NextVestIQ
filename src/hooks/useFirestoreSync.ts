// ============================================
// useFirestoreSync — Syncs Redux state ↔ Firestore
// ============================================
// - Loads deals + criteria from Firestore when user logs in
// - Auto-saves mutations to Firestore
// - Clears Redux state on logout

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { setDeals, setLoading, setError } from '@/store/dealsSlice';
import { setCriteria } from '@/store/criteriaSlice';
import {
  fetchDeals,
  saveDeal,
  deleteDeal,
  fetchCriteria,
  saveCriteria,
  deleteCriteria,
} from '@/lib/firestore';
import type { Deal, InvestmentCriteria } from '@/types';

export function useFirestoreSync() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const deals = useAppSelector((s) => s.deals.items);
  const criteria = useAppSelector((s) => s.criteria.items);

  // Track the previous user ID so we know when auth changes
  const prevUserIdRef = useRef<string | null>(null);
  // Track whether initial load is done (prevents saving stale/empty state)
  const loadedRef = useRef(false);
  // Track the previous snapshots to detect actual changes
  const prevDealsRef = useRef<string>('');
  const prevCriteriaRef = useRef<string>('');

  // ─── Load deals + criteria when user logs in ────────

  useEffect(() => {
    const userId = user?.uid ?? null;

    if (userId === prevUserIdRef.current) return;
    prevUserIdRef.current = userId;
    loadedRef.current = false;
    prevDealsRef.current = '';
    prevCriteriaRef.current = '';

    if (!userId) {
      // Logged out — clear state
      dispatch(setDeals([]));
      dispatch(setCriteria([]));
      return;
    }

    // Logged in — fetch deals + criteria from Firestore
    (async () => {
      dispatch(setLoading(true));
      try {
        const [remoteDeals, remoteCriteria] = await Promise.all([
          fetchDeals(userId),
          fetchCriteria(userId),
        ]);
        dispatch(setDeals(remoteDeals));
        dispatch(setCriteria(remoteCriteria));
        prevDealsRef.current = JSON.stringify(remoteDeals);
        prevCriteriaRef.current = JSON.stringify(remoteCriteria);
        loadedRef.current = true;
      } catch (err) {
        console.error('Failed to load data:', err);
        dispatch(setError('Failed to load your data. Please refresh.'));
        loadedRef.current = true;
      }
    })();
  }, [user, dispatch]);

  // ─── Auto-save deal changes to Firestore ─────────────

  const syncDealsToFirestore = useCallback(
    async (current: Deal[], previous: Deal[]) => {
      if (!user) return;

      const prevMap = new Map(previous.map((d) => [d.id, d]));
      const currMap = new Map(current.map((d) => [d.id, d]));

      const upserts: Deal[] = [];
      for (const deal of current) {
        const prev = prevMap.get(deal.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(deal)) {
          upserts.push(deal);
        }
      }

      const deletions: string[] = [];
      for (const prev of previous) {
        if (!currMap.has(prev.id)) deletions.push(prev.id);
      }

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

    const previous: Deal[] = prevDealsRef.current
      ? JSON.parse(prevDealsRef.current)
      : [];
    prevDealsRef.current = currentSnapshot;

    syncDealsToFirestore(deals, previous);
  }, [deals, user, syncDealsToFirestore]);

  // ─── Auto-save criteria changes to Firestore ─────────

  const syncCriteriaToFirestore = useCallback(
    async (current: InvestmentCriteria[], previous: InvestmentCriteria[]) => {
      if (!user) return;

      const prevMap = new Map(previous.map((c) => [c.id, c]));
      const currMap = new Map(current.map((c) => [c.id, c]));

      const upserts: InvestmentCriteria[] = [];
      for (const item of current) {
        const prev = prevMap.get(item.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
          upserts.push(item);
        }
      }

      const deletions: string[] = [];
      for (const prev of previous) {
        if (!currMap.has(prev.id)) deletions.push(prev.id);
      }

      const ops: Promise<void>[] = [
        ...upserts.map((c) => saveCriteria(c)),
        ...deletions.map((id) => deleteCriteria(user.uid, id)),
      ];

      if (ops.length > 0) {
        try {
          await Promise.all(ops);
        } catch (err) {
          console.error('Failed to sync criteria to Firestore:', err);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    if (!loadedRef.current || !user) return;

    const currentSnapshot = JSON.stringify(criteria);
    if (currentSnapshot === prevCriteriaRef.current) return;

    const previous: InvestmentCriteria[] = prevCriteriaRef.current
      ? JSON.parse(prevCriteriaRef.current)
      : [];
    prevCriteriaRef.current = currentSnapshot;

    syncCriteriaToFirestore(criteria, previous);
  }, [criteria, user, syncCriteriaToFirestore]);
}
