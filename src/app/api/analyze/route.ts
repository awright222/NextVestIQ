// ============================================
// API Route: /api/analyze — AI-Enhanced Deal Analysis
// ============================================
// POST endpoint that accepts a Deal and returns narrative analysis.
// If OPENAI_API_KEY is set, uses GPT for richer narrative.
// Otherwise, falls back to the built-in rule engine.

import { NextRequest, NextResponse } from 'next/server';
import { analyzeDeal, type DealAnalysis } from '@/lib/analysis';
import type { Deal } from '@/types';

// ─── System prompt encoding the disciplined buyer framework ──

const SYSTEM_PROMPT = `You are a disciplined, no-BS investment analyst specializing in small business acquisitions and real estate investments. You give the kind of advice a seasoned buyer would — blunt, numbers-first, never cheerleading.

Your analysis MUST follow this exact structure, returning valid JSON:

{
  "verdict": "strong-buy" | "reasonable" | "caution" | "overpriced" | "walk-away",
  "verdictLabel": "Short label",
  "verdictSummary": "2-3 sentence bottom line",
  "sections": [
    {
      "title": "What Does the Business/Property Actually Produce?",
      "emoji": "📊",
      "content": "Assess the real earnings. For business: SDE with conservative normalization. For real estate: NOI. Question any add-backs or optimistic assumptions."
    },
    {
      "title": "What Do Rational Buyers Pay?",
      "emoji": "🧮",
      "content": "Appropriate multiples (SDE multiples for business, cap rates for RE). Explain WHY certain ranges apply based on deal characteristics (size, margins, risk factors). Calculate a value range."
    },
    {
      "title": "The Reasonable Price Range",
      "emoji": "💰",
      "content": "State the disciplined buying range. Anything above it means paying for projected growth or potential — that's the seller's upside, not the buyer's."
    },
    {
      "title": "Debt Test (Sleep-at-Night Rule)",
      "emoji": "🏦",
      "content": "Walk through: down payment → loan → annual debt service → what's left after debt and salary. Can the buyer sleep at night with this payment?"
    },
    {
      "title": "Risk Flags",
      "emoji": "🚩",
      "content": "Bullet list of specific risks: thin margins, concentration, lease dependency, seasonal, understated costs, optimistic projections. Be specific, not generic."
    },
    {
      "title": "My Straight Answer",
      "emoji": "🎯",
      "content": "Give a SPECIFIC price range. State what you'd do. No hedging. Examples:\n- 'I'd walk unless they come to $X–$Y'\n- 'This is a strong deal at $X. Close it.'\n- 'Offer $X, don't go above $Y'"
    }
  ]
}

Rules:
- Always use actual numbers from the deal data
- Format currency as $XXX,XXX
- Never say "it depends" without then giving a specific recommendation
- Don't pad the analysis — if it's a bad deal, say so directly
- Be specific about multiples and ranges
- For business deals: SDE is king. Revenue multiples are secondary.
- For real estate: NOI and cap rate drive everything.
- For hybrid: value the property and business separately, then combine.
- If breakdown schedules are provided (payroll, assets, leases, debt, utilities), incorporate their detail into your analysis — note staffing levels, lease expiration risks, depreciation impact, and debt structure.
- Use only the sections above — do not add extra sections.
- Return ONLY valid JSON, no markdown formatting.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const deal = body.deal as Deal;

    if (!deal || !deal.dealType || !deal.data) {
      return NextResponse.json({ error: 'Invalid deal data' }, { status: 400 });
    }

    // ── Try AI-enhanced analysis first ──────────────
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const analysis = await getAIAnalysis(deal, apiKey);
        if (analysis) {
          return NextResponse.json(analysis);
        }
      } catch (err) {
        console.error('AI analysis failed, falling back to rule engine:', err);
        // Fall through to rule engine
      }
    }

    // ── Fallback: built-in rule engine ──────────────
    const analysis = analyzeDeal(deal);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error('Analysis endpoint error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

// ─── OpenAI Integration ──────────────────────────────────

async function getAIAnalysis(deal: Deal, apiKey: string): Promise<DealAnalysis | null> {
  const dealSummary = buildDealSummary(deal);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this ${deal.dealType} deal:\n\n${dealSummary}` },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) return null;

  // Parse the JSON response
  const parsed = JSON.parse(content);
  return {
    verdict: parsed.verdict,
    verdictLabel: parsed.verdictLabel,
    verdictSummary: parsed.verdictSummary,
    sections: parsed.sections,
    generatedAt: new Date().toISOString(),
    mode: 'ai',
  };
}

