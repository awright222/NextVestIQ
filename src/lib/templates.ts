// ============================================
// Deal Templates — Pre-filled starter deals
// ============================================

import type { DealType, RealEstateDeal, BusinessDeal, HybridDeal, FinancingTerms } from '@/types';

export interface DealTemplate {
  id: string;
  name: string;
  description: string;
  dealType: DealType;
  icon: string; // emoji
  data: RealEstateDeal | BusinessDeal | HybridDeal;
  tags: string[];
}

// ─── Financing presets ───────────────────────

const conventionalFinancing: FinancingTerms = {
  loanType: 'conventional',
  loanAmount: 0, // will be auto-calculated
  downPayment: 20,
  interestRate: 7.25,
  loanTermYears: 30,
  amortizationYears: 30,
};

const sba7aFinancing: FinancingTerms = {
  loanType: 'sba-7a',
  loanAmount: 0,
  downPayment: 10,
  interestRate: 10.5,
  loanTermYears: 25,
  amortizationYears: 25,
};

// ─── Real Estate Templates ──────────────────

const singleFamilyRental: DealTemplate = {
  id: 'tpl-sfr',
  name: 'Single-Family Rental',
  description: 'A typical SFR buy-and-hold investment property.',
  dealType: 'real-estate',
  icon: '🏠',
  tags: ['SFR', 'buy-and-hold'],
  data: {
    type: 'real-estate',
    purchasePrice: 250_000,
    closingCosts: 5_000,
    rehabCosts: 10_000,
    grossRentalIncome: 24_000,
    otherIncome: 0,
    vacancyRate: 5,
    propertyTax: 3_000,
    insurance: 1_500,
    maintenance: 2_500,
    propertyManagement: 8,
    utilities: 0,
    otherExpenses: 500,
    financing: { ...conventionalFinancing, loanAmount: 200_000 },
    annualRentGrowth: 3,
    annualExpenseGrowth: 2,
    annualAppreciation: 3,
  },
};

const duplexRental: DealTemplate = {
  id: 'tpl-duplex',
  name: 'Duplex',
  description: 'A duplex with two rental units — a classic house-hack play.',
  dealType: 'real-estate',
  icon: '🏘️',
  tags: ['multi-family', 'house-hack'],
  data: {
    type: 'real-estate',
    purchasePrice: 350_000,
    closingCosts: 8_000,
    rehabCosts: 15_000,
    grossRentalIncome: 42_000,
    otherIncome: 600,
    vacancyRate: 5,
    propertyTax: 4_200,
    insurance: 2_400,
    maintenance: 3_500,
    propertyManagement: 10,
    utilities: 1_200,
    otherExpenses: 600,
    financing: { ...conventionalFinancing, loanAmount: 280_000 },
    annualRentGrowth: 3,
    annualExpenseGrowth: 2,
    annualAppreciation: 3,
  },
};

const smallApartment: DealTemplate = {
  id: 'tpl-apartment',
  name: 'Small Apartment (8-unit)',
  description: 'An 8-unit apartment building — commercial financing territory.',
  dealType: 'real-estate',
  icon: '🏢',
  tags: ['multi-family', 'apartment'],
  data: {
    type: 'real-estate',
    purchasePrice: 800_000,
    closingCosts: 20_000,
    rehabCosts: 30_000,
    grossRentalIncome: 115_200,
    otherIncome: 2_400,
    vacancyRate: 7,
    propertyTax: 10_000,
    insurance: 5_500,
    maintenance: 8_000,
    propertyManagement: 10,
    utilities: 4_800,
    otherExpenses: 1_500,
    financing: { ...conventionalFinancing, loanAmount: 640_000, interestRate: 7.5 },
    annualRentGrowth: 3,
    annualExpenseGrowth: 2,
    annualAppreciation: 3,
  },
};

// ─── Business Templates ─────────────────────

const restaurantBiz: DealTemplate = {
  id: 'tpl-restaurant',
  name: 'Restaurant',
  description: 'A full-service restaurant acquisition with typical margins.',
  dealType: 'business',
  icon: '🍽️',
  tags: ['food-service', 'restaurant'],
  data: {
    type: 'business',
    askingPrice: 400_000,
    closingCosts: 12_000,
    annualRevenue: 900_000,
    costOfGoods: 315_000,
    operatingExpenses: 360_000,
    ownerSalary: 80_000,
    depreciation: 15_000,
    amortization: 5_000,
    interest: 10_000,
    taxes: 25_000,
    otherAddBacks: 8_000,
    financing: { ...sba7aFinancing, loanAmount: 360_000 },
    annualRevenueGrowth: 3,
    annualExpenseGrowth: 2,
  },
};

