// ============================================
// InterestBreakdown — Loan-by-loan interest detail
// ============================================
// Lists each debt obligation with lender, balance,
// rate, and annual interest paid.

'use client';

import { Plus, Trash2 } from 'lucide-react';
import FormField from '@/components/ui/FormField';
import type { InterestItem } from '@/types';

interface Props {
  data: InterestItem[];
  onChange: (data: InterestItem[]) => void;
}

export function calcTotalInterest(items: InterestItem[]): number {
  return items.reduce((sum, i) => sum + i.annualInterestPaid, 0);
}

function defaultInterestItem(): InterestItem {
  return {
    id: crypto.randomUUID(),
    lender: '',
    originalBalance: 0,
    currentBalance: 0,
    interestRate: 0,
    annualInterestPaid: 0,
    purpose: '',
  };
}

export default function InterestBreakdown({ data, onChange }: Props) {
  const num = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    return isNaN(v) ? 0 : v;
  };

  const addItem = () => onChange([...data, defaultInterestItem()]);
  const removeItem = (id: string) => onChange(data.filter((i) => i.id !== id));
  const updateItem = (id: string, field: keyof InterestItem, value: string | number) =>
    onChange(data.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const total = calcTotalInterest(data);

  return (
    <div className="space-y-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-card-foreground">
          Debt / Interest Schedule
        </h4>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Loan
        </button>
      </div>

      {data.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No loans added. Click &quot;Add Loan&quot; to track interest obligations.
        </p>
      )}

      <div className="space-y-4">
        {data.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-lg border border-border bg-secondary/30 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Loan #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="rounded p-1 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <FormField
                label="Lender / Source"
                value={item.lender}
                onChange={(e) => updateItem(item.id, 'lender', e.target.value)}
                placeholder="e.g. SBA 7(a) Main"
              />
              <FormField
                label="Purpose"
                value={item.purpose}
                onChange={(e) => updateItem(item.id, 'purpose', e.target.value)}
                placeholder="e.g. Acquisition"
              />
              <FormField
                label="Original Balance"
                prefix="$"
                type="number"
                value={item.originalBalance || ''}
                onChange={(e) => updateItem(item.id, 'originalBalance', num(e))}
              />
              <FormField
                label="Current Balance"
                prefix="$"
                type="number"
                value={item.currentBalance || ''}
                onChange={(e) => updateItem(item.id, 'currentBalance', num(e))}
              />
              <FormField
                label="Interest Rate"
                suffix="%"
                type="number"
                step="0.125"
                value={item.interestRate || ''}
                onChange={(e) => updateItem(item.id, 'interestRate', num(e))}
              />
              <FormField
                label="Annual Interest Paid"
                prefix="$"
                type="number"
                value={item.annualInterestPaid || ''}
                onChange={(e) => updateItem(item.id, 'annualInterestPaid', num(e))}
                hint="From 1098 or lender statement"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {data.length > 0 && (
        <div className="rounded-lg bg-primary/5 p-3">
          <div className="space-y-1 text-xs text-muted-foreground">
            {data.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.lender || 'Unnamed'} — {item.purpose || 'General'}</span>
                <span>${item.annualInterestPaid.toLocaleString()}/yr</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 font-medium text-card-foreground">
              <span>Total Annual Interest</span>
              <span>${total.toLocaleString()}/yr</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
