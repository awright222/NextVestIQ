// ============================================
// UI Slice — App-wide UI state
// ============================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DealType } from '@/types';

interface UIState {
  /** Sidebar (financing rates panel) open/closed */
  sidebarOpen: boolean;

  /** Which tab is active on the dashboard */
  dashboardTab: 'all' | 'real-estate' | 'business' | 'hybrid' | 'favorites';

  /** Modal state */
  modal: {
    type: 'deal-form' | 'scenario' | 'alert-criteria' | null;
    dealId?: string;
  };

  /** New deal form default type */
  newDealType: DealType;
}

const initialState: UIState = {
  sidebarOpen: false,
  dashboardTab: 'all',
  modal: { type: null },
  newDealType: 'real-estate',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },

    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },

    setDashboardTab(state, action: PayloadAction<UIState['dashboardTab']>) {
      state.dashboardTab = action.payload;
    },

    openModal(state, action: PayloadAction<UIState['modal']>) {
      state.modal = action.payload;
    },

    closeModal(state) {
      state.modal = { type: null };
    },

    setNewDealType(state, action: PayloadAction<DealType>) {
      state.newDealType = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setDashboardTab,
  openModal,
  closeModal,
  setNewDealType,
} = uiSlice.actions;

export default uiSlice.reducer;
