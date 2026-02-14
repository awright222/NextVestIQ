// ============================================
// BreakdownDrawer — Slide-out panel for detail entries
// ============================================
// Wraps breakdown content in a right-side drawer that
// slides over the form without navigating away.

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BreakdownDrawerProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Computed total from the breakdown items */
  total?: number;
  /** Label for the total, e.g. "Total Labor Cost" */
  totalLabel?: string;
}

export default function BreakdownDrawer({
  title,
  isOpen,
  onClose,
  children,
  total,
  totalLabel,
}: BreakdownDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Wait for client-side mount so createPortal has a target
  useEffect(() => setMounted(true), []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-2xl transition-transform sm:max-w-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition hover:bg-secondary"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer with total */}
        {total !== undefined && (
          <div className="border-t border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {totalLabel || 'Calculated Total'}
              </span>
              <span className="text-lg font-bold text-card-foreground">
                {fmt(total)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">/yr</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Apply & Close
            </button>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
