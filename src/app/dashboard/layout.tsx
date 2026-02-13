// ============================================
// Dashboard Layout — Protected by AuthGuard + Firestore sync
// ============================================

import AuthGuard from '@/components/auth/AuthGuard';
import FirestoreSyncProvider from '@/components/providers/FirestoreSyncProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <FirestoreSyncProvider>{children}</FirestoreSyncProvider>
    </AuthGuard>
  );
}
