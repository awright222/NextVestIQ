// ============================================
// Criteria Slice — Investment alert criteria
// ============================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InvestmentCriteria } from '@/types';

interface CriteriaState {
  items: InvestmentCriteria[];
}

const initialState: CriteriaState = {
  items: [],
};

const criteriaSlice = createSlice({
  name: 'criteria',
  initialState,
  reducers: {
    setCriteria(state, action: PayloadAction<InvestmentCriteria[]>) {
      state.items = action.payload;
    },

    addCriteria(state, action: PayloadAction<InvestmentCriteria>) {
      state.items.push(action.payload);
    },

    updateCriteria(state, action: PayloadAction<InvestmentCriteria>) {
      const idx = state.items.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
    },

    removeCriteria(state, action: PayloadAction<string>) {
      state.items = state.items.filter((c) => c.id !== action.payload);
    },

    toggleCriteriaActive(state, action: PayloadAction<string>) {
      const item = state.items.find((c) => c.id === action.payload);
      if (item) item.isActive = !item.isActive;
    },
  },
});

export const {
  setCriteria,
  addCriteria,
  updateCriteria,
  removeCriteria,
  toggleCriteriaActive,
} = criteriaSlice.actions;

export default criteriaSlice.reducer;
