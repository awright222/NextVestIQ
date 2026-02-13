// ============================================
// FormField — Reusable labeled input component
// ============================================

'use client';

import { InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Optional prefix like "$" shown inside the input */
  prefix?: string;
  /** Optional suffix like "%" shown inside the input */
  suffix?: string;
  /** Helper text below the input */
  hint?: string;
  error?: string;
}

export default function FormField({
  label,
  prefix,
  suffix,
  hint,
  error,
  className,
  id,
  ...inputProps
}: FormFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-sm font-medium text-foreground"
      >
        {label}
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
