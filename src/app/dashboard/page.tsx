// ============================================
// Dashboard Page — /dashboard
// ============================================

'use client';

import { useState } from 'react';
import {
  Plus,
  BarChart3,
  GitCompareArrows,
  Building2,
  Briefcase,
  Store,
  Star,
  LayoutGrid,
  List,
  Search,
  Loader2,
  ArrowUpDown,
  Bell,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { setDashboardTab, openModal, closeModal, setSidebarOpen } from '@/store/uiSlice';
import { toggleComparison, toggleFavorite, addDeal, updateDeal, removeDeal } from '@/store/dealsSlice';
import DealCard from '@/components/dashboard/DealCard';
import ComparisonTable from '@/components/dashboard/ComparisonTable';
import FinancingSidebar from '@/components/dashboard/FinancingSidebar';
import DealForm from '@/components/dashboard/DealForm';
import AlertCriteriaPanel from '@/components/dashboard/AlertCriteriaPanel';
import Modal from '@/components/ui/Modal';
import type { Deal } from '@/types';

const tabs = [
  { key: 'all' as const, label: 'All Deals', icon: LayoutGrid },
  { key: 'real-estate' as const, label: 'Real Estate', icon: Building2 },
  { key: 'business' as const, label: 'Business', icon: Briefcase },
  { key: 'hybrid' as const, label: 'Hybrid', icon: Store },
  { key: 'favorites' as const, label: 'Favorites', icon: Star },
];

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const deals = useAppSelector((s) => s.deals.items);
  const isLoading = useAppSelector((s) => s.deals.loading);
  const comparisonIds = useAppSelector((s) => s.deals.comparisonIds);
  const criteria = useAppSelector((s) => s.criteria.items);
  const activeTab = useAppSelector((s) => s.ui.dashboardTab);
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const modal = useAppSelector((s) => s.ui.modal);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingDeal, setDeletingDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'price'>('newest');

  // The deal being edited (if any)
  const editingDeal = modal.dealId
    ? deals.find((d) => d.id === modal.dealId)
    : undefined;

  /** Save a new or updated deal to Redux */
  function handleSaveDeal(deal: Deal) {
    if (editingDeal) {
      dispatch(updateDeal(deal));
    } else {
      dispatch(addDeal(deal));
    }
    dispatch(closeModal());
  }

  function handleDeleteDeal() {
    if (deletingDeal) {
      dispatch(removeDeal(deletingDeal.id));
      setDeletingDeal(null);
    }
  }

  // Filter deals by active tab and search query
  const filteredDeals = deals
    .filter((deal) => {
      if (activeTab === 'favorites') return deal.isFavorite;
      if (activeTab === 'all') return true;
      return deal.dealType === activeTab;
    })
    .filter((deal) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        deal.name.toLowerCase().includes(q) ||
        deal.tags.some((t) => t.toLowerCase().includes(q)) ||
        deal.notes.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'oldest': return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'name': return a.name.localeCompare(b.name);
        case 'price': {
          const priceA = a.dealType === 'real-estate'
            ? (a.data as import('@/types').RealEstateDeal).purchasePrice
            : a.dealType === 'hybrid'
            ? (a.data as import('@/types').HybridDeal).purchasePrice
            : (a.data as import('@/types').BusinessDeal).askingPrice;
          const priceB = b.dealType === 'real-estate'
            ? (b.data as import('@/types').RealEstateDeal).purchasePrice
            : b.dealType === 'hybrid'
            ? (b.data as import('@/types').HybridDeal).purchasePrice
            : (b.data as import('@/types').BusinessDeal).askingPrice;
          return priceB - priceA;
        }
        default: return 0;
      }
    });

  const comparisonDeals = deals.filter((d) => comparisonIds.includes(d.id));

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Main Content ─────────────────────── */}
      <div className="flex-1">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">My Deals</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => dispatch(openModal({ type: 'alert-criteria' }))}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition hover:bg-secondary"
              >
                <Bell className="h-4 w-4" />
                Alerts
                {criteria.filter((c) => c.isActive).length > 0 && (
                  <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {criteria.filter((c) => c.isActive).length}
                  </span>
                )}
              </button>
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
          {/* Tabs + Search + Sort */}
          <div className="mb-6 space-y-4">
            {/* Row 1: Tabs + View controls */}
            <div className="flex items-center justify-between">
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
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {comparisonIds.length >= 2 && (
                  <button
                    onClick={() => {
                      document.getElementById('comparison-table')?.scrollIntoView({ behavior: 'smooth' });
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

            {/* Row 2: Search + Sort */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search deals by name, tags, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name A–Z</option>
                  <option value="price">Price High–Low</option>
                </select>
              </div>
              {deals.length > 0 && (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {filteredDeals.length} of {deals.length} deal{deals.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your deals...</p>
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-20 text-center">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">
                {searchQuery ? 'No matching deals' : 'No deals yet'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery
                  ? 'Try a different search term or clear the filter.'
                  : 'Add your first property or business deal to get started.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => dispatch(openModal({ type: 'deal-form' }))}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add Deal
                </button>
              )}
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
                  criteria={criteria}
                  onToggleCompare={() => dispatch(toggleComparison(deal.id))}
                  onToggleFavorite={() => dispatch(toggleFavorite(deal.id))}
                  onEdit={() =>
                    dispatch(openModal({ type: 'deal-form', dealId: deal.id }))
                  }
                  onDelete={() => setDeletingDeal(deal)}
                />
              ))}
            </div>
          )}

          {/* Comparison Table (shows when 2+ deals selected) */}
          {comparisonDeals.length >= 2 && (
            <div id="comparison-table" className="mt-8">
              <ComparisonTable deals={comparisonDeals} />
            </div>
          )}
        </div>
      </div>

      {/* ─── Financing Sidebar ────────────────── */}
      {sidebarOpen && <FinancingSidebar />}

      {/* ─── Deal Form Modal ──────────────────── */}
      <Modal
        title={editingDeal ? `Edit: ${editingDeal.name}` : 'New Deal'}
        isOpen={modal.type === 'deal-form'}
        onClose={() => dispatch(closeModal())}
      >
        <DealForm
          existingDeal={editingDeal}
          onSave={handleSaveDeal}
          onCancel={() => dispatch(closeModal())}
        />
      </Modal>

      {/* ─── Delete Confirmation Modal ────────── */}
      <Modal
        title="Delete Deal"
        isOpen={!!deletingDeal}
        onClose={() => setDeletingDeal(null)}
      >
        <div className="p-1">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deletingDeal?.name}</strong>?
            This will permanently remove the deal, all scenarios, and notes. This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setDeletingDeal(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteDeal}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Delete Deal
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Alert Criteria Modal ─────────────── */}
      <Modal
        title="Investment Alerts"
        isOpen={modal.type === 'alert-criteria'}
        onClose={() => dispatch(closeModal())}
      >
        <AlertCriteriaPanel />
      </Modal>
    </div>
  );
}