const ecommerceBiz: DealTemplate = {
  id: 'tpl-ecommerce',
  name: 'E-Commerce Store',
  description: 'An online store with established revenue and low overhead.',
  dealType: 'business',
  icon: '🛒',
  tags: ['e-commerce', 'online'],
  data: {
    type: 'business',
    askingPrice: 250_000,
    closingCosts: 5_000,
    annualRevenue: 500_000,
    costOfGoods: 200_000,
    operatingExpenses: 100_000,
    ownerSalary: 60_000,
    depreciation: 5_000,
    amortization: 3_000,
    interest: 0,
    taxes: 15_000,
    otherAddBacks: 12_000,
    financing: { ...sba7aFinancing, loanAmount: 225_000 },
    annualRevenueGrowth: 8,
    annualExpenseGrowth: 3,
  },
};

const serviceCompany: DealTemplate = {
  id: 'tpl-service',
  name: 'Service Company (HVAC / Plumbing)',
  description: 'A home services business with recurring revenue and a crew.',
  dealType: 'business',
  icon: '🔧',
  tags: ['service', 'home-services'],
  data: {
    type: 'business',
    askingPrice: 600_000,
    closingCosts: 15_000,
    annualRevenue: 1_200_000,
    costOfGoods: 360_000,
    operatingExpenses: 480_000,
    ownerSalary: 120_000,
    depreciation: 25_000,
    amortization: 5_000,
    interest: 15_000,
    taxes: 40_000,
    otherAddBacks: 20_000,
    financing: { ...sba7aFinancing, loanAmount: 540_000 },
    annualRevenueGrowth: 5,
    annualExpenseGrowth: 3,
  },
};

// ─── Hybrid Templates ───────────────────────

const laundromatHybrid: DealTemplate = {
  id: 'tpl-laundromat',
  name: 'Laundromat',
  description: 'A coin-op laundromat where you own the building and the business.',
  dealType: 'hybrid',
  icon: '🧺',
  tags: ['laundromat', 'semi-absentee'],
  data: {
    type: 'hybrid',
    purchasePrice: 500_000,
    propertyValue: 300_000,
    businessValue: 200_000,
    closingCosts: 12_000,
    rehabCosts: 20_000,
    grossRentalIncome: 0,
    otherPropertyIncome: 0,
    vacancyRate: 0,
    propertyTax: 4_500,
    insurance: 3_000,
    maintenance: 5_000,
    propertyManagement: 0,
    utilities: 18_000,
    otherPropertyExpenses: 1_200,
    annualRevenue: 180_000,
    costOfGoods: 18_000,
    businessOperatingExpenses: 36_000,
    ownerSalary: 40_000,
    depreciation: 12_000,
    amortization: 3_000,
    interest: 8_000,
    taxes: 10_000,
    otherAddBacks: 5_000,
    financing: { ...sba7aFinancing, loanAmount: 450_000 },
    annualRevenueGrowth: 3,
    annualRentGrowth: 0,
    annualExpenseGrowth: 2,
    annualAppreciation: 3,
  },
};

const carWashHybrid: DealTemplate = {
  id: 'tpl-carwash',
  name: 'Car Wash',
  description: 'An express car wash with real estate — high-margin, semi-absentee.',
  dealType: 'hybrid',
  icon: '🚗',
  tags: ['car-wash', 'semi-absentee'],
  data: {
    type: 'hybrid',
    purchasePrice: 900_000,
    propertyValue: 500_000,
    businessValue: 400_000,
    closingCosts: 22_000,
    rehabCosts: 30_000,
    grossRentalIncome: 0,
    otherPropertyIncome: 0,
    vacancyRate: 0,
    propertyTax: 7_500,
    insurance: 5_000,
    maintenance: 8_000,
    propertyManagement: 0,
    utilities: 24_000,
    otherPropertyExpenses: 2_000,
    annualRevenue: 350_000,
    costOfGoods: 35_000,
    businessOperatingExpenses: 70_000,
    ownerSalary: 60_000,
    depreciation: 20_000,
    amortization: 5_000,
    interest: 15_000,
    taxes: 18_000,
    otherAddBacks: 10_000,
    financing: { ...sba7aFinancing, loanAmount: 810_000 },
    annualRevenueGrowth: 4,
    annualRentGrowth: 0,
    annualExpenseGrowth: 2,
    annualAppreciation: 3,
  },
};

// ─── Export ──────────────────────────────────

export const DEAL_TEMPLATES: DealTemplate[] = [
  singleFamilyRental,
  duplexRental,
  smallApartment,
  restaurantBiz,
  ecommerceBiz,
  serviceCompany,
  laundromatHybrid,
  carWashHybrid,
];

export function getTemplatesForType(dealType: DealType): DealTemplate[] {
  return DEAL_TEMPLATES.filter((t) => t.dealType === dealType);
}
