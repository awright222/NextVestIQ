// ============================================
// AssetSchedule — Fixed asset & depreciation detail
// ============================================
// Lists owned/leased assets with cost basis, useful life,
// depreciation method, and calculates annual depreciation.

'use client';

import { Plus, Trash2 } from 'lucide-react';
import FormField from '@/components/ui/FormField';
import type { Asset } from '@/types';

interface Props {
  data: Asset[];
  onChange: (data: Asset[]) => void;
}

const DEP_METHODS = [
  { value: 'straight-line', label: 'Straight-Line' },
  { value: 'macrs-5', label: 'MACRS 5-Year' },
  { value: 'macrs-7', label: 'MACRS 7-Year' },
  { value: 'macrs-15', label: 'MACRS 15-Year' },
  { value: 'macrs-39', label: 'MACRS 39-Year' },
];

export function calcAssetDepreciation(asset: Asset): number {
  if (asset.ownership === 'leased') return 0;
  const depreciableBasis = asset.costBasis - asset.salvageValue;
  if (depreciableBasis <= 0) return 0;

  switch (asset.depreciationMethod) {
    case 'straight-line':
      return asset.usefulLifeYears > 0
        ? Math.round(depreciableBasis / asset.usefulLifeYears)
        : 0;
    case 'macrs-5':
      return Math.round(depreciableBasis / 5);
    case 'macrs-7':
      return Math.round(depreciableBasis / 7);
    case 'macrs-15':
      return Math.round(depreciableBasis / 15);
    case 'macrs-39':
      return Math.round(depreciableBasis / 39);
    default:
      return 0;
  }
}

export function calcTotalDepreciation(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + calcAssetDepreciation(a), 0);
}

function defaultAsset(): Asset {
  return {
    id: crypto.randomUUID(),
    name: '',
    ownership: 'owned',
    costBasis: 0,
    usefulLifeYears: 7,
    depreciationMethod: 'straight-line',
    yearAcquired: new Date().getFullYear(),
    salvageValue: 0,
  };
}

export default function AssetSchedule({ data, onChange }: Props) {
  const num = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    return isNaN(v) ? 0 : v;
  };

  const addAsset = () => onChange([...data, defaultAsset()]);

  const removeAsset = (id: string) =>
    onChange(data.filter((a) => a.id !== id));

  const updateAsset = (id: string, field: keyof Asset, value: string | number) =>
    onChange(data.map((a) => (a.id === id ? { ...a, [field]: value } : a)));

  const total = calcTotalDepreciation(data);

  return (
    <div className="space-y-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-card-foreground">
          Assets & Equipment
        </h4>
        <button
          type="button"
          onClick={addAsset}
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Asset
        </button>
      </div>

      {data.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No assets added. Click &quot;Add Asset&quot; to build a depreciation schedule.
        </p>
      )}

      <div className="space-y-4">
        {data.map((asset, idx) => {
          const annualDep = calcAssetDepreciation(asset);

          return (
            <div
              key={asset.id}
              className="rounded-lg border border-border bg-secondary/30 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Asset #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeAsset(asset.id)}
                  className="rounded p-1 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <FormField
                  label="Asset Name"
                  value={asset.name}
                  onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                  placeholder="e.g. Espresso Machine"
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Ownership
                  </label>
                  <select
                    value={asset.ownership}
                    onChange={(e) =>
                      updateAsset(asset.id, 'ownership', e.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  >
                    <option value="owned">Owned</option>
                    <option value="leased">Leased</option>
                  </select>
                </div>
                <FormField
                  label="Cost Basis"
                  prefix="$"
                  type="number"
                  value={asset.costBasis || ''}
                  onChange={(e) => updateAsset(asset.id, 'costBasis', num(e))}
                />
                {asset.ownership === 'owned' && (
                  <>
                    <FormField
                      label="Salvage Value"
                      prefix="$"
                      type="number"
                      value={asset.salvageValue || ''}
                      onChange={(e) =>
                        updateAsset(asset.id, 'salvageValue', num(e))
                      }
                    />
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Depreciation Method
                      </label>
                      <select
                        value={asset.depreciationMethod}
                        onChange={(e) =>
                          updateAsset(asset.id, 'depreciationMethod', e.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                      >
                        {DEP_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {asset.depreciationMethod === 'straight-line' && (
                      <FormField
                        label="Useful Life (years)"
                        type="number"
                        value={asset.usefulLifeYears || ''}
                        onChange={(e) =>
                          updateAsset(asset.id, 'usefulLifeYears', num(e))
                        }
                      />
                    )}
                    <FormField
                      label="Year Acquired"
                      type="number"
                      value={asset.yearAcquired || ''}
                      onChange={(e) =>
                        updateAsset(asset.id, 'yearAcquired', num(e))
                      }
                    />
                  </>
                )}
              </div>
              {asset.ownership === 'owned' && annualDep > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  = ${annualDep.toLocaleString()}/yr depreciation
                </p>
              )}
              {asset.ownership === 'leased' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Leased — no depreciation (lease payments tracked separately)
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
            {data.map((asset) => {
              const dep = calcAssetDepreciation(asset);
              return (
                <div key={asset.id} className="flex justify-between">
                  <span>{asset.name || 'Unnamed'} ({asset.ownership})</span>
                  <span>{dep > 0 ? `$${dep.toLocaleString()}/yr` : '—'}</span>
                </div>
              );
            })}
            <div className="flex justify-between border-t border-border pt-1 font-medium text-card-foreground">
              <span>Total Annual Depreciation</span>
              <span>${total.toLocaleString()}/yr</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
