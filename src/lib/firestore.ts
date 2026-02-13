// ============================================
// Firestore Service — Deal CRUD operations
// ============================================
// All Firestore reads/writes for deals live here.
// Deals are stored at: users/{userId}/deals/{dealId}

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
import type { Deal } from '@/types';

function dealsCollection(userId: string) {
  if (!db) throw new Error('Firestore not configured');
  return collection(db, 'users', userId, 'deals');
}

function dealDoc(userId: string, dealId: string) {
  if (!db) throw new Error('Firestore not configured');
  return doc(db, 'users', userId, 'deals', dealId);
}

// ─── Read ────────────────────────────────────────────

/** Fetch all deals for a user, ordered by most recently updated */
export async function fetchDeals(userId: string): Promise<Deal[]> {
  const q = query(dealsCollection(userId), orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as Deal);
}

// ─── Write ───────────────────────────────────────────

/** Save (create or update) a deal to Firestore */
export async function saveDeal(deal: Deal): Promise<void> {
  await setDoc(dealDoc(deal.userId, deal.id), deal);
}

/** Delete a deal from Firestore */
export async function deleteDeal(userId: string, dealId: string): Promise<void> {
  await deleteDoc(dealDoc(userId, dealId));
}
