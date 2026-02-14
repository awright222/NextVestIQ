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
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Deal, InvestmentCriteria } from '@/types';

// ─── Helpers ─────────────────────────────────────────

/** Check if the Firestore SDK is initialized (db object exists) */
export function isFirestoreAvailable(): boolean {
  return !!db;
}

function userSubcollection(userId: string, sub: string) {
  if (!db) throw new Error('Firestore not configured');
  return collection(db, 'users', userId, sub);
}

function userDoc(userId: string, sub: string, docId: string) {
  if (!db) throw new Error('Firestore not configured');
  return doc(db, 'users', userId, sub, docId);
}

/**
 * Recursively strip `undefined` values from an object so Firestore
 * doesn't reject the document.  Arrays are preserved; `null` is kept.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) clean[k] = stripUndefined(v);
  }
  return clean as T;
}

// ═══════════════════════════════════════════════════════
// Deals
// ═══════════════════════════════════════════════════════

/** Fetch all deals for a user, ordered by most recently updated */
export async function fetchDeals(userId: string): Promise<Deal[]> {
  let snapshot: QuerySnapshot<DocumentData, DocumentData>;
  try {
    // Try ordered query first (requires index)
    const q = query(userSubcollection(userId, 'deals'), orderBy('updatedAt', 'desc'));
    snapshot = await getDocs(q);
  } catch {
    // Fall back to unordered if index doesn't exist
    snapshot = await getDocs(userSubcollection(userId, 'deals'));
  }
  return snapshot.docs.map((d) => d.data() as Deal);
}

/** Save (create or update) a deal to Firestore */
export async function saveDeal(deal: Deal): Promise<void> {
  await setDoc(userDoc(deal.userId, 'deals', deal.id), stripUndefined(deal));
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
  let snapshot: QuerySnapshot<DocumentData, DocumentData>;
  try {
    const q = query(
      userSubcollection(userId, 'criteria'),
      orderBy('createdAt', 'desc')
    );
    snapshot = await getDocs(q);
  } catch {
    snapshot = await getDocs(userSubcollection(userId, 'criteria'));
  }
  return snapshot.docs.map((d) => d.data() as InvestmentCriteria);
}

/** Save (create or update) a criteria to Firestore */
export async function saveCriteria(criteria: InvestmentCriteria): Promise<void> {
  await setDoc(userDoc(criteria.userId, 'criteria', criteria.id), stripUndefined(criteria));
}

/** Delete a criteria from Firestore */
export async function deleteCriteria(userId: string, criteriaId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'criteria', criteriaId));
}
