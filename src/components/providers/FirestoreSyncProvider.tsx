// ============================================
// FirestoreSyncProvider — Activates Firestore ↔ Redux sync
// ============================================

'use client';

import { useFirestoreSync } from '@/hooks/useFirestoreSync';

export default function FirestoreSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useFirestoreSync();
  return <>{children}</>;
}
