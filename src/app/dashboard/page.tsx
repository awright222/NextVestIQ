// ============================================
// Dashboard Page — /dashboard
// ============================================

'use client';

import { useState } from 'react';
import {
  Plus,
  BarChart3,
  GitCompareArrows,
  TrendingUp,
  Building2,
  Briefcase,
  Star,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { setDashboardTab, openModal, setSidebarOpen } from '@/store/uiSlice';
import { toggleComparison, toggleFavorite } from '@/store/dealsSlice';
import DealCard from '@/components/dashboard/DealCard';
import ComparisonTable from '@/components/dashboard/ComparisonTable';
import FinancingSidebar from '@/components/dashboard/FinancingSidebar';
import type { Deal } from '@/types';

const tabs = [
  { key: 'all' as const, label: 'All Deals', icon: LayoutGrid },
  { key: 'real-estate' as const, label: 'Real Estate', icon: Building2 },
  { key: 'business' as const, label: 'Business', icon: Briefcase },
  { key: 'favorites' as const, label: 'Favorites', icon: Star },
];

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const deals = useAppSelector((s) => s.deals.items);
  const comparisonIds = useAppSelector((s) => s.deals.comparisonIds);
  const activeTab = useAppSelector((s) => s.ui.dashboardTab);
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter deals by active tab
  const filteredDeals = deals.filter((deal) => {
    if (activeTab === 'favorites') return deal.isFavorite;
    if (activeTab === 'all') return true;
    return deal.dealType === activeTab;
  });

  const comparisonDeals = deals.filter((d) => comparisonIds.includes(d.id));

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Main Content ─────────────────────── */}
      <div className="flex-1">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">NextVestIQ</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => dispatch(setSidebarOpen(!sidebarOpen))}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition hover:bg-secondary"
              >
                <BarChart3 className="h-4 w-4" />
                Rates
              </button>
              <button
                onClick={() => dispatch(openModal({ type: 'deal-form' }))}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                New Deal
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Tabs */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-secondary p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => dispatch(setDashboardTab(tab.key))}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {comparisonIds.length >= 2 && (
                <button
                  onClick={() => {
                    /* scroll to comparison */
                  }}
                  className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
                >
                  <GitCompareArrows className="h-4 w-4" />
                  Compare ({comparisonIds.length})
                </button>
              )}
              <button
                onClick={() =>
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                }
                className="rounded-lg border border-border p-2 transition hover:bg-secondary"
              >
                {viewMode === 'grid' ? (
                  <List className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Deal Cards */}
          {filteredDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-20 text-center">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">
                No deals yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first property or business deal to get started.
              </p>
              <button
                onClick={() => dispatch(openModal({ type: 'deal-form' }))}
                className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Add Deal
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                  : 'flex flex-col gap-3'
              }
            >
              {filteredDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  isComparing={comparisonIds.includes(deal.id)}
                  onToggleCompare={() => dispatch(toggleComparison(deal.id))}
                  onToggleFavorite={() => dispatch(toggleFavorite(deal.id))}
                  onEdit={() =>
                    dispatch(openModal({ type: 'deal-form', dealId: deal.id }))
                  }
                />
              ))}
            </div>
          )}

          {/* Comparison Table (shows when 2+ deals selected) */}
          {comparisonDeals.length >= 2 && (
            <div className="mt-8">
              <ComparisonTable deals={comparisonDeals} />
            </div>
          )}
        </div>
      </div>

      {/* ─── Financing Sidebar ────────────────── */}
      {sidebarOpen && <FinancingSidebar />}
    </div>
  );
}
