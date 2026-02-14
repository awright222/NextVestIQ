// ============================================
// LeaseBreakdown — Per-location lease schedule
// ============================================
// Lists each location with landlord, rent, escalation,
// lease dates, and NNN/CAM details.

'use client';

import { Plus, Trash2 } from 'lucide-react';
import FormField from '@/components/ui/FormField';
import type { LeaseItem } from '@/types';

interface Props {
  data: LeaseItem[];
  onChange: (data: LeaseItem[]) => void;
}

export function calcTotalLeaseCost(items: LeaseItem[]): number {
  return items.reduce((sum, l) => sum + l.monthlyRent * 12 + l.camCharges, 0);
}

function defaultLeaseItem(): LeaseItem {
  return {
    id: crypto.randomUUID(),
    location: '',
    landlord: '',
    monthlyRent: 0,
    leaseStartDate: '',
    leaseEndDate: '',
    annualEscalation: 3,
    tripleNet: false,
    camCharges: 0,
    notes: '',
  };
}

export default function LeaseBreakdown({ data, onChange }: Props) {
  const num = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    return isNaN(v) ? 0 : v;
  };

  const addItem = () => onChange([...data, defaultLeaseItem()]);
  const removeItem = (id: string) => onChange(data.filter((l) => l.id !== id));
  const updateItem = (id: string, field: keyof LeaseItem, value: string | number | boolean) =>
    onChange(data.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const total = calcTotalLeaseCost(data);

  return (
    <div className="space-y-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-card-foreground">
          Lease Agreements
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
          No leases added. Click &quot;Add Location&quot; to enter lease agreements.
        </p>
      )}

      <div className="space-y-4">
        {data.map((item, idx) => {
          const annualRent = item.monthlyRent * 12;
          const totalCost = annualRent + item.camCharges;

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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <FormField
                  label="Location Name"
                  value={item.location}
                  onChange={(e) => updateItem(item.id, 'location', e.target.value)}
                  placeholder="e.g. Main St Store"
                />
                <FormField
                  label="Landlord"
                  value={item.landlord}
                  onChange={(e) => updateItem(item.id, 'landlord', e.target.value)}
                  placeholder="e.g. ABC Properties"
                />
                <FormField
                  label="Monthly Rent"
                  prefix="$"
                  type="number"
                  value={item.monthlyRent || ''}
                  onChange={(e) => updateItem(item.id, 'monthlyRent', num(e))}
                />
                <FormField
                  label="Lease Start"
                  type="date"
                  value={item.leaseStartDate}
                  onChange={(e) =>
                    updateItem(item.id, 'leaseStartDate', e.target.value)
                  }
                />
                <FormField
                  label="Lease End"
                  type="date"
                  value={item.leaseEndDate}
                  onChange={(e) =>
                    updateItem(item.id, 'leaseEndDate', e.target.value)
                  }
                />
                <FormField
                  label="Annual Escalation"
                  suffix="%"
                  type="number"
                  step="0.5"
                  value={item.annualEscalation || ''}
                  onChange={(e) =>
                    updateItem(item.id, 'annualEscalation', num(e))
                  }
                />
                <div className="flex items-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={item.tripleNet}
                      onChange={(e) =>
                        updateItem(item.id, 'tripleNet', e.target.checked)
                      }
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Triple Net (NNN)
                  </label>
                </div>
                <FormField
                  label="Annual CAM Charges"
                  prefix="$"
                  type="number"
                  value={item.camCharges || ''}
                  onChange={(e) => updateItem(item.id, 'camCharges', num(e))}
                  hint={item.tripleNet ? 'NNN pass-through' : 'If applicable'}
                />
              </div>
              {/* Lease term remaining */}
              {item.leaseEndDate && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Annual cost: ${totalCost.toLocaleString()}/yr
                  {(() => {
                    const end = new Date(item.leaseEndDate);
                    const now = new Date();
                    const months = Math.round(
                      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
                    );
                    if (months <= 0) return ' · ⚠️ Lease expired';
                    if (months <= 12) return ` · ⚠️ ${months} months remaining`;
                    return ` · ${Math.round(months / 12)} years remaining`;
                  })()}
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
              const cost = item.monthlyRent * 12 + item.camCharges;
              return (
                <div key={item.id} className="flex justify-between">
                  <span>{item.location || 'Unnamed'}</span>
                  <span>${cost.toLocaleString()}/yr</span>
                </div>
              );
            })}
            <div className="flex justify-between border-t border-border pt-1 font-medium text-card-foreground">
              <span>Total Annual Lease Cost</span>
              <span>${total.toLocaleString()}/yr</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
