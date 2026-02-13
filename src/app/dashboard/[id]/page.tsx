// ============================================
// Deal Detail Page — /dashboard/[id]
// ============================================
// Shows full metrics, cash flow charts, and
// the what-if scenario builder for a single deal.

'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Star,
  Pencil,
  TrendingUp,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { toggleFavorite, addScenario, removeScenario, updateDeal } from '@/store/dealsSlice';
import { openModal, closeModal } from '@/store/uiSlice';
import MetricsPanel from '@/components/dashboard/MetricsPanel';
import ScenarioPanel from '@/components/dashboard/ScenarioPanel';
import CashFlowChart from '@/components/charts/CashFlowChart';
import ScenarioComparisonChart from '@/components/charts/ScenarioComparisonChart';
import DealForm from '@/components/dashboard/DealForm';
import Modal from '@/components/ui/Modal';
import type { Deal, Scenario, RealEstateDeal, BusinessDeal } from '@/types';
import { calcRealEstateMetrics, projectCashFlows } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics, projectBusinessCashFlows } from '@/lib/calculations/business';

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dealId = params.id as string;

  const deal = useAppSelector((s) => s.deals.items.find((d) => d.id === dealId));
  const modal = useAppSelector((s) => s.ui.modal);

  const isRE = deal?.dealType === 'real-estate';

  // ─── Cash flow projections for chart ────────────────────

  const cashFlowData = useMemo(() => {
    if (!deal) return [];
    if (isRE) {
      return projectCashFlows(deal.data as RealEstateDeal, 10);
    }
    return projectBusinessCashFlows(deal.data as BusinessDeal, 10);
  }, [deal, isRE]);

  // ─── Scenario comparison chart data ─────────────────────

  const scenarioChartData = useMemo(() => {
    if (!deal) return [];
    const baseMetrics = isRE
      ? calcRealEstateMetrics(deal.data as RealEstateDeal)
      : calcBusinessMetrics(deal.data as BusinessDeal);

    const base = {
      name: 'Base Case',
      cashFlow: isRE
        ? (baseMetrics as ReturnType<typeof calcRealEstateMetrics>).annualCashFlow
        : (baseMetrics as ReturnType<typeof calcBusinessMetrics>).annualCashFlow,
      roi: isRE
        ? (baseMetrics as ReturnType<typeof calcRealEstateMetrics>).roi
        : (baseMetrics as ReturnType<typeof calcBusinessMetrics>).roi,
      capRateOrSde: isRE
        ? (baseMetrics as ReturnType<typeof calcRealEstateMetrics>).capRate
        : (baseMetrics as ReturnType<typeof calcBusinessMetrics>).sde,
    };

    const scenarios = deal.scenarios.map((s) => {
      const overriddenData = { ...deal.data, ...s.overrides } as RealEstateDeal | BusinessDeal;

      if (s.overrides && typeof s.overrides === 'object') {
        const ov = s.overrides as Record<string, unknown>;
        const newFinancing = { ...deal.data.financing };
        for (const key of Object.keys(ov)) {
          if (key.startsWith('financing.')) {
            const fKey = key.replace('financing.', '');
            (newFinancing as Record<string, unknown>)[fKey] = ov[key];
          }
        }
        (overriddenData as unknown as Record<string, unknown>)['financing'] = newFinancing;
      }

      const m = isRE
        ? calcRealEstateMetrics(overriddenData as RealEstateDeal)
        : calcBusinessMetrics(overriddenData as BusinessDeal);

      return {
        name: s.name,
        cashFlow: isRE
          ? (m as ReturnType<typeof calcRealEstateMetrics>).annualCashFlow
          : (m as ReturnType<typeof calcBusinessMetrics>).annualCashFlow,
        roi: isRE
          ? (m as ReturnType<typeof calcRealEstateMetrics>).roi
          : (m as ReturnType<typeof calcBusinessMetrics>).roi,
        capRateOrSde: isRE
          ? (m as ReturnType<typeof calcRealEstateMetrics>).capRate
          : (m as ReturnType<typeof calcBusinessMetrics>).sde,
      };
    });

    return [base, ...scenarios];
  }, [deal, isRE]);

  // ─── Early return if deal not found ─────────────────────

  if (!deal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Deal not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This deal may have been deleted or the URL is incorrect.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // After the early return, deal is guaranteed to be defined.
  // Alias to a const so TypeScript narrows properly in nested functions.
  const currentDeal: Deal = deal;

  // ─── Handlers ───────────────────────────────────────────

  function handleSaveScenario(scenario: Scenario) {
    const existing = currentDeal.scenarios.find((s) => s.id === scenario.id);
    if (existing) {
      const updatedDeal: Deal = {
        ...currentDeal,
        scenarios: currentDeal.scenarios.map((s) =>
          s.id === scenario.id ? scenario : s
        ),
        updatedAt: new Date().toISOString(),
      };
      dispatch(updateDeal(updatedDeal));
    } else {
      dispatch(addScenario({ dealId: currentDeal.id, scenario }));
    }
  }

  function handleDeleteScenario(scenarioId: string) {
    dispatch(removeScenario({ dealId: currentDeal.id, scenarioId }));
  }

  function handleSaveDeal(updatedDeal: Deal) {
    dispatch(updateDeal(updatedDeal));
    dispatch(closeModal());
  }

  const price = isRE
    ? (currentDeal.data as RealEstateDeal).purchasePrice
    : (currentDeal.data as BusinessDeal).askingPrice;

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─────────────────────────────── */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-lg p-2 transition hover:bg-secondary"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      isRE
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                    }`}
                  >
                    {isRE ? <Building2 className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                    {isRE ? 'Real Estate' : 'Business'}
                  </span>
                  <h1 className="text-lg font-bold text-foreground">{currentDeal.name}</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)}
                  {currentDeal.tags.length > 0 && (
                    <span className="ml-2">
                      {currentDeal.tags.map((t) => (
                        <span key={t} className="mr-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => dispatch(toggleFavorite(currentDeal.id))}
                className="rounded-lg border border-border p-2 transition hover:bg-secondary"
              >
                <Star
                  className={`h-4 w-4 ${
                    currentDeal.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                  }`}
                />
              </button>
              <button
                onClick={() => dispatch(openModal({ type: 'deal-form', dealId: currentDeal.id }))}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                <Pencil className="h-4 w-4" />
                Edit Deal
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* ─── Metrics ─────────────────────────────── */}
        <MetricsPanel dealType={currentDeal.dealType} data={currentDeal.data} />

        {/* ─── Charts ──────────────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <CashFlowChart data={cashFlowData} />
          {scenarioChartData.length > 1 && (
            <ScenarioComparisonChart
              data={scenarioChartData}
              thirdMetricLabel={isRE ? 'Cap Rate %' : 'SDE $'}
            />
          )}
        </div>

        {/* ─── Scenario Builder ────────────────────── */}
        <div className="mt-8">
          <ScenarioPanel
            deal={currentDeal}
            onSaveScenario={handleSaveScenario}
            onDeleteScenario={handleDeleteScenario}
          />
        </div>

        {/* ─── Notes ───────────────────────────────── */}
        {currentDeal.notes && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h3 className="mb-2 text-sm font-semibold text-card-foreground">Notes</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{currentDeal.notes}</p>
          </div>
        )}
      </div>

      {/* ─── Edit Modal ────────────────────────────── */}
      <Modal
        title={`Edit: ${currentDeal.name}`}
        isOpen={modal.type === 'deal-form' && modal.dealId === currentDeal.id}
        onClose={() => dispatch(closeModal())}
      >
        <DealForm
          existingDeal={currentDeal}
          onSave={handleSaveDeal}
          onCancel={() => dispatch(closeModal())}
        />
      </Modal>
    </div>
  );
}
