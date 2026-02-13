// ============================================
// SectionHeader — Collapsible form section header
// ============================================

'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function SectionHeader({
  title,
  isOpen,
  onToggle,
}: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 border-b border-border pb-2 text-left"
    >
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </button>
  );
}
