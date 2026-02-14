// ============================================
// AlertCriteriaPanel — Manage investment criteria
// ============================================
// Users define metric-based rules (e.g. "Cap Rate >= 8%")
// and deals that match get flagged with alert badges.

'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  Bell,
  BellOff,
  Target,
  ChevronDown,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  addCriteria,
  removeCriteria,
  toggleCriteriaActive,
} from '@/store/criteriaSlice';
import type { InvestmentCriteria, CriteriaCondition, DealType } from '@/types';
import { METRIC_OPTIONS } from '@/lib/alerts';

const OPERATOR_LABELS: Record<CriteriaCondition['operator'], string> = {
  gte: '≥',
  lte: '≤',
  eq: '=',
};

const DEAL_TYPE_OPTIONS: { value: DealType | 'any'; label: string }[] = [
  { value: 'any', label: 'Any Deal Type' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'business', label: 'Business' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function AlertCriteriaPanel() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const criteria = useAppSelector((s) => s.criteria.items);

  // "New criteria" builder state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDealType, setNewDealType] = useState<DealType | 'any'>('any');
  const [conditions, setConditions] = useState<CriteriaCondition[]>([
    { metric: 'capRate', operator: 'gte', value: 0 },
  ]);

  // Current available metrics based on selected deal type
  const availableMetrics = METRIC_OPTIONS[newDealType];

  function handleAddCondition() {
    setConditions((prev) => [
      ...prev,
      { metric: availableMetrics[0].value, operator: 'gte', value: 0 },
    ]);
  }

  function handleRemoveCondition(idx: number) {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleConditionChange(
    idx: number,
    field: keyof CriteriaCondition,
    value: string | number
  ) {
    setConditions((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  }

  function handleSave() {
    if (!conditions.length || conditions.some((c) => c.value === 0)) return;

    const newCriteria: InvestmentCriteria = {
      id: crypto.randomUUID(),
      userId: user?.uid ?? '',
      name: newName || `Alert ${criteria.length + 1}`,
      dealType: newDealType,
      conditions,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    dispatch(addCriteria(newCriteria));
    setIsAdding(false);
    setNewName('');
    setConditions([{ metric: 'capRate', operator: 'gte', value: 0 }]);
    setNewDealType('any');
  }

  function handleCancel() {
    setIsAdding(false);
    setNewName('');
    setConditions([{ metric: 'capRate', operator: 'gte', value: 0 }]);
    setNewDealType('any');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Target className="h-5 w-5 text-primary" />
            Investment Criteria
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Set your target metrics. Deals that match will be flagged.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Alert
          </button>
        )}
      </div>

      {/* New Criteria Builder */}
      {isAdding && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Alert Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. High Cap Rate Deals"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Deal Type
              </label>
              <div className="relative">
                <select
                  value={newDealType}
                  onChange={(e) => {
                    const dt = e.target.value as DealType | 'any';
                    setNewDealType(dt);
                    // Reset conditions to first metric of new deal type
                    const metrics = METRIC_OPTIONS[dt];
                    setConditions([
                      { metric: metrics[0].value, operator: 'gte', value: 0 },
                    ]);
                  }}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {DEAL_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Conditions (ALL must match)
            </p>
            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
                >
                  <select
                    value={cond.metric}
                    onChange={(e) =>
                      handleConditionChange(idx, 'metric', e.target.value)
                    }
                    className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    {availableMetrics.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={cond.operator}
                    onChange={(e) =>
                      handleConditionChange(
                        idx,
                        'operator',
                        e.target.value as CriteriaCondition['operator']
                      )
                    }
                    className="w-16 rounded border border-border bg-background px-2 py-1.5 text-center text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="gte">≥</option>
                    <option value="lte">≤</option>
                    <option value="eq">=</option>
                  </select>

                  <input
                    type="number"
                    value={cond.value || ''}
                    onChange={(e) =>
                      handleConditionChange(
                        idx,
                        'value',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    className="w-28 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />

                  {conditions.length > 1 && (
                    <button
                      onClick={() => handleRemoveCondition(idx)}
                      className="rounded p-1 text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleAddCondition}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
            >
              <Plus className="h-3 w-3" />
              Add Condition
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Save Alert
            </button>
          </div>
        </div>
      )}

      {/* Saved Criteria List */}
      {criteria.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center">
          <Bell className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No alerts configured
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create an alert to flag deals that match your investment criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {criteria.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border bg-card p-4 transition ${
                c.isActive
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target
                    className={`h-4 w-4 ${
                      c.isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <h4 className="text-sm font-semibold text-card-foreground">
                    {c.name}
                  </h4>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {c.dealType === 'any' ? 'All Types' : c.dealType}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => dispatch(toggleCriteriaActive(c.id))}
                    className="rounded p-1.5 transition hover:bg-secondary"
                    title={c.isActive ? 'Disable alert' : 'Enable alert'}
                  >
                    {c.isActive ? (
                      <Bell className="h-4 w-4 text-primary" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => dispatch(removeCriteria(c.id))}
                    className="rounded p-1.5 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                    title="Delete alert"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.conditions.map((cond, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {cond.metric} {OPERATOR_LABELS[cond.operator]} {cond.value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
