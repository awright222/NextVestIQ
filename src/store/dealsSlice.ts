// ============================================
// Deals Slice — Manage saved deals & scenarios
// ============================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Deal, Scenario, DealType } from '@/types';

interface DealsState {
  /** All saved deals for the current user */
  items: Deal[];

  /** Currently selected deal ID (for detail/edit view) */
  activeDealId: string | null;

  /** Deal IDs selected for side-by-side comparison */
  comparisonIds: string[];

  /** Loading & error states */
  loading: boolean;
  error: string | null;
}

const initialState: DealsState = {
  items: [],
  activeDealId: null,
  comparisonIds: [],
  loading: true,
  error: null,
};

const dealsSlice = createSlice({
  name: 'deals',
  initialState,
  reducers: {
    // ─── CRUD ────────────────────────────────────

    setDeals(state, action: PayloadAction<Deal[]>) {
      state.items = action.payload;
      state.loading = false;
    },

    addDeal(state, action: PayloadAction<Deal>) {
      state.items.unshift(action.payload);
    },

    updateDeal(state, action: PayloadAction<Deal>) {
      const idx = state.items.findIndex((d) => d.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
    },

    removeDeal(state, action: PayloadAction<string>) {
      state.items = state.items.filter((d) => d.id !== action.payload);
      if (state.activeDealId === action.payload) state.activeDealId = null;
      state.comparisonIds = state.comparisonIds.filter((id) => id !== action.payload);
    },

    // ─── Selection ───────────────────────────────

    setActiveDeal(state, action: PayloadAction<string | null>) {
      state.activeDealId = action.payload;
    },

    toggleComparison(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.comparisonIds.includes(id)) {
        state.comparisonIds = state.comparisonIds.filter((cid) => cid !== id);
      } else {
        state.comparisonIds.push(id);
      }
    },

    clearComparison(state) {
      state.comparisonIds = [];
    },

    // ─── Favorites ───────────────────────────────

    toggleFavorite(state, action: PayloadAction<string>) {
      const deal = state.items.find((d) => d.id === action.payload);
      if (deal) deal.isFavorite = !deal.isFavorite;
    },

    // ─── Scenarios ───────────────────────────────

    addScenario(
      state,
      action: PayloadAction<{ dealId: string; scenario: Scenario }>
    ) {
      const deal = state.items.find((d) => d.id === action.payload.dealId);
      if (deal) deal.scenarios.push(action.payload.scenario);
    },

    removeScenario(
      state,
      action: PayloadAction<{ dealId: string; scenarioId: string }>
    ) {
      const deal = state.items.find((d) => d.id === action.payload.dealId);
      if (deal) {
        deal.scenarios = deal.scenarios.filter(
          (s) => s.id !== action.payload.scenarioId
        );
      }
    },

    // ─── Loading state ───────────────────────────

    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setDeals,
  addDeal,
  updateDeal,
  removeDeal,
  setActiveDeal,
  toggleComparison,
  clearComparison,
  toggleFavorite,
  addScenario,
  removeScenario,
  setLoading,
  setError,
} = dealsSlice.actions;

export default dealsSlice.reducer;