function buildDealSummary(deal: Deal): string {
  const d = deal.data;
  const lines: string[] = [`Deal Name: ${deal.name}`, `Type: ${deal.dealType}`];

  if (deal.dealType === 'real-estate') {
    const re = d as import('@/types').RealEstateDeal;
    lines.push(
      `Purchase Price: $${re.purchasePrice.toLocaleString()}`,
      `Closing Costs: $${re.closingCosts.toLocaleString()}`,
      `Rehab Costs: $${re.rehabCosts.toLocaleString()}`,
      `Gross Rental Income: $${re.grossRentalIncome.toLocaleString()}/yr`,
      `Other Income: $${re.otherIncome.toLocaleString()}/yr`,
      `Vacancy Rate: ${re.vacancyRate}%`,
      `Property Tax: $${re.propertyTax.toLocaleString()}/yr`,
      `Insurance: $${re.insurance.toLocaleString()}/yr`,
      `Maintenance: $${re.maintenance.toLocaleString()}/yr`,
      `Property Management: ${re.propertyManagement}%`,
      `Utilities: $${re.utilities.toLocaleString()}/yr`,
      `Other Expenses: $${re.otherExpenses.toLocaleString()}/yr`,
      `Financing: ${re.financing.loanType} — $${re.financing.loanAmount.toLocaleString()} loan @ ${re.financing.interestRate}%, ${re.financing.loanTermYears}yr term, ${re.financing.downPayment}% down`,
      `Annual Rent Growth: ${re.annualRentGrowth}%`,
      `Annual Expense Growth: ${re.annualExpenseGrowth}%`,
      `Annual Appreciation: ${re.annualAppreciation}%`,
    );
  } else if (deal.dealType === 'business') {
    const biz = d as import('@/types').BusinessDeal;
    lines.push(
      `Asking Price: $${biz.askingPrice.toLocaleString()}`,
      `Closing Costs: $${biz.closingCosts.toLocaleString()}`,
      `Annual Revenue: $${biz.annualRevenue.toLocaleString()}`,
      `Cost of Goods: $${biz.costOfGoods.toLocaleString()}`,
      `Operating Expenses: $${biz.operatingExpenses.toLocaleString()}`,
      `Owner Salary: $${biz.ownerSalary.toLocaleString()}`,
      `Depreciation: $${biz.depreciation.toLocaleString()}`,
      `Amortization: $${biz.amortization.toLocaleString()}`,
      `Interest: $${biz.interest.toLocaleString()}`,
      `Taxes: $${biz.taxes.toLocaleString()}`,
      `Other Add-Backs: $${biz.otherAddBacks.toLocaleString()}`,
      `Financing: ${biz.financing.loanType} — $${biz.financing.loanAmount.toLocaleString()} loan @ ${biz.financing.interestRate}%, ${biz.financing.loanTermYears}yr term, ${biz.financing.downPayment}% down`,
      `Annual Revenue Growth: ${biz.annualRevenueGrowth}%`,
      `Annual Expense Growth: ${biz.annualExpenseGrowth}%`,
    );
  } else {
    const h = d as import('@/types').HybridDeal;
    lines.push(
      `Purchase Price: $${h.purchasePrice.toLocaleString()}`,
      `Property Value Allocation: $${h.propertyValue.toLocaleString()}`,
      `Business Value Allocation: $${h.businessValue.toLocaleString()}`,
      `Closing Costs: $${h.closingCosts.toLocaleString()}`,
      `Rehab Costs: $${h.rehabCosts.toLocaleString()}`,
      `--- Property ---`,
      `Gross Rental Income: $${h.grossRentalIncome.toLocaleString()}/yr`,
      `Other Property Income: $${h.otherPropertyIncome.toLocaleString()}/yr`,
      `Vacancy: ${h.vacancyRate}%`,
      `Property Tax: $${h.propertyTax.toLocaleString()}/yr`,
      `Insurance: $${h.insurance.toLocaleString()}/yr`,
      `Maintenance: $${h.maintenance.toLocaleString()}/yr`,
      `Property Management: ${h.propertyManagement}%`,
      `Utilities: $${h.utilities.toLocaleString()}/yr`,
      `Other Property Expenses: $${h.otherPropertyExpenses.toLocaleString()}/yr`,
      `--- Business ---`,
      `Annual Revenue: $${h.annualRevenue.toLocaleString()}`,
      `COGS: $${h.costOfGoods.toLocaleString()}`,
      `Business Operating Expenses: $${h.businessOperatingExpenses.toLocaleString()}`,
      `Owner Salary: $${h.ownerSalary.toLocaleString()}`,
      `Depreciation: $${h.depreciation.toLocaleString()}`,
      `Amortization: $${h.amortization.toLocaleString()}`,
      `Interest: $${h.interest.toLocaleString()}`,
      `Taxes: $${h.taxes.toLocaleString()}`,
      `Other Add-Backs: $${h.otherAddBacks.toLocaleString()}`,
      `Financing: ${h.financing.loanType} — $${h.financing.loanAmount.toLocaleString()} loan @ ${h.financing.interestRate}%, ${h.financing.loanTermYears}yr term, ${h.financing.downPayment}% down`,
    );
  }

  // ── Append breakdown detail if available ──
  if (deal.breakdowns) {
    const b = deal.breakdowns;

    if (b.payroll && b.payroll.employees.length > 0) {
      lines.push('', '--- Payroll Breakdown ---');
      lines.push(`Headcount: ${b.payroll.employees.reduce((s, e) => s + e.count, 0)}`);
      b.payroll.employees.forEach((e) => {
        const annual = e.wageType === 'salary' ? e.wageRate : e.wageRate * e.hoursPerWeek * e.weeksPerYear;
        lines.push(`  ${e.title}: ${e.count} × $${annual.toLocaleString()}/yr (${e.wageType})`);
      });
      lines.push(`Tax rates: FICA ${b.payroll.ficaRate}%, FUTA ${b.payroll.futaRate}%, SUI ${b.payroll.suiRate}%, WC ${b.payroll.wcRate}%`);
    }

    if (b.assets && b.assets.length > 0) {
      lines.push('', '--- Asset / Depreciation Schedule ---');
      b.assets.forEach((a) => {
        lines.push(`  ${a.name}: $${a.costBasis.toLocaleString()} cost, ${a.depreciationMethod}, ${a.usefulLifeYears}yr life, ${a.ownership}`);
      });
    }

    if (b.interestItems && b.interestItems.length > 0) {
      lines.push('', '--- Debt / Interest Schedule ---');
      b.interestItems.forEach((i) => {
        lines.push(`  ${i.lender} (${i.purpose}): $${i.currentBalance.toLocaleString()} bal @ ${i.interestRate}%, $${i.annualInterestPaid.toLocaleString()}/yr interest`);
      });
    }

    if (b.leases && b.leases.length > 0) {
      lines.push('', '--- Lease Agreements ---');
      b.leases.forEach((l) => {
        lines.push(`  ${l.location}: $${l.monthlyRent.toLocaleString()}/mo to ${l.landlord}, ${l.leaseStartDate}–${l.leaseEndDate}, ${l.annualEscalation}% escalation${l.tripleNet ? ', NNN' : ''}${l.camCharges ? `, CAM $${l.camCharges.toLocaleString()}/yr` : ''}`);
      });
    }

    if (b.utilities && b.utilities.length > 0) {
      lines.push('', '--- Utility Costs by Location ---');
      b.utilities.forEach((u) => {
        const monthly = u.electric + u.gas + u.water + u.trash + u.internet + u.other;
        lines.push(`  ${u.location}: $${monthly.toLocaleString()}/mo ($${(monthly * 12).toLocaleString()}/yr)`);
      });
    }
  }

  return lines.join('\n');
}
