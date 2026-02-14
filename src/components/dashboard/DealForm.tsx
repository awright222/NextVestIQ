// ============================================
// DealForm — Create / Edit a deal
// ============================================
// Renders different field groups based on deal type
// (real-estate vs business). Includes financing section
// with loan type selector that auto-fills defaults.

'use client';

import { useState, useCallback } from 'react';
import { Building2, Briefcase, Store } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import FormField from '@/components/ui/FormField';
import SelectField from '@/components/ui/SelectField';
import SectionHeader from '@/components/ui/SectionHeader';
import type {
  Deal,
  DealType,
  LoanType,
  RealEstateDeal,
  BusinessDeal,
  HybridDeal,
  FinancingTerms,
  DealBreakdowns,
  PayrollBreakdown as PayrollBreakdownType,
  Asset,
  InterestItem,
  LeaseItem,
  UtilityItem,
} from '@/types';
import BreakdownDrawer from '@/components/ui/BreakdownDrawer';
import PayrollBreakdown, {
  calcPayrollTotal,
  defaultPayrollBreakdown,
} from '@/components/breakdowns/PayrollBreakdown';
import AssetSchedule, {
  calcTotalDepreciation,
} from '@/components/breakdowns/AssetSchedule';
import InterestBreakdownComp, {
  calcTotalInterest,
} from '@/components/breakdowns/InterestBreakdown';
import LeaseBreakdownComp, {
  calcTotalLeaseCost,
} from '@/components/breakdowns/LeaseBreakdown';
import UtilityBreakdownComp, {
  calcTotalUtilities,
} from '@/components/breakdowns/UtilityBreakdown';

// ─── Financing defaults per loan type ────────────────────────

const FINANCING_DEFAULTS: Record<LoanType, Omit<FinancingTerms, 'loanAmount'>> = {
  'sba-7a': { loanType: 'sba-7a', downPayment: 10, interestRate: 10.5, loanTermYears: 25, amortizationYears: 25 },
  'sba-504': { loanType: 'sba-504', downPayment: 10, interestRate: 6.6, loanTermYears: 25, amortizationYears: 25 },
  conventional: { loanType: 'conventional', downPayment: 20, interestRate: 7.25, loanTermYears: 30, amortizationYears: 30 },
  fha: { loanType: 'fha', downPayment: 3.5, interestRate: 6.5, loanTermYears: 30, amortizationYears: 30 },
  va: { loanType: 'va', downPayment: 0, interestRate: 6.25, loanTermYears: 30, amortizationYears: 30 },
  'hard-money': { loanType: 'hard-money', downPayment: 30, interestRate: 12, loanTermYears: 2, amortizationYears: 2 },
  custom: { loanType: 'custom', downPayment: 20, interestRate: 7.0, loanTermYears: 30, amortizationYears: 30 },
};

const LOAN_OPTIONS = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'sba-7a', label: 'SBA 7(a)' },
  { value: 'sba-504', label: 'SBA 504' },
  { value: 'fha', label: 'FHA' },
  { value: 'va', label: 'VA' },
  { value: 'hard-money', label: 'Hard Money / Bridge' },
  { value: 'custom', label: 'Custom' },
];

// ─── Default deal data ───────────────────────────────────────

function defaultRealEstate(): RealEstateDeal {
  return {
    type: 'real-estate',
    purchasePrice: 0,
    closingCosts: 0,
    rehabCosts: 0,
    grossRentalIncome: 0,
    otherIncome: 0,
    vacancyRate: 5,
    propertyTax: 0,
    insurance: 0,
    maintenance: 0,
    propertyManagement: 8,
    utilities: 0,
    otherExpenses: 0,
    financing: { ...FINANCING_DEFAULTS.conventional, loanAmount: 0 },
    annualRentGrowth: 3,
    annualExpenseGrowth: 2,
    annualAppreciation: 3,
  };
}

function defaultBusiness(): BusinessDeal {
  return {
    type: 'business',
    askingPrice: 0,
    closingCosts: 0,
    annualRevenue: 0,
    costOfGoods: 0,
    operatingExpenses: 0,
    ownerSalary: 0,
    depreciation: 0,
    amortization: 0,
    interest: 0,
    taxes: 0,
    otherAddBacks: 0,
    financing: { ...FINANCING_DEFAULTS['sba-7a'], loanAmount: 0 },
    annualRevenueGrowth: 5,
    annualExpenseGrowth: 3,
  };
}

