// ============================================
// SelectField — Reusable labeled select component
// ============================================

'use client';

import { SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  hint?: string;
}

export default function SelectField({
  label,
  options,
  hint,
  className,
  id,
  ...selectProps
}: SelectFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <select
        id={fieldId}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        {...selectProps}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
