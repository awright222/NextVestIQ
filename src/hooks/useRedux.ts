// ============================================
// Typed Redux Hooks
// ============================================

import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';

/** Use throughout the app instead of plain `useDispatch` */
export const useAppDispatch: () => AppDispatch = useDispatch;

/** Use throughout the app instead of plain `useSelector` */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