function defaultHybrid(): HybridDeal {
  return {
    type: 'hybrid',
    purchasePrice: 0,
    propertyValue: 0,
    businessValue: 0,
    closingCosts: 0,
    rehabCosts: 0,
    grossRentalIncome: 0,
    otherPropertyIncome: 0,
    vacancyRate: 5,
    propertyTax: 0,
    insurance: 0,
    maintenance: 0,
    propertyManagement: 0,
    utilities: 0,
    otherPropertyExpenses: 0,
    annualRevenue: 0,
    costOfGoods: 0,
    businessOperatingExpenses: 0,
    ownerSalary: 0,
    depreciation: 0,
    amortization: 0,
    interest: 0,
    taxes: 0,
    otherAddBacks: 0,
    financing: { ...FINANCING_DEFAULTS['sba-7a'], loanAmount: 0 },
    annualRevenueGrowth: 5,
    annualRentGrowth: 3,
    annualExpenseGrowth: 3,
    annualAppreciation: 3,
  };
}

// ─── Props ───────────────────────────────────────────────────

interface DealFormProps {
  /** If provided, we're editing an existing deal */
  existingDeal?: Deal;
  onSave: (deal: Deal) => void;
  onCancel: () => void;
}

// ─── Component ───────────────────────────────────────────────

