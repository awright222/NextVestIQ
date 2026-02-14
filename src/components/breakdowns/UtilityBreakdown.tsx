// ============================================
// UtilityBreakdown — Per-location utility costs
// ============================================
// Monthly average utility costs by category per location.
// Auto-calculates annual total.

'use client';

import { Plus, Trash2 } from 'lucide-react';
import FormField from '@/components/ui/FormField';
import type { UtilityItem } from '@/types';

interface Props {
  data: UtilityItem[];
  onChange: (data: UtilityItem[]) => void;
}

function utilityMonthlyTotal(item: UtilityItem): number {
  return item.electric + item.gas + item.water + item.trash + item.internet + item.other;
}

export function calcTotalUtilities(items: UtilityItem[]): number {
  return items.reduce((sum, u) => sum + utilityMonthlyTotal(u) * 12, 0);
}

function defaultUtilityItem(): UtilityItem {
  return {
    id: crypto.randomUUID(),
    location: '',
    electric: 0,
    gas: 0,
    water: 0,
    trash: 0,
    internet: 0,
    other: 0,
  };
}

export default function UtilityBreakdown({ data, onChange }: Props) {
  const num = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    return isNaN(v) ? 0 : v;
  };

  const addItem = () => onChange([...data, defaultUtilityItem()]);
  const removeItem = (id: string) => onChange(data.filter((u) => u.id !== id));
  const updateItem = (id: string, field: keyof UtilityItem, value: string | number) =>
    onChange(data.map((u) => (u.id === id ? { ...u, [field]: value } : u)));

  const total = calcTotalUtilities(data);

  return (
    <div className="space-y-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-card-foreground">
          Utility Costs (Monthly Averages)
        </h4>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Location
        </button>
      </div>

      {data.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No locations added. Click &quot;Add Location&quot; to break down utility costs.
        </p>
      )}

      <div className="space-y-4">
        {data.map((item, idx) => {
          const monthly = utilityMonthlyTotal(item);

          return (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-secondary/30 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Location #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded p-1 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mb-2">
                <FormField
                  label="Location Name"
                  value={item.location}
                  onChange={(e) => updateItem(item.id, 'location', e.target.value)}
                  placeholder="e.g. Main St Store"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <FormField
                  label="Electric"
                  prefix="$"
                  type="number"
                  value={item.electric || ''}
                  onChange={(e) => updateItem(item.id, 'electric', num(e))}
                  hint="/mo avg"
                />
                <FormField
                  label="Gas"
                  prefix="$"
                  type="number"
                  value={item.gas || ''}
                  onChange={(e) => updateItem(item.id, 'gas', num(e))}
                  hint="/mo avg"
                />
                <FormField
                  label="Water/Sewer"
                  prefix="$"
                  type="number"
                  value={item.water || ''}
                  onChange={(e) => updateItem(item.id, 'water', num(e))}
                  hint="/mo avg"
                />
                <FormField
                  label="Trash"
                  prefix="$"
                  type="number"
                  value={item.trash || ''}
                  onChange={(e) => updateItem(item.id, 'trash', num(e))}
                  hint="/mo avg"
                />
                <FormField
                  label="Internet/Phone"
                  prefix="$"
                  type="number"
                  value={item.internet || ''}
                  onChange={(e) => updateItem(item.id, 'internet', num(e))}
                  hint="/mo avg"
                />
                <FormField
                  label="Other"
                  prefix="$"
                  type="number"
                  value={item.other || ''}
                  onChange={(e) => updateItem(item.id, 'other', num(e))}
                  hint="/mo avg"
                />
              </div>
              {monthly > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  = ${monthly.toLocaleString()}/mo → ${(monthly * 12).toLocaleString()}/yr
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {data.length > 0 && (
        <div className="rounded-lg bg-primary/5 p-3">
          <div className="space-y-1 text-xs text-muted-foreground">
            {data.map((item) => {
              const annual = utilityMonthlyTotal(item) * 12;
              return (
                <div key={item.id} className="flex justify-between">
                  <span>{item.location || 'Unnamed'}</span>
                  <span>${annual.toLocaleString()}/yr</span>
                </div>
              );
            })}
            <div className="flex justify-between border-t border-border pt-1 font-medium text-card-foreground">
              <span>Total Annual Utilities</span>
              <span>${total.toLocaleString()}/yr</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
