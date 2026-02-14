// ============================================
// 404 — Page Not Found
// ============================================

import Link from 'next/link';
import { ArrowLeft, MapPinOff } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <MapPinOff className="mb-6 h-16 w-16 text-muted-foreground/50" strokeWidth={1.5} />
      <h1 className="text-6xl font-extrabold tracking-tight text-foreground">404</h1>
      <p className="mt-3 text-lg font-medium text-foreground">Page not found</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" />
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
        >
          Home
        </Link>
      </div>
      <p className="mt-12 text-xs text-muted-foreground/60">
        DealForge &middot; Professional Underwriting Software
      </p>
    </div>
  );
}
