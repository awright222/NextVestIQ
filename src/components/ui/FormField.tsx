// ============================================
// FormField — Reusable labeled input component
// ============================================

'use client';

import { InputHTMLAttributes, useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Optional prefix like "$" shown inside the input */
  prefix?: string;
  /** Optional suffix like "%" shown inside the input */
  suffix?: string;
  /** Helper text below the input */
  hint?: string;
  error?: string;
  /** ⓘ tooltip — click to see more detail about what the field expects */
  tooltip?: string;
}

/** Small info-button + popover for field-level help */
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ml-1 inline-flex items-center text-muted-foreground transition hover:text-primary focus:outline-none"
        aria-label="More info"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-border bg-card p-2.5 text-xs leading-relaxed text-foreground shadow-lg">
          <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-border bg-card" />
          {text}
        </div>
      )}
    </div>
  );
}

export default function FormField({
  label,
  prefix,
  suffix,
  hint,
  error,
  tooltip,
  className,
  id,
  ...inputProps
}: FormFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1 flex items-center text-sm font-medium text-foreground"
      >
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <input
          id={fieldId}
          className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 ${
            prefix ? 'pl-7' : ''
          } ${suffix ? 'pr-8' : ''} ${error ? 'border-destructive' : ''}`}
          {...inputProps}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
