// ============================================
// Redux Store — Root Configuration
// ============================================

import { configureStore } from '@reduxjs/toolkit';
import dealsReducer from './dealsSlice';
import uiReducer from './uiSlice';
import criteriaReducer from './criteriaSlice';
import type { Deal, InvestmentCriteria } from '@/types';

const STORAGE_KEY = 'dealforge-deals';
const CRITERIA_KEY = 'dealforge-criteria';

/** Read cached deals from localStorage (returns [] if unavailable) */
function loadCachedDeals(): Deal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

/** Read cached criteria from localStorage */
function loadCachedCriteria(): InvestmentCriteria[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CRITERIA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

/** Create a fresh store, pre-hydrated from localStorage for instant load */
export function makeStore() {
  const cachedDeals = loadCachedDeals();
  const cachedCriteria = loadCachedCriteria();

  const s = configureStore({
    reducer: {
      deals: dealsReducer,
      ui: uiReducer,
      criteria: criteriaReducer,
    },
  });

  // If we have cached data, hydrate immediately so the UI shows deals
  // before Firestore responds
  if (cachedDeals.length > 0) {
    // Importing setDeals at module level would create a circular dep,
    // so we dispatch the raw action shape instead.
    s.dispatch({ type: 'deals/setDeals', payload: cachedDeals });
    // Mark loading true so Firestore can still reconcile
    s.dispatch({ type: 'deals/setLoading', payload: true });
  }
  if (cachedCriteria.length > 0) {
    s.dispatch({ type: 'criteria/setCriteria', payload: cachedCriteria });
  }

  // Persist deals & criteria to localStorage on every change
  if (typeof window !== 'undefined') {
    s.subscribe(() => {
      const state = s.getState();
      try {
        const items = state.deals.items;
        // Always persist if we have deals; only persist empty if
        // the user is explicitly logged out (loading = false, empty items)
        // to avoid wiping the cache during a Firestore load race
        if (items.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } else if (!state.deals.loading) {
          // Only clear cache when loading is done and items truly empty
          // (i.e. user deleted all deals or logged out)
          const existing = localStorage.getItem(STORAGE_KEY);
          if (!existing || JSON.parse(existing).length === 0) {
            localStorage.setItem(STORAGE_KEY, '[]');
          }
        }
        localStorage.setItem(CRITERIA_KEY, JSON.stringify(state.criteria.items));
      } catch { /* storage full or unavailable */ }
    });
  }

  return s;
}

// Type inference helper (never used at runtime in SSR)
const _store = configureStore({
  reducer: { deals: dealsReducer, ui: uiReducer, criteria: criteriaReducer },
});
export type RootState = ReturnType<typeof _store.getState>;
export type AppDispatch = typeof _store.dispatch;
