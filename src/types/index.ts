// ============================================
// NextVestIQ — Core Type Definitions
// ============================================

/** Determines whether a deal is a real estate property, business acquisition, or hybrid */
export type DealType = 'real-estate' | 'business' | 'hybrid';

/** Supported loan program types for auto-populating financing defaults */
export type LoanType =
  | 'conventional'
  | 'sba-7a'
  | 'sba-504'
  | 'fha'
  | 'va'
  | 'hard-money'
  | 'custom';

// ─── Real Estate Deal ────────────────────────────────────────

export interface RealEstateDeal {
  type: 'real-estate';

  // Purchase
  purchasePrice: number;
  closingCosts: number;
  rehabCosts: number;

  // Income
  grossRentalIncome: number; // annual
  otherIncome: number;       // annual (laundry, parking, etc.)
  vacancyRate: number;       // percentage (e.g. 5 = 5%)

  // Operating Expenses
  propertyTax: number;
  insurance: number;
  maintenance: number;
  propertyManagement: number; // percentage of gross income
  utilities: number;
  otherExpenses: number;

  // Financing
  financing: FinancingTerms;

  // Growth Assumptions
  annualRentGrowth: number;      // percentage
  annualExpenseGrowth: number;   // percentage
  annualAppreciation: number;    // percentage
}

// ─── Business Deal ───────────────────────────────────────────

export interface BusinessDeal {
  type: 'business';

  // Purchase
  askingPrice: number;
  closingCosts: number;

  // Revenue
  annualRevenue: number;

  // Expenses
  costOfGoods: number;
  operatingExpenses: number;
  ownerSalary: number;   // included in SDE add-back
  depreciation: number;
  amortization: number;
  interest: number;
  taxes: number;
  otherAddBacks: number; // one-time or discretionary expenses

  // Financing
  financing: FinancingTerms;

  // Growth Assumptions
  annualRevenueGrowth: number;  // percentage
  annualExpenseGrowth: number;  // percentage
}

// ─── Hybrid Deal (Real Estate + Business) ────────────────────
// For deals where you buy both the property AND the business
// operating inside it (e.g. laundromat, car wash, restaurant).

export interface HybridDeal {
  type: 'hybrid';

  // ── Purchase / Allocation ──────────────
  purchasePrice: number;       // Total acquisition price
  propertyValue: number;       // Portion allocated to real estate
  businessValue: number;       // Portion allocated to business / goodwill
  closingCosts: number;
  rehabCosts: number;

  // ── Property Income ────────────────────
  grossRentalIncome: number;       // Rental income if part of building is separately rented
  otherPropertyIncome: number;     // Parking, storage, etc.
  vacancyRate: number;             // percentage for rental portion

  // ── Property Expenses ──────────────────
  propertyTax: number;
  insurance: number;
  maintenance: number;
  propertyManagement: number;  // percentage of property gross income
  utilities: number;
  otherPropertyExpenses: number;

  // ── Business Revenue & Expenses ────────
  annualRevenue: number;       // Business revenue
  costOfGoods: number;
  businessOperatingExpenses: number;
  ownerSalary: number;
  depreciation: number;
  amortization: number;
  interest: number;
  taxes: number;
  otherAddBacks: number;

  // ── Financing ──────────────────────────
  financing: FinancingTerms;

  // ── Growth Assumptions ─────────────────
  annualRevenueGrowth: number;  // business revenue growth %
  annualRentGrowth: number;     // rental income growth %
  annualExpenseGrowth: number;  // all expenses growth %
  annualAppreciation: number;   // property appreciation %
}

// ─── Shared Types ────────────────────────────────────────────

export interface FinancingTerms {
  loanType: LoanType;
  loanAmount: number;
  downPayment: number;     // percentage
  interestRate: number;    // percentage
  loanTermYears: number;
  amortizationYears: number;
}

/** A saved deal wrapping either deal type, with metadata */
export interface Deal {
  id: string;
  userId: string;
  name: string;
  dealType: DealType;
  data: RealEstateDeal | BusinessDeal | HybridDeal;
  scenarios: Scenario[];
  notes: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;  // ISO date
  updatedAt: string;  // ISO date
}

/** A what-if scenario: partial overrides on top of the base deal */
export interface Scenario {
  id: string;
  name: string;
  overrides: Partial<RealEstateDeal> | Partial<BusinessDeal> | Partial<HybridDeal>;
  createdAt: string;
}

// ─── Calculated Metrics ──────────────────────────────────────

export interface RealEstateMetrics {
  noi: number;
  capRate: number;
  cashOnCashReturn: number;
  roi: number;
  dscr: number;
  irr: number;
  monthlyMortgage: number;
  annualCashFlow: number;
  totalCashInvested: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
}

export interface BusinessMetrics {
  ebitda: number;
  sde: number;
  roi: number;
  annualCashFlow: number;
  breakEvenRevenue: number;
  monthlyDebtService: number;
  totalCashInvested: number;
  revenueMultiple: number;
  sdeMultiple: number;
}

/** Metrics for hybrid deals — combines property and business analysis */
export interface HybridMetrics {
  // Property metrics
  propertyNoi: number;
  capRate: number;         // based on property value allocation

  // Business metrics
  ebitda: number;
  sde: number;
  revenueMultiple: number;
  sdeMultiple: number;

  // Combined metrics
  totalNoi: number;        // property NOI + business net income
  annualCashFlow: number;
  cashOnCashReturn: number;
  roi: number;
  dscr: number;
  monthlyMortgage: number;
  totalCashInvested: number;
  breakEvenRevenue: number;
  effectiveGrossIncome: number;
  totalOperatingExpenses: number;
}

// ─── Lending Rates ───────────────────────────────────────────

export interface LendingRate {
  loanType: LoanType;
  label: string;
  interestRate: number;
  termYears: number;
  maxLtv: number;         // max loan-to-value percentage
  downPaymentMin: number; // minimum down payment percentage
  lastUpdated: string;    // ISO date
}

// ─── Alert / Investment Criteria ─────────────────────────────

export interface InvestmentCriteria {
  id: string;
  userId: string;
  name: string;
  dealType: DealType | 'any';
  conditions: CriteriaCondition[];
  isActive: boolean;
  createdAt: string;
}

export interface CriteriaCondition {
  metric: string;       // e.g. 'capRate', 'cashOnCashReturn', 'roi'
  operator: 'gte' | 'lte' | 'eq';
  value: number;
}

// ─── User Preferences ───────────────────────────────────────

export interface UserPreferences {
  defaultDealType: DealType;
  defaultLoanType: LoanType;
  dashboardLayout: 'grid' | 'list';
  theme: 'light' | 'dark' | 'system';
}
