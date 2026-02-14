// ============================================
// Redux Store — Root Configuration
// ============================================

import { configureStore } from '@reduxjs/toolkit';
import dealsReducer from './dealsSlice';
import uiReducer from './uiSlice';
import criteriaReducer from './criteriaSlice';

export const store = configureStore({
  reducer: {
    deals: dealsReducer,
    ui: uiReducer,
    criteria: criteriaReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
