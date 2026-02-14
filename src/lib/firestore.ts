// ============================================
// Firestore Service — Deal & Criteria CRUD
// ============================================
// All Firestore reads/writes live here.
// Deals:    users/{userId}/deals/{dealId}
// Criteria: users/{userId}/criteria/{criteriaId}

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Deal, InvestmentCriteria } from '@/types';

// ─── Helpers ─────────────────────────────────────────

function userSubcollection(userId: string, sub: string) {
  if (!db) throw new Error('Firestore not configured');
  return collection(db, 'users', userId, sub);
}

function userDoc(userId: string, sub: string, docId: string) {
  if (!db) throw new Error('Firestore not configured');
  return doc(db, 'users', userId, sub, docId);
}

// ═══════════════════════════════════════════════════════
// Deals
// ═══════════════════════════════════════════════════════

/** Fetch all deals for a user, ordered by most recently updated */
export async function fetchDeals(userId: string): Promise<Deal[]> {
  const q = query(userSubcollection(userId, 'deals'), orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as Deal);
}

/** Save (create or update) a deal to Firestore */
export async function saveDeal(deal: Deal): Promise<void> {
  await setDoc(userDoc(deal.userId, 'deals', deal.id), deal);
}

/** Delete a deal from Firestore */
export async function deleteDeal(userId: string, dealId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'deals', dealId));
}

// ═══════════════════════════════════════════════════════
// Investment Criteria (Alerts)
// ═══════════════════════════════════════════════════════

/** Fetch all criteria for a user, ordered by creation date */
export async function fetchCriteria(userId: string): Promise<InvestmentCriteria[]> {
  const q = query(
    userSubcollection(userId, 'criteria'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as InvestmentCriteria);
}

/** Save (create or update) a criteria to Firestore */
export async function saveCriteria(criteria: InvestmentCriteria): Promise<void> {
  await setDoc(userDoc(criteria.userId, 'criteria', criteria.id), criteria);
}

/** Delete a criteria from Firestore */
export async function deleteCriteria(userId: string, criteriaId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'criteria', criteriaId));
}
