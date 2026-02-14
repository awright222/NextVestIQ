// ============================================
// useFirestoreSync — Syncs Redux state ↔ Firestore
// ============================================
// - Loads deals + criteria from Firestore when user logs in
// - Auto-saves mutations to Firestore
// - Falls back gracefully to localStorage if Firestore is unreachable
// - Clears Redux state on logout

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { setDeals, setLoading } from '@/store/dealsSlice';
import { setCriteria } from '@/store/criteriaSlice';
import {
  fetchDeals,
  saveDeal,
  deleteDeal,
  fetchCriteria,
  saveCriteria,
  deleteCriteria,
  isFirestoreAvailable,
} from '@/lib/firestore';
import type { Deal, InvestmentCriteria } from '@/types';

export function useFirestoreSync() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const deals = useAppSelector((s) => s.deals.items);
  const criteria = useAppSelector((s) => s.criteria.items);

  const prevUserIdRef = useRef<string | null>(null);
  const loadedRef = useRef(false);
  const prevDealsRef = useRef<string>('');
  const prevCriteriaRef = useRef<string>('');
  // Once we know Firestore is down, stop retrying for this session
  const firestoreDisabledRef = useRef(false);

  // ─── Load deals + criteria when user logs in ────────

  useEffect(() => {
    const userId = user?.uid ?? null;

    if (userId === prevUserIdRef.current) return;
    prevUserIdRef.current = userId;
    loadedRef.current = false;
    prevDealsRef.current = '';
    prevCriteriaRef.current = '';

    if (!userId) {
      dispatch(setDeals([]));
      dispatch(setCriteria([]));
      dispatch(setLoading(false));
      return;
    }

    (async () => {
      dispatch(setLoading(true));

      // Quick check: is Firestore even reachable?
      if (firestoreDisabledRef.current || !isFirestoreAvailable()) {
        console.info('[DealForge] Firestore not configured — using local storage.');
        firestoreDisabledRef.current = true;
        dispatch(setLoading(false));
        prevDealsRef.current = JSON.stringify(deals);
        prevCriteriaRef.current = JSON.stringify(criteria);
        loadedRef.current = true;
        return;
      }

      try {
        // Fetch with a timeout — Firestore can hang if rules block or DB isn't provisioned
        const timeoutMs = 12_000;
        const fetchPromise = Promise.all([fetchDeals(userId), fetchCriteria(userId)]);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        );

        const [remoteDeals, remoteCriteria] = await Promise.race([
          fetchPromise,
          timeoutPromise,
        ]);

        // ── Reconcile deals ──
        const localDeals = deals;
        if (remoteDeals.length > 0) {
          // Merge local-only deals into Firestore result
          const remoteIds = new Set(remoteDeals.map((d) => d.id));
          const localOnly = localDeals.filter((d) => !remoteIds.has(d.id));
          const merged = [...remoteDeals, ...localOnly];
          dispatch(setDeals(merged));
          prevDealsRef.current = JSON.stringify(merged);
          // Upload any local-only deals to Firestore
          if (localOnly.length > 0) {
            Promise.all(localOnly.map((d) => saveDeal(d))).catch(() => {});
          }
        } else if (localDeals.length > 0) {
          prevDealsRef.current = JSON.stringify(localDeals);
          dispatch(setLoading(false));
          Promise.all(localDeals.map((d) => saveDeal(d))).catch(() => {});
        } else {
          dispatch(setDeals([]));
          prevDealsRef.current = '[]';
        }

        // ── Reconcile criteria ──
        if (remoteCriteria.length > 0) {
          dispatch(setCriteria(remoteCriteria));
          prevCriteriaRef.current = JSON.stringify(remoteCriteria);
        } else {
          const localCriteria = criteria;
          if (localCriteria.length > 0) {
            prevCriteriaRef.current = JSON.stringify(localCriteria);
            Promise.all(localCriteria.map((c) => saveCriteria(c))).catch(() => {});
          } else {
            dispatch(setCriteria([]));
            prevCriteriaRef.current = '[]';
          }
        }

        loadedRef.current = true;
      } catch {
        // Firestore unreachable — disable for this session so we don't
        // keep timing out on every save. localStorage handles persistence.
        firestoreDisabledRef.current = true;
        console.warn(
          '[DealForge] Firestore is unreachable. Deals are saved locally.\n' +
          'To enable cloud sync, ensure:\n' +
          '  1. Firestore is provisioned in Firebase Console → Build → Firestore Database\n' +
          '  2. Security rules allow access:\n' +
          '     match /users/{userId}/{document=**} {\n' +
          '       allow read, write: if request.auth != null && request.auth.uid == userId;\n' +
          '     }'
        );
        dispatch(setLoading(false));
        prevDealsRef.current = JSON.stringify(deals);
        prevCriteriaRef.current = JSON.stringify(criteria);
        loadedRef.current = true;
      }
    })();
  }, [user, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-save deal changes to Firestore ─────────────

  const syncDealsToFirestore = useCallback(
    async (current: Deal[], previous: Deal[]) => {
      if (!user || firestoreDisabledRef.current) return;

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
        } catch {
          // Silently fail — localStorage has the data
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
      if (!user || firestoreDisabledRef.current) return;

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
        } catch {
          // Silently fail — localStorage has the data
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