export default function DealForm({ existingDeal, onSave, onCancel }: DealFormProps) {
  const { user } = useAuth();

  // Deal metadata
  const [name, setName] = useState(existingDeal?.name ?? '');
  const [dealType, setDealType] = useState<DealType>(existingDeal?.dealType ?? 'real-estate');
  const [notes, setNotes] = useState(existingDeal?.notes ?? '');
  const [tags, setTags] = useState(existingDeal?.tags.join(', ') ?? '');

  // Deal data — separate state for each type to preserve values when toggling
  const [reData, setReData] = useState<RealEstateDeal>(
    existingDeal?.dealType === 'real-estate'
      ? (existingDeal.data as RealEstateDeal)
      : defaultRealEstate()
  );
  const [bizData, setBizData] = useState<BusinessDeal>(
    existingDeal?.dealType === 'business'
      ? (existingDeal.data as BusinessDeal)
      : defaultBusiness()
  );
  const [hybridData, setHybridData] = useState<HybridDeal>(
    existingDeal?.dealType === 'hybrid'
      ? (existingDeal.data as HybridDeal)
      : defaultHybrid()
  );

  // Section collapse state
  const [sections, setSections] = useState({
    purchase: true,
    income: true,
    expenses: true,
    financing: true,
    growth: false,
  });

  // Breakdowns state
  const [breakdowns, setBreakdowns] = useState<DealBreakdowns>(
    existingDeal?.breakdowns ?? {}
  );

  // Which breakdown drawer is open
  type DrawerKey = 'payroll' | 'assets' | 'interest' | 'leases' | 'utilities' | null;
  const [openDrawer, setOpenDrawer] = useState<DrawerKey>(null);

  const toggleSection = (key: keyof typeof sections) =>
    setSections((s) => ({ ...s, [key]: !s[key] }));

  // Currently active data based on deal type
  const isRE = dealType === 'real-estate';
  const isHybrid = dealType === 'hybrid';
  const currentData = isRE ? reData : isHybrid ? hybridData : bizData;

  // ─── Helpers for updating nested state ───────────────────

  const updateRE = useCallback(
    (field: keyof RealEstateDeal, value: number) =>
      setReData((prev) => ({ ...prev, [field]: value })),
    []
  );

  const updateBiz = useCallback(
    (field: keyof BusinessDeal, value: number) =>
      setBizData((prev) => ({ ...prev, [field]: value })),
    []
  );

  const updateHybrid = useCallback(
    (field: keyof HybridDeal, value: number) =>
      setHybridData((prev) => ({ ...prev, [field]: value })),
    []
  );

  const updateFinancing = useCallback(
    (field: keyof FinancingTerms, value: number | string) => {
      const update = (prev: FinancingTerms) => ({ ...prev, [field]: value });
      if (isRE) {
        setReData((prev) => ({ ...prev, financing: update(prev.financing) }));
      } else if (isHybrid) {
        setHybridData((prev) => ({ ...prev, financing: update(prev.financing) }));
      } else {
        setBizData((prev) => ({ ...prev, financing: update(prev.financing) }));
      }
    },
    [isRE, isHybrid]
  );

  /** When loan type changes, auto-fill the financing defaults */
  function handleLoanTypeChange(lt: LoanType) {
    const defaults = FINANCING_DEFAULTS[lt];
    const price = isRE ? reData.purchasePrice : isHybrid ? hybridData.purchasePrice : bizData.askingPrice;
    const loanAmount = price * (1 - defaults.downPayment / 100);

    const newFinancing: FinancingTerms = { ...defaults, loanAmount };

    if (isRE) {
      setReData((prev) => ({ ...prev, financing: newFinancing }));
    } else if (isHybrid) {
      setHybridData((prev) => ({ ...prev, financing: newFinancing }));
    } else {
      setBizData((prev) => ({ ...prev, financing: newFinancing }));
    }
  }

  /** Auto-calculate loan amount when purchase price or down payment changes */
  function recalcLoanAmount(price: number, downPct: number) {
    const loanAmount = price * (1 - downPct / 100);
    if (isRE) {
      setReData((prev) => ({ ...prev, financing: { ...prev.financing, loanAmount } }));
    } else if (isHybrid) {
      setHybridData((prev) => ({ ...prev, financing: { ...prev.financing, loanAmount } }));
    } else {
      setBizData((prev) => ({ ...prev, financing: { ...prev.financing, loanAmount } }));
    }
  }

  // ─── Numeric input handler ───────────────────────────────

  function num(e: React.ChangeEvent<HTMLInputElement>): number {
    const v = parseFloat(e.target.value);
    return isNaN(v) ? 0 : v;
  }

  // ─── Breakdown handlers (auto-calc parent fields) ────────

  function handlePayrollChange(payroll: PayrollBreakdownType) {
    setBreakdowns((prev) => ({ ...prev, payroll }));
    const total = calcPayrollTotal(payroll);
    if (total > 0) {
      // Payroll feeds into operatingExpenses for biz/hybrid
      if (dealType === 'business') {
        setBizData((prev) => ({ ...prev, operatingExpenses: total }));
      } else if (isHybrid) {
        setHybridData((prev) => ({ ...prev, businessOperatingExpenses: total }));
      }
    }
  }

  function handleAssetsChange(assets: Asset[]) {
    setBreakdowns((prev) => ({ ...prev, assets }));
    const total = calcTotalDepreciation(assets);
    if (dealType === 'business') {
      setBizData((prev) => ({ ...prev, depreciation: total }));
    } else if (isHybrid) {
      setHybridData((prev) => ({ ...prev, depreciation: total }));
    }
  }

  function handleInterestChange(interestItems: InterestItem[]) {
    setBreakdowns((prev) => ({ ...prev, interestItems }));
    const total = calcTotalInterest(interestItems);
    if (dealType === 'business') {
      setBizData((prev) => ({ ...prev, interest: total }));
    } else if (isHybrid) {
      setHybridData((prev) => ({ ...prev, interest: total }));
    }
  }

  function handleLeasesChange(leases: LeaseItem[]) {
    setBreakdowns((prev) => ({ ...prev, leases }));
    // Lease costs typically flow into operatingExpenses or otherPropertyExpenses
    // We don't auto-overwrite since leases may be part of a larger opex number
  }

  function handleUtilitiesChange(utilities: UtilityItem[]) {
    setBreakdowns((prev) => ({ ...prev, utilities }));
    const total = calcTotalUtilities(utilities);
    if (total > 0) {
      if (isRE) {
        setReData((prev) => ({ ...prev, utilities: total }));
      } else if (isHybrid) {
        setHybridData((prev) => ({ ...prev, utilities: total }));
      }
    }
  }

  /** Small "Break Down ▸" button rendered next to form fields */
  function breakdownBtn(drawer: NonNullable<DrawerKey>, label?: string) {
    const hasData = (() => {
      switch (drawer) {
        case 'payroll': return (breakdowns.payroll?.employees.length ?? 0) > 0;
        case 'assets': return (breakdowns.assets?.length ?? 0) > 0;
        case 'interest': return (breakdowns.interestItems?.length ?? 0) > 0;
        case 'leases': return (breakdowns.leases?.length ?? 0) > 0;
        case 'utilities': return (breakdowns.utilities?.length ?? 0) > 0;
      }
    })();

    return (
      <button
        type="button"
        onClick={() => setOpenDrawer(drawer)}
        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
          hasData
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-800'
            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
        }`}
        title={`Open ${label || drawer} detail breakdown`}
      >
        {hasData ? '✓ ' : ''}
        {label || 'Break Down ▸'}
      </button>
    );
  }

  // ─── Validation ──────────────────────────────────────────

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  function validate(): boolean {
    const errs: Record<string, string> = {};

    // Name
    if (!name.trim()) {
      errs.name = 'Deal name is required';
    }

    // Price
    if (isRE && reData.purchasePrice <= 0) {
      errs.purchasePrice = 'Purchase price must be greater than 0';
    }
    if (isHybrid && hybridData.purchasePrice <= 0) {
      errs.purchasePrice = 'Purchase price must be greater than 0';
    }
    if (!isRE && !isHybrid && bizData.askingPrice <= 0) {
      errs.askingPrice = 'Asking price must be greater than 0';
    }

    // Income
    if (isRE && reData.grossRentalIncome <= 0) {
      errs.grossRentalIncome = 'Rental income is required';
    }
    if (!isRE && !isHybrid && bizData.annualRevenue <= 0) {
      errs.annualRevenue = 'Annual revenue is required';
    }
    if (isHybrid && hybridData.annualRevenue <= 0 && hybridData.grossRentalIncome <= 0) {
      errs.annualRevenue = 'Enter revenue or rental income';
    }

    // Percentage ranges
    const pctFields: Array<{ key: string; val: number; label: string }> = [];
    if (isRE) {
      pctFields.push(
        { key: 'vacancyRate', val: reData.vacancyRate, label: 'Vacancy rate' },
        { key: 'propertyManagement', val: reData.propertyManagement, label: 'Management %' }
      );
    }
    if (isHybrid) {
      pctFields.push(
        { key: 'vacancyRate', val: hybridData.vacancyRate, label: 'Vacancy rate' },
        { key: 'propertyManagement', val: hybridData.propertyManagement, label: 'Management %' }
      );
    }

    // Financing
    const fin = currentData.financing;
    if (fin.downPayment < 0 || fin.downPayment > 100) {
      errs.downPayment = 'Down payment must be 0–100%';
    }
    if (fin.interestRate < 0 || fin.interestRate > 30) {
      errs.interestRate = 'Interest rate must be 0–30%';
    }
    if (fin.amortizationYears <= 0 || fin.amortizationYears > 50) {
      errs.amortizationYears = 'Amortization must be 1–50 years';
    }

    for (const p of pctFields) {
      if (p.val < 0 || p.val > 100) {
        errs[p.key] = `${p.label} must be 0–100%`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /** Get error message for a field, or undefined */
  const fieldError = (key: string) => errors[key];

  // ─── Submit ──────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) {
      toast('Please fix the errors below', 'error');
      return;
    }

    const now = new Date().toISOString();
    const deal: Deal = {
      id: existingDeal?.id ?? crypto.randomUUID(),
      userId: existingDeal?.userId ?? user?.uid ?? '',
      name: name || (isRE ? 'Untitled Property' : isHybrid ? 'Untitled Hybrid' : 'Untitled Business'),
      dealType,
      data: isRE ? reData : isHybrid ? hybridData : bizData,
      breakdowns: Object.keys(breakdowns).length > 0 ? breakdowns : undefined,
      scenarios: existingDeal?.scenarios ?? [],
      notes,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isFavorite: existingDeal?.isFavorite ?? false,
      createdAt: existingDeal?.createdAt ?? now,
      updatedAt: now,
    };

    onSave(deal);
  }

  // ─── Render ──────────────────────────────────────────────

  const financing = currentData.financing;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ─── Deal Type Toggle ─────────────────── */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Deal Type
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDealType('real-estate')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              isRE
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Real Estate
          </button>
          <button
            type="button"
            onClick={() => setDealType('business')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              dealType === 'business'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Business
          </button>
          <button
            type="button"
            onClick={() => setDealType('hybrid')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              isHybrid
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Store className="h-4 w-4" />
            Hybrid
          </button>
        </div>
        {isHybrid && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            For deals where you buy both the property and the business (e.g. laundromat, car wash, restaurant).
          </p>
        )}
      </div>

      {/* ─── Deal Name ────────────────────────── */}
      <FormField
        label="Deal Name"
        placeholder={isRE ? 'e.g. 123 Main St Duplex' : isHybrid ? 'e.g. Main St Laundromat' : 'e.g. Joe\'s Auto Shop'}
        value={name}
        onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
        error={fieldError('name')}
      />

      {/* ═══════════════════════════════════════ */}
      {/* REAL ESTATE FIELDS                      */}
      {/* ═══════════════════════════════════════ */}
      {isRE && (
        <>
          {/* Purchase */}
          <div>
            <SectionHeader title="Purchase" isOpen={sections.purchase} onToggle={() => toggleSection('purchase')} />
            {sections.purchase && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <FormField
                  label="Purchase Price"
                  prefix="$"
                  type="number"
                  value={reData.purchasePrice || ''}
                  onChange={(e) => {
                    const v = num(e);
                    updateRE('purchasePrice', v);
                    recalcLoanAmount(v, reData.financing.downPayment);
                    setErrors((p) => ({ ...p, purchasePrice: '' }));
                  }}
                  placeholder="500,000"
                  error={fieldError('purchasePrice')}
                />
                <FormField
                  label="Closing Costs"
                  prefix="$"
                  type="number"
                  value={reData.closingCosts || ''}
                  onChange={(e) => updateRE('closingCosts', num(e))}
                  placeholder="10,000"
                />
                <FormField
                  label="Rehab / Renovation"
                  prefix="$"
                  type="number"
                  value={reData.rehabCosts || ''}
                  onChange={(e) => updateRE('rehabCosts', num(e))}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          {/* Income */}
          <div>
            <SectionHeader title="Income (Annual)" isOpen={sections.income} onToggle={() => toggleSection('income')} />
            {sections.income && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <FormField
                  label="Gross Rental Income"
                  prefix="$"
                  type="number"
                  value={reData.grossRentalIncome || ''}
                  onChange={(e) => { updateRE('grossRentalIncome', num(e)); setErrors((p) => ({ ...p, grossRentalIncome: '' })); }}
                  hint="Total annual rent"
                  error={fieldError('grossRentalIncome')}
                />
                <FormField
                  label="Other Income"
                  prefix="$"
                  type="number"
                  value={reData.otherIncome || ''}
                  onChange={(e) => updateRE('otherIncome', num(e))}
                  hint="Laundry, parking, etc."
                />
                <FormField
                  label="Vacancy Rate"
                  suffix="%"
                  type="number"
                  value={reData.vacancyRate || ''}
                  onChange={(e) => updateRE('vacancyRate', num(e))}
                  hint="Typical: 5-10%"
                />
              </div>
            )}
          </div>

          {/* Expenses */}
          <div>
            <SectionHeader title="Operating Expenses (Annual)" isOpen={sections.expenses} onToggle={() => toggleSection('expenses')} />
            {sections.expenses && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <FormField label="Property Tax" prefix="$" type="number" value={reData.propertyTax || ''} onChange={(e) => updateRE('propertyTax', num(e))} />
                <FormField label="Insurance" prefix="$" type="number" value={reData.insurance || ''} onChange={(e) => updateRE('insurance', num(e))} />
                <FormField label="Maintenance" prefix="$" type="number" value={reData.maintenance || ''} onChange={(e) => updateRE('maintenance', num(e))} />
                <FormField label="Management Fee" suffix="%" type="number" value={reData.propertyManagement || ''} onChange={(e) => updateRE('propertyManagement', num(e))} hint="% of gross income" />
                <div>
                  <FormField label="Utilities" prefix="$" type="number" value={reData.utilities || ''} onChange={(e) => updateRE('utilities', num(e))} hint={breakdowns.utilities?.length ? 'Auto-calculated from breakdown' : undefined} />
                  <div className="mt-1">{breakdownBtn('utilities', 'Utilities ▸')}</div>
                </div>
                <FormField label="Other Expenses" prefix="$" type="number" value={reData.otherExpenses || ''} onChange={(e) => updateRE('otherExpenses', num(e))} />
              </div>
            )}
          </div>

          {/* Growth */}
          <div>
            <SectionHeader title="Growth Assumptions" isOpen={sections.growth} onToggle={() => toggleSection('growth')} />
            {sections.growth && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <FormField label="Rent Growth" suffix="%" type="number" step="0.1" value={reData.annualRentGrowth || ''} onChange={(e) => updateRE('annualRentGrowth', num(e))} />
                <FormField label="Expense Growth" suffix="%" type="number" step="0.1" value={reData.annualExpenseGrowth || ''} onChange={(e) => updateRE('annualExpenseGrowth', num(e))} />
                <FormField label="Appreciation" suffix="%" type="number" step="0.1" value={reData.annualAppreciation || ''} onChange={(e) => updateRE('annualAppreciation', num(e))} />
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* BUSINESS FIELDS                         */}
      {/* ═══════════════════════════════════════ */}
      {dealType === 'business' && (
        <>
          {/* Purchase */}
          <div>
            <SectionHeader title="Purchase" isOpen={sections.purchase} onToggle={() => toggleSection('purchase')} />
            {sections.purchase && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <FormField
                  label="Asking Price"
                  prefix="$"
                  type="number"
                  value={bizData.askingPrice || ''}
                  onChange={(e) => {
                    const v = num(e);
                    updateBiz('askingPrice', v);
                    recalcLoanAmount(v, bizData.financing.downPayment);
                    setErrors((p) => ({ ...p, askingPrice: '' }));
                  }}
                  placeholder="350,000"
                  error={fieldError('askingPrice')}
                />
                <FormField
                  label="Closing Costs"
                  prefix="$"
                  type="number"
                  value={bizData.closingCosts || ''}
                  onChange={(e) => updateBiz('closingCosts', num(e))}
                />
              </div>
            )}
          </div>

          {/* Revenue & Expenses */}
          <div>
            <SectionHeader title="Revenue & Expenses (Annual)" isOpen={sections.income} onToggle={() => toggleSection('income')} />
            {sections.income && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <FormField label="Annual Revenue" prefix="$" type="number" value={bizData.annualRevenue || ''} onChange={(e) => { updateBiz('annualRevenue', num(e)); setErrors((p) => ({ ...p, annualRevenue: '' })); }} error={fieldError('annualRevenue')} />
                  <FormField label="Cost of Goods" prefix="$" type="number" value={bizData.costOfGoods || ''} onChange={(e) => updateBiz('costOfGoods', num(e))} />
                  <div>
                    <FormField label="Operating Expenses" prefix="$" type="number" value={bizData.operatingExpenses || ''} onChange={(e) => updateBiz('operatingExpenses', num(e))} hint={breakdowns.payroll?.employees.length ? 'Auto-calculated from payroll' : undefined} />
                    <div className="mt-1 flex gap-1.5">
                      {breakdownBtn('payroll', 'Payroll ▸')}
                      {breakdownBtn('leases', 'Leases ▸')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SDE Add-backs */}
          <div>
            <SectionHeader title="SDE / EBITDA Add-Backs" isOpen={sections.expenses} onToggle={() => toggleSection('expenses')} />
            {sections.expenses && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <FormField label="Owner Salary" prefix="$" type="number" value={bizData.ownerSalary || ''} onChange={(e) => updateBiz('ownerSalary', num(e))} hint="Added back for SDE" />
                <div>
                  <FormField label="Depreciation" prefix="$" type="number" value={bizData.depreciation || ''} onChange={(e) => updateBiz('depreciation', num(e))} hint={breakdowns.assets?.length ? 'Auto-calculated from assets' : undefined} />
                  <div className="mt-1">{breakdownBtn('assets', 'Assets ▸')}</div>
                </div>
                <FormField label="Amortization" prefix="$" type="number" value={bizData.amortization || ''} onChange={(e) => updateBiz('amortization', num(e))} />
                <div>
                  <FormField label="Interest" prefix="$" type="number" value={bizData.interest || ''} onChange={(e) => updateBiz('interest', num(e))} hint={breakdowns.interestItems?.length ? 'Auto-calculated from debt schedule' : undefined} />
                  <div className="mt-1">{breakdownBtn('interest', 'Debt Schedule ▸')}</div>
                </div>
                <FormField label="Taxes" prefix="$" type="number" value={bizData.taxes || ''} onChange={(e) => updateBiz('taxes', num(e))} />
                <FormField label="Other Add-Backs" prefix="$" type="number" value={bizData.otherAddBacks || ''} onChange={(e) => updateBiz('otherAddBacks', num(e))} hint="One-time / discretionary" />
              </div>
            )}
          </div>

          {/* Growth */}
          <div>
            <SectionHeader title="Growth Assumptions" isOpen={sections.growth} onToggle={() => toggleSection('growth')} />
            {sections.growth && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <FormField label="Revenue Growth" suffix="%" type="number" step="0.1" value={bizData.annualRevenueGrowth || ''} onChange={(e) => updateBiz('annualRevenueGrowth', num(e))} />
                <FormField label="Expense Growth" suffix="%" type="number" step="0.1" value={bizData.annualExpenseGrowth || ''} onChange={(e) => updateBiz('annualExpenseGrowth', num(e))} />
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* HYBRID FIELDS                           */}
      {/* ═══════════════════════════════════════ */}
      {isHybrid && (
        <>
          {/* Purchase / Value Allocation */}
          <div>
            <SectionHeader title="Purchase & Value Allocation" isOpen={sections.purchase} onToggle={() => toggleSection('purchase')} />
            {sections.purchase && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <FormField
                  label="Total Purchase Price"
                  prefix="$"
                  type="number"
                  value={hybridData.purchasePrice || ''}
                  onChange={(e) => {
                    const v = num(e);
                    updateHybrid('purchasePrice', v);
                    recalcLoanAmount(v, hybridData.financing.downPayment);
                    setErrors((p) => ({ ...p, purchasePrice: '' }));
                  }}
                  placeholder="750,000"
                  error={fieldError('purchasePrice')}
                />
                <FormField
                  label="Property Value"
                  prefix="$"
                  type="number"
                  value={hybridData.propertyValue || ''}
                  onChange={(e) => updateHybrid('propertyValue', num(e))}
                  hint="Allocated to real estate"
                />
                <FormField
                  label="Business Value"
                  prefix="$"
                  type="number"
                  value={hybridData.businessValue || ''}
                  onChange={(e) => updateHybrid('businessValue', num(e))}
                  hint="Allocated to goodwill / business"
                />
                <FormField label="Closing Costs" prefix="$" type="number" value={hybridData.closingCosts || ''} onChange={(e) => updateHybrid('closingCosts', num(e))} />
                <FormField label="Rehab / Renovation" prefix="$" type="number" value={hybridData.rehabCosts || ''} onChange={(e) => updateHybrid('rehabCosts', num(e))} />
              </div>
            )}
          </div>

          {/* Property Income */}
          <div>
            <SectionHeader title="Property Income (Annual)" isOpen={sections.income} onToggle={() => toggleSection('income')} />
            {sections.income && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <FormField label="Gross Rental Income" prefix="$" type="number" value={hybridData.grossRentalIncome || ''} onChange={(e) => updateHybrid('grossRentalIncome', num(e))} hint="If part of building is separately rented" />
                <FormField label="Other Property Income" prefix="$" type="number" value={hybridData.otherPropertyIncome || ''} onChange={(e) => updateHybrid('otherPropertyIncome', num(e))} hint="Parking, storage, etc." />
                <FormField label="Vacancy Rate" suffix="%" type="number" value={hybridData.vacancyRate || ''} onChange={(e) => updateHybrid('vacancyRate', num(e))} hint="For rental portion" />
              </div>
            )}
          </div>

          {/* Property Expenses */}
          <div>
            <SectionHeader title="Property Expenses (Annual)" isOpen={sections.expenses} onToggle={() => toggleSection('expenses')} />
            {sections.expenses && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <FormField label="Property Tax" prefix="$" type="number" value={hybridData.propertyTax || ''} onChange={(e) => updateHybrid('propertyTax', num(e))} />
                <FormField label="Insurance" prefix="$" type="number" value={hybridData.insurance || ''} onChange={(e) => updateHybrid('insurance', num(e))} />
                <FormField label="Maintenance" prefix="$" type="number" value={hybridData.maintenance || ''} onChange={(e) => updateHybrid('maintenance', num(e))} />
                <FormField label="Management Fee" suffix="%" type="number" value={hybridData.propertyManagement || ''} onChange={(e) => updateHybrid('propertyManagement', num(e))} hint="% of property gross income" />
                <div>
                  <FormField label="Utilities" prefix="$" type="number" value={hybridData.utilities || ''} onChange={(e) => updateHybrid('utilities', num(e))} hint={breakdowns.utilities?.length ? 'Auto-calculated from breakdown' : undefined} />
                  <div className="mt-1">{breakdownBtn('utilities', 'Utilities ▸')}</div>
                </div>
                <FormField label="Other Property Expenses" prefix="$" type="number" value={hybridData.otherPropertyExpenses || ''} onChange={(e) => updateHybrid('otherPropertyExpenses', num(e))} />
              </div>
            )}
          </div>

          {/* Business Revenue & Expenses */}
          <div>
            <SectionHeader title="Business Revenue & Expenses (Annual)" isOpen={true} onToggle={() => {}} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <FormField label="Annual Revenue" prefix="$" type="number" value={hybridData.annualRevenue || ''} onChange={(e) => updateHybrid('annualRevenue', num(e))} />
              <FormField label="Cost of Goods" prefix="$" type="number" value={hybridData.costOfGoods || ''} onChange={(e) => updateHybrid('costOfGoods', num(e))} />
              <div>
                <FormField label="Operating Expenses" prefix="$" type="number" value={hybridData.businessOperatingExpenses || ''} onChange={(e) => updateHybrid('businessOperatingExpenses', num(e))} hint={breakdowns.payroll?.employees.length ? 'Auto-calculated from payroll' : undefined} />
                <div className="mt-1 flex gap-1.5">
                  {breakdownBtn('payroll', 'Payroll ▸')}
                  {breakdownBtn('leases', 'Leases ▸')}
                </div>
              </div>
            </div>
          </div>

          {/* SDE Add-Backs */}
          <div>
            <SectionHeader title="SDE / EBITDA Add-Backs" isOpen={true} onToggle={() => {}} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <FormField label="Owner Salary" prefix="$" type="number" value={hybridData.ownerSalary || ''} onChange={(e) => updateHybrid('ownerSalary', num(e))} hint="Added back for SDE" />
              <div>
                <FormField label="Depreciation" prefix="$" type="number" value={hybridData.depreciation || ''} onChange={(e) => updateHybrid('depreciation', num(e))} hint={breakdowns.assets?.length ? 'Auto-calculated from assets' : undefined} />
                <div className="mt-1">{breakdownBtn('assets', 'Assets ▸')}</div>
              </div>
              <FormField label="Amortization" prefix="$" type="number" value={hybridData.amortization || ''} onChange={(e) => updateHybrid('amortization', num(e))} />
              <div>
                <FormField label="Interest" prefix="$" type="number" value={hybridData.interest || ''} onChange={(e) => updateHybrid('interest', num(e))} hint={breakdowns.interestItems?.length ? 'Auto-calculated from debt schedule' : undefined} />
                <div className="mt-1">{breakdownBtn('interest', 'Debt Schedule ▸')}</div>
              </div>
              <FormField label="Taxes" prefix="$" type="number" value={hybridData.taxes || ''} onChange={(e) => updateHybrid('taxes', num(e))} />
              <FormField label="Other Add-Backs" prefix="$" type="number" value={hybridData.otherAddBacks || ''} onChange={(e) => updateHybrid('otherAddBacks', num(e))} />
            </div>
          </div>

          {/* Hybrid Growth */}
          <div>
            <SectionHeader title="Growth Assumptions" isOpen={sections.growth} onToggle={() => toggleSection('growth')} />
            {sections.growth && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FormField label="Revenue Growth" suffix="%" type="number" step="0.1" value={hybridData.annualRevenueGrowth || ''} onChange={(e) => updateHybrid('annualRevenueGrowth', num(e))} />
                <FormField label="Rent Growth" suffix="%" type="number" step="0.1" value={hybridData.annualRentGrowth || ''} onChange={(e) => updateHybrid('annualRentGrowth', num(e))} />
                <FormField label="Expense Growth" suffix="%" type="number" step="0.1" value={hybridData.annualExpenseGrowth || ''} onChange={(e) => updateHybrid('annualExpenseGrowth', num(e))} />
                <FormField label="Appreciation" suffix="%" type="number" step="0.1" value={hybridData.annualAppreciation || ''} onChange={(e) => updateHybrid('annualAppreciation', num(e))} />
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* FINANCING (shared)                      */}
      {/* ═══════════════════════════════════════ */}
      <div>
        <SectionHeader title="Financing" isOpen={sections.financing} onToggle={() => toggleSection('financing')} />
        {sections.financing && (
          <div className="mt-3 space-y-3">
            <SelectField
              label="Loan Type"
              options={LOAN_OPTIONS}
              value={financing.loanType}
              onChange={(e) => handleLoanTypeChange(e.target.value as LoanType)}
              hint="Selecting a loan type auto-fills rate, term, and down payment"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <FormField
                label="Down Payment"
                suffix="%"
                type="number"
                step="0.5"
                value={financing.downPayment || ''}
                onChange={(e) => {
                  const dp = num(e);
                  updateFinancing('downPayment', dp);
                  const price = isRE ? reData.purchasePrice : isHybrid ? hybridData.purchasePrice : bizData.askingPrice;
                  recalcLoanAmount(price, dp);
                }}
              />
              <FormField
                label="Interest Rate"
                suffix="%"
                type="number"
                step="0.125"
                value={financing.interestRate || ''}
                onChange={(e) => updateFinancing('interestRate', num(e))}
              />
              <FormField
                label="Loan Amount"
                prefix="$"
                type="number"
                value={financing.loanAmount || ''}
                onChange={(e) => updateFinancing('loanAmount', num(e))}
                hint="Auto-calculated from price & down payment"
              />
              <FormField
                label="Loan Term (years)"
                type="number"
                value={financing.loanTermYears || ''}
                onChange={(e) => updateFinancing('loanTermYears', num(e))}
              />
              <FormField
                label="Amortization (years)"
                type="number"
                value={financing.amortizationYears || ''}
                onChange={(e) => updateFinancing('amortizationYears', num(e))}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Notes & Tags ─────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this deal..."
          />
        </div>
        <FormField
          label="Tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="multi-family, value-add, syndication"
          hint="Comma-separated"
        />
      </div>

      {/* ─── Actions ──────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {existingDeal ? 'Update Deal' : 'Save Deal'}
        </button>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* BREAKDOWN DRAWERS                       */}
      {/* ═══════════════════════════════════════ */}

      {/* Payroll */}
      <BreakdownDrawer
        title="Payroll Breakdown"
        isOpen={openDrawer === 'payroll'}
        onClose={() => setOpenDrawer(null)}
        total={calcPayrollTotal(breakdowns.payroll ?? defaultPayrollBreakdown())}
        totalLabel="Total Annual Labor Cost"
      >
        <PayrollBreakdown
          data={breakdowns.payroll ?? defaultPayrollBreakdown()}
          onChange={handlePayrollChange}
        />
      </BreakdownDrawer>

      {/* Assets */}
      <BreakdownDrawer
        title="Asset & Depreciation Schedule"
        isOpen={openDrawer === 'assets'}
        onClose={() => setOpenDrawer(null)}
        total={calcTotalDepreciation(breakdowns.assets ?? [])}
        totalLabel="Total Annual Depreciation"
      >
        <AssetSchedule
          data={breakdowns.assets ?? []}
          onChange={handleAssetsChange}
        />
      </BreakdownDrawer>

      {/* Interest */}
      <BreakdownDrawer
        title="Interest / Debt Schedule"
        isOpen={openDrawer === 'interest'}
        onClose={() => setOpenDrawer(null)}
        total={calcTotalInterest(breakdowns.interestItems ?? [])}
        totalLabel="Total Annual Interest"
      >
        <InterestBreakdownComp
          data={breakdowns.interestItems ?? []}
          onChange={handleInterestChange}
        />
      </BreakdownDrawer>

      {/* Leases */}
      <BreakdownDrawer
        title="Lease Agreements"
        isOpen={openDrawer === 'leases'}
        onClose={() => setOpenDrawer(null)}
        total={calcTotalLeaseCost(breakdowns.leases ?? [])}
        totalLabel="Total Annual Lease Cost"
      >
        <LeaseBreakdownComp
          data={breakdowns.leases ?? []}
          onChange={handleLeasesChange}
        />
      </BreakdownDrawer>

      {/* Utilities */}
      <BreakdownDrawer
        title="Utility Cost Breakdown"
        isOpen={openDrawer === 'utilities'}
        onClose={() => setOpenDrawer(null)}
        total={calcTotalUtilities(breakdowns.utilities ?? [])}
        totalLabel="Total Annual Utilities"
      >
        <UtilityBreakdownComp
          data={breakdowns.utilities ?? []}
          onChange={handleUtilitiesChange}
        />
      </BreakdownDrawer>
    </form>
  );
}
