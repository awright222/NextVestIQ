// ============================================
// PDF & CSV Export — Professional Deal Reports
// ============================================
// Uses jsPDF + autoTable to build downloadable reports
// with executive summary, metrics, projections,
// risk flags, scenario analysis, breakdown schedules,
// and analysis narrative.

'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  Deal,
  RealEstateDeal,
  BusinessDeal,
  HybridDeal,
  DealBreakdowns,
} from '@/types';
import { calcRealEstateMetrics, projectCashFlows } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics, projectBusinessCashFlows } from '@/lib/calculations/business';
import { calcHybridMetrics, projectHybridCashFlows } from '@/lib/calculations/hybrid';
import { calcInvestmentScore, type InvestmentScore } from '@/lib/calculations/score';
import { summarizeByYear, amortizationTotals, generateAmortizationSchedule } from '@/lib/calculations/amortization';
import { runSensitivity, getVariablesForDealType } from '@/lib/calculations/sensitivity';
import { applyRecessionOverrides } from '@/lib/calculations/recession';
import { analyzeDeal, type DealAnalysis } from '@/lib/analysis';

// ─── Formatters ──────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(2)}%`;

const dateStr = () =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

/** Strip emoji and other non-Latin-1 symbols that jsPDF's Helvetica can't render */
const stripEmoji = (text: string) =>
  text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2B50}\u{2B55}\u{231A}-\u{23FA}\u{2934}-\u{2935}\u{25AA}-\u{25FE}\u{2602}-\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}\u{200B}]/gu, '').replace(/\s{2,}/g, ' ').trim();

// ─── Color Palette ───────────────────────────────────

const BLUE = [30, 64, 175] as const;
const DARK = [15, 23, 42] as const;
const GRAY = [100, 116, 139] as const;
const GREEN = [22, 163, 74] as const;
const RED = [220, 38, 38] as const;
const AMBER = [217, 119, 6] as const;

function verdictColor(v: string): readonly [number, number, number] {
  switch (v) {
    case 'strong-buy': return GREEN;
    case 'reasonable': return BLUE;
    case 'caution': return AMBER;
    case 'overpriced':
    case 'walk-away': return RED;
    default: return GRAY;
  }
}

function scoreColor(total: number): readonly [number, number, number] {
  if (total >= 80) return GREEN;
  if (total >= 65) return BLUE;
  if (total >= 50) return AMBER;
  return RED;
}

// ─── Helpers ─────────────────────────────────────────

function getDealTypeLabel(deal: Deal): string {
  switch (deal.dealType) {
    case 'real-estate': return 'Real Estate';
    case 'hybrid': return 'Hybrid (RE + Business)';
    case 'business': return 'Business Acquisition';
  }
}

function getPrice(deal: Deal): number {
  if (deal.dealType === 'real-estate') return (deal.data as RealEstateDeal).purchasePrice;
  if (deal.dealType === 'hybrid') return (deal.data as HybridDeal).purchasePrice;
  return (deal.data as BusinessDeal).askingPrice;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    return 16;
  }
  return y;
}

function getLastTableY(doc: jsPDF, fallback: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable?.finalY ?? fallback;
}

// ─── Metrics Calculation ─────────────────────────────

function getMetricsRows(deal: Deal): string[][] {
  if (deal.dealType === 'real-estate') {
    const m = calcRealEstateMetrics(deal.data as RealEstateDeal);
    return [
      ['Net Operating Income', fmt(m.noi)],
      ['Cap Rate', pct(m.capRate)],
      ['Cash-on-Cash Return', pct(m.cashOnCashReturn)],
      ['ROI (5-Year)', pct(m.roi)],
      ['IRR', pct(m.irr)],
      ['DSCR', m.dscr === Infinity ? '∞' : m.dscr.toFixed(2)],
      ['Monthly Mortgage', fmt(m.monthlyMortgage)],
      ['Annual Cash Flow', fmt(m.annualCashFlow)],
      ['Total Cash Invested', fmt(m.totalCashInvested)],
      ['Effective Gross Income', fmt(m.effectiveGrossIncome)],
      ['Operating Expenses', fmt(m.operatingExpenses)],
    ];
  } else if (deal.dealType === 'hybrid') {
    const m = calcHybridMetrics(deal.data as HybridDeal);
    return [
      ['Property NOI', fmt(m.propertyNoi)],
      ['Cap Rate', pct(m.capRate)],
      ['Business EBITDA', fmt(m.ebitda)],
      ['SDE', fmt(m.sde)],
      ['Revenue Multiple', `${m.revenueMultiple.toFixed(2)}x`],
      ['SDE Multiple', `${m.sdeMultiple.toFixed(2)}x`],
      ['Total NOI', fmt(m.totalNoi)],
      ['Cash-on-Cash Return', pct(m.cashOnCashReturn)],
      ['ROI (5-Year)', pct(m.roi)],
      ['DSCR', m.dscr === Infinity ? '∞' : m.dscr.toFixed(2)],
      ['Monthly Mortgage', fmt(m.monthlyMortgage)],
      ['Annual Cash Flow', fmt(m.annualCashFlow)],
      ['Total Cash Invested', fmt(m.totalCashInvested)],
    ];
  } else {
    const m = calcBusinessMetrics(deal.data as BusinessDeal);
    return [
      ['EBITDA', fmt(m.ebitda)],
      ['SDE', fmt(m.sde)],
      ['ROI', pct(m.roi)],
      ['Annual Cash Flow', fmt(m.annualCashFlow)],
      ['Break-Even Revenue', fmt(m.breakEvenRevenue)],
      ['Revenue Multiple', `${m.revenueMultiple.toFixed(2)}x`],
      ['SDE Multiple', `${m.sdeMultiple.toFixed(2)}x`],
      ['Monthly Debt Service', fmt(m.monthlyDebtService)],
      ['Total Cash Invested', fmt(m.totalCashInvested)],
    ];
  }
}

// ═══════════════════════════════════════════════════════
// Page 1: Executive Summary
// ═══════════════════════════════════════════════════════

function renderExecutiveSummary(doc: jsPDF, deal: Deal, score: InvestmentScore, analysis: DealAnalysis): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('DealForge — Investment Report', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Deal name & type
  doc.setFontSize(16);
  doc.text(deal.name, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`${getDealTypeLabel(deal)} • Generated ${dateStr()}`, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setTextColor(0);

  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // ─── Executive Summary Box ─────────────────────────

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Executive Summary', 14, y);
  y += 7;

  // Score box (left)
  const boxY = y;
  const boxH = 32;
  const sc = scoreColor(score.total);
  doc.setFillColor(...sc);
  doc.roundedRect(14, boxY, 50, boxH, 3, 3, 'F');
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`${score.total}`, 39, boxY + 15, { align: 'center' });
  doc.setFontSize(9);
  doc.text(score.label, 39, boxY + 22, { align: 'center' });

  // Verdict box
  const vc = verdictColor(analysis.verdict);
  doc.setFillColor(...vc);
  doc.roundedRect(70, boxY, 55, boxH, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(analysis.verdictLabel, 97.5, boxY + 14, { align: 'center' });
  doc.setFontSize(8);
  doc.text('VERDICT', 97.5, boxY + 22, { align: 'center' });

  // Key stats (right side)
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const rightX = 134;
  const price = getPrice(deal);

  doc.setFont('helvetica', 'bold');
  doc.text(fmt(price), rightX, boxY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(deal.dealType === 'business' ? 'Asking Price' : 'Purchase Price', rightX, boxY + 13);

  const metricsRows = getMetricsRows(deal);
  const cashFlow = metricsRows.find((r) => r[0] === 'Annual Cash Flow');
  if (cashFlow) {
    doc.setTextColor(...DARK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(cashFlow[1], rightX + 40, boxY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Annual Cash Flow', rightX + 40, boxY + 13);
  }

  y = boxY + boxH + 8;
  doc.setTextColor(0);

  // Verdict narrative
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const verdictLines = doc.splitTextToSize(stripEmoji(analysis.verdictSummary), pageWidth - 28);
  doc.text(verdictLines, 14, y);
  y += verdictLines.length * 4.5 + 6;

  // ─── Score Breakdown Table ─────────────────────────

  y = ensureSpace(doc, y, 50);
  const scoreRows = score.breakdown.map((c) => [
    c.name,
    `${Math.round(c.score)}`,
    `${(c.weight * 100).toFixed(0)}%`,
    `${c.weighted.toFixed(1)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Component', 'Score', 'Weight', 'Weighted']],
    body: scoreRows,
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  y = getLastTableY(doc, y + 40) + 6;

  // ─── Deal Overview ─────────────────────────────────

  y = ensureSpace(doc, y, 50);

  const overviewRows: string[][] = [
    ['Deal Name', deal.name],
    ['Type', getDealTypeLabel(deal)],
    [deal.dealType === 'business' ? 'Asking Price' : 'Purchase Price', fmt(price)],
    ['Created', new Date(deal.createdAt).toLocaleDateString()],
  ];

  if (deal.tags.length > 0) overviewRows.push(['Tags', deal.tags.join(', ')]);

  if (deal.dealType === 'hybrid') {
    const h = deal.data as HybridDeal;
    overviewRows.push(['Property Value', fmt(h.propertyValue)]);
    overviewRows.push(['Business Value', fmt(h.businessValue)]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Deal Overview', '']],
    body: overviewRows,
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  });

  y = getLastTableY(doc, y + 40) + 6;

  return y;
}

// ═══════════════════════════════════════════════════════
// Key Metrics
// ═══════════════════════════════════════════════════════

function renderMetrics(doc: jsPDF, deal: Deal, y: number): number {
  y = ensureSpace(doc, y, 60);

  autoTable(doc, {
    startY: y,
    head: [['Key Metrics', '']],
    body: getMetricsRows(deal),
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  });

  return getLastTableY(doc, y + 60) + 6;
}

// ═══════════════════════════════════════════════════════
// Cash Flow Projections
// ═══════════════════════════════════════════════════════

function renderCashFlowProjections(doc: jsPDF, deal: Deal, y: number): number {
  y = ensureSpace(doc, y, 80);

  const projections = deal.dealType === 'real-estate'
    ? projectCashFlows(deal.data as RealEstateDeal, 10)
    : deal.dealType === 'hybrid'
    ? projectHybridCashFlows(deal.data as HybridDeal, 10)
    : projectBusinessCashFlows(deal.data as BusinessDeal, 10);

  const cfHead = deal.dealType === 'business'
    ? ['Year', 'Revenue', 'Cash Flow', 'Cumulative']
    : ['Year', 'NOI', 'Cash Flow', 'Cumulative'];

  const cfRows = projections.map((p) => [
    `Year ${p.year}`,
    fmt('noi' in p ? p.noi : (p as { revenue: number }).revenue),
    fmt(p.cashFlow),
    fmt(p.cumulativeCashFlow),
  ]);

  autoTable(doc, {
    startY: y,
    head: [cfHead],
    body: cfRows,
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, halign: 'right' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
  });

  return getLastTableY(doc, y + 80) + 6;
}

// ═══════════════════════════════════════════════════════
// Risk Flags
// ═══════════════════════════════════════════════════════

function renderRiskFlags(doc: jsPDF, analysis: DealAnalysis, y: number): number {
  const flagSection = analysis.sections.find((s) => s.title === 'Risk Flags');
  if (!flagSection) return y;

  const pageWidth = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 40);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Risk Flags', 14, y);
  y += 6;

  const flags = flagSection.content.split('\n').map((f) => stripEmoji(f.replace(/^•\s*/, '').trim())).filter(Boolean);
  if (flags.length === 0) return y;

  const flagRows = flags.map((f) => ['!', f]);

  autoTable(doc, {
    startY: y,
    body: flagRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: [...RED] },
      1: { cellWidth: pageWidth - 38 },
    },
    margin: { left: 14, right: 14 },
  });

  return getLastTableY(doc, y + 30) + 6;
}

// ═══════════════════════════════════════════════════════
// Analysis Narrative (Rule Engine or AI)
// ═══════════════════════════════════════════════════════

function renderAnalysisNarrative(doc: jsPDF, analysis: DealAnalysis): number {
  // Skip Risk Flags and verdict (already in exec summary)
  const sections = analysis.sections.filter(
    (s) => s.title !== 'Risk Flags' && s.title !== 'My Straight Answer'
  );

  if (sections.length === 0) return 16;

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.addPage();
  let y = 16;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Deal Analysis Narrative', 14, y);
  y += 3;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`Analysis mode: ${analysis.mode === 'ai' ? 'AI-Enhanced' : 'Rule Engine'}`, 14, y);
  doc.setTextColor(0);
  y += 6;

  for (const section of sections) {
    y = ensureSpace(doc, y, 30);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(section.title, 14, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    // Clean up markdown-style bold
    const cleanContent = stripEmoji(section.content.replace(/\*\*/g, ''));
    const lines = doc.splitTextToSize(cleanContent, pageWidth - 28);

    const lineHeight = 3.8;
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 16;
      }
      doc.text(line, 14, y);
      y += lineHeight;
    }

    y += 4;
  }

  return y;
}

// ═══════════════════════════════════════════════════════
// Scenario Comparison
// ═══════════════════════════════════════════════════════

function renderScenarios(doc: jsPDF, deal: Deal): number {
  if (deal.scenarios.length === 0) return 16;

  doc.addPage();
  let y = 16;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Scenario Analysis', 14, y);
  y += 8;

  // Build comparison table
  const head = ['Metric', 'Base Case'];
  for (const s of deal.scenarios) {
    head.push(s.name || 'Scenario');
  }

  // Calculate metrics for each scenario
  const baseMetrics = getMetricsRows(deal);

  const scenarioMetrics: string[][][] = deal.scenarios.map((scenario) => {
    const merged = {
      ...deal,
      data: { ...deal.data, ...scenario.overrides },
    } as Deal;
    return getMetricsRows(merged);
  });

  const body = baseMetrics.map((row, i) => {
    const result = [row[0], row[1]];
    for (const sm of scenarioMetrics) {
      result.push(sm[i]?.[1] ?? '—');
    }
    return result;
  });

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    margin: { left: 14, right: 14 },
  });

  y = getLastTableY(doc, y + 60) + 6;

  // Scenario details
  y = ensureSpace(doc, y, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Scenario Overrides', 14, y);
  y += 5;

  for (const scenario of deal.scenarios) {
    y = ensureSpace(doc, y, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`• ${scenario.name || 'Unnamed Scenario'}`, 14, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    const overrideEntries = Object.entries(scenario.overrides).filter(([, v]) => v !== undefined);
    if (overrideEntries.length > 0) {
      const overrideText = overrideEntries
        .map(([k, v]) => {
          const isPercent = k.includes('Rate') || k.includes('Growth') || k.includes('Appreciation') || k.includes('Vacancy') || k.includes('vacancy');
          return `${k}: ${typeof v === 'number' ? (isPercent ? pct(v) : fmt(v)) : String(v)}`;
        })
        .join(', ');
      const lines = doc.splitTextToSize(overrideText, doc.internal.pageSize.getWidth() - 38);
      doc.text(lines, 20, y);
      y += lines.length * 3.8 + 3;
    }
  }

  return y;
}

// ═══════════════════════════════════════════════════════
// Breakdown Schedules
// ═══════════════════════════════════════════════════════

function renderBreakdowns(doc: jsPDF, breakdowns: DealBreakdowns | undefined): number {
  if (!breakdowns) return 16;

  const hasContent = breakdowns.payroll?.employees.length ||
    breakdowns.assets?.length ||
    breakdowns.interestItems?.length ||
    breakdowns.leases?.length ||
    breakdowns.utilities?.length;

  if (!hasContent) return 16;

  doc.addPage();
  let y = 16;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Detail Schedules', 14, y);
  y += 8;

  // ─── Payroll ─────────────────────────────────────

  if (breakdowns.payroll && breakdowns.payroll.employees.length > 0) {
    const payroll = breakdowns.payroll;

    const payrollRows = payroll.employees.map((e) => {
      const annualWages = e.wageType === 'hourly'
        ? e.wageRate * e.hoursPerWeek * e.weeksPerYear * e.count
        : e.wageRate * e.count;
      return [
        e.title,
        String(e.count),
        e.wageType === 'hourly' ? `$${e.wageRate.toFixed(2)}/hr` : fmt(e.wageRate),
        fmt(annualWages),
      ];
    });

    const totalWages = payroll.employees.reduce((s, e) => {
      return s + (e.wageType === 'hourly'
        ? e.wageRate * e.hoursPerWeek * e.weeksPerYear * e.count
        : e.wageRate * e.count);
    }, 0);

    const taxRate = (payroll.ficaRate + payroll.futaRate + payroll.suiRate + payroll.wcRate) / 100;

    payrollRows.push(['', '', 'Subtotal Wages', fmt(totalWages)]);
    payrollRows.push(['', '', `Employer Taxes (${pct(taxRate * 100)})`, fmt(totalWages * taxRate)]);
    payrollRows.push(['', '', 'Total Labor Cost', fmt(Math.round(totalWages * (1 + taxRate)))]);

    autoTable(doc, {
      startY: y,
      head: [['Payroll Schedule', 'Count', 'Rate', 'Annual']],
      body: payrollRows,
      theme: 'striped',
      headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        3: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    y = getLastTableY(doc, y + 40) + 8;
  }

  // ─── Assets ──────────────────────────────────────

  if (breakdowns.assets && breakdowns.assets.length > 0) {
    y = ensureSpace(doc, y, 40);

    const assetRows = breakdowns.assets.map((a) => {
      const life = a.depreciationMethod === 'straight-line' ? a.usefulLifeYears
        : a.depreciationMethod === 'macrs-5' ? 5
        : a.depreciationMethod === 'macrs-7' ? 7
        : a.depreciationMethod === 'macrs-15' ? 15 : 39;
      const annualDep = a.ownership === 'owned' && a.costBasis > a.salvageValue
        ? Math.round((a.costBasis - a.salvageValue) / life)
        : 0;
      return [
        a.name,
        a.ownership,
        fmt(a.costBasis),
        a.depreciationMethod,
        fmt(annualDep),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Asset Schedule', 'Status', 'Cost Basis', 'Method', 'Annual Dep.']],
      body: assetRows,
      theme: 'striped',
      headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        2: { halign: 'right' },
        4: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    y = getLastTableY(doc, y + 40) + 8;
  }

  // ─── Interest / Debt ─────────────────────────────

  if (breakdowns.interestItems && breakdowns.interestItems.length > 0) {
    y = ensureSpace(doc, y, 40);

    const interestRows = breakdowns.interestItems.map((item) => [
      item.lender,
      item.purpose || '—',
      fmt(item.currentBalance),
      pct(item.interestRate),
      fmt(item.annualInterestPaid),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Debt Schedule', 'Purpose', 'Balance', 'Rate', 'Annual Interest']],
      body: interestRows,
      theme: 'striped',
      headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        2: { halign: 'right' },
        4: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    y = getLastTableY(doc, y + 40) + 8;
  }

  // ─── Leases ──────────────────────────────────────

  if (breakdowns.leases && breakdowns.leases.length > 0) {
    y = ensureSpace(doc, y, 40);

    const leaseRows = breakdowns.leases.map((l) => [
      l.location,
      l.landlord || '—',
      fmt(l.monthlyRent),
      l.tripleNet ? 'NNN' : 'Gross',
      l.leaseEndDate ? new Date(l.leaseEndDate).toLocaleDateString() : '—',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Lease Schedule', 'Landlord', 'Monthly Rent', 'Type', 'Expires']],
      body: leaseRows,
      theme: 'striped',
      headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        2: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    y = getLastTableY(doc, y + 40) + 8;
  }

  // ─── Utilities ───────────────────────────────────

  if (breakdowns.utilities && breakdowns.utilities.length > 0) {
    y = ensureSpace(doc, y, 40);

    const utilRows = breakdowns.utilities.map((u) => {
      const monthly = u.electric + u.gas + u.water + u.trash + u.internet + u.other;
      return [
        u.location,
        fmt(u.electric),
        fmt(u.gas),
        fmt(u.water),
        fmt(monthly),
        fmt(monthly * 12),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Utility Schedule', 'Electric', 'Gas', 'Water', 'Total/Mo', 'Annual']],
      body: utilRows,
      theme: 'striped',
      headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    y = getLastTableY(doc, y + 40) + 8;
  }

  return y;
}

// ═══════════════════════════════════════════════════════
// Notes
// ═══════════════════════════════════════════════════════

function renderNotes(doc: jsPDF, deal: Deal, y: number): number {
  if (!deal.notes.trim()) return y;

  const pageWidth = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 30);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Notes', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0);
  const lines = doc.splitTextToSize(deal.notes, pageWidth - 28);
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 16;
    }
    doc.text(line, 14, y);
    y += 3.8;
  }

  return y + 4;
}

// ═══════════════════════════════════════════════════════
// Footer
// ═══════════════════════════════════════════════════════

function renderFooters(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `DealForge Report • ${dateStr()} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
}

// ═══════════════════════════════════════════════════════
// Main PDF Export
// ═══════════════════════════════════════════════════════

export function exportDealPDF(deal: Deal) {
  const doc = new jsPDF();
  const score = calcInvestmentScore(deal);
  const analysis = analyzeDeal(deal);

  // Page 1: Executive Summary + Score + Overview
  let y = renderExecutiveSummary(doc, deal, score, analysis);

  // Key Metrics table
  y = renderMetrics(doc, deal, y);

  // Cash Flow Projections
  y = renderCashFlowProjections(doc, deal, y);

  // Risk Flags
  y = renderRiskFlags(doc, analysis, y);

  // Notes
  renderNotes(doc, deal, y);

  // Analysis Narrative (new page)
  renderAnalysisNarrative(doc, analysis);

  // Scenario Comparison (new page, if scenarios exist)
  renderScenarios(doc, deal);

  // Amortization Schedule (new page)
  renderAmortization(doc, deal);

  // Breakdown Schedules (new page, if breakdowns exist)
  renderBreakdowns(doc, deal.breakdowns);

  // Footer on all pages
  renderFooters(doc);

  // Save
  const safeName = deal.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${safeName}_report.pdf`);
}

// ═══════════════════════════════════════════════════════
// Amortization Schedule
// ═══════════════════════════════════════════════════════

function renderAmortization(doc: jsPDF, deal: Deal): void {
  const financing = deal.data.financing;
  if (!financing || financing.loanAmount <= 0) return;

  const schedule = generateAmortizationSchedule(financing);
  if (schedule.length === 0) return;

  const annualRows = summarizeByYear(schedule);
  const totals = amortizationTotals(schedule);

  doc.addPage();
  let y = 16;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Amortization Schedule', 14, y);
  y += 6;

  // Loan summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(
    `Loan: ${fmt(financing.loanAmount)} | Rate: ${pct(financing.interestRate)} | Term: ${financing.loanTermYears} yrs | Amort: ${financing.amortizationYears} yrs | Monthly: ${fmt(schedule[0].payment)}`,
    14, y
  );
  y += 4;
  doc.text(
    `Total Payments: ${fmt(totals.totalPayments)} | Total Interest: ${fmt(totals.totalInterest)} | Interest/Total: ${((totals.totalInterest / totals.totalPayments) * 100).toFixed(1)}%`,
    14, y
  );
  y += 6;

  doc.setTextColor(0);

  // Annual table (show up to 30 years, then note truncation)
  const displayRows = annualRows.slice(0, 30);
  const amortBody = displayRows.map((r) => [
    `Year ${r.year}`,
    fmt(r.totalPayment),
    fmt(r.totalPrincipal),
    fmt(r.totalInterest),
    fmt(r.endingBalance),
    `${r.principalPercent.toFixed(0)}%`,
  ]);

  // Totals row
  amortBody.push([
    'Total',
    fmt(totals.totalPayments),
    fmt(totals.totalPrincipal),
    fmt(totals.totalInterest),
    '$0',
    '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Period', 'Payment', 'Principal', 'Interest', 'Balance', 'P/I Split']],
    body: amortBody,
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, halign: 'right' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  if (annualRows.length > 30) {
    const tableY = getLastTableY(doc, y + 60);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`(${annualRows.length - 30} additional years not shown)`, 14, tableY + 4);
  }
}

// ═══════════════════════════════════════════════════════
// Multi-Deal Comparison PDF Export
// ═══════════════════════════════════════════════════════

export function exportComparisonPDF(deals: Deal[]) {
  if (deals.length < 2) return;

  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('DealForge — Deal Comparison', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`${deals.length} deals compared • ${dateStr()}`, pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setTextColor(0);

  // Overview table
  const overviewHead = ['', ...deals.map((d) => d.name)];
  const overviewBody: string[][] = [
    ['Type', ...deals.map((d) => getDealTypeLabel(d))],
    ['Price', ...deals.map((d) => fmt(getPrice(d)))],
    ['Score', ...deals.map((d) => {
      const s = calcInvestmentScore(d);
      return `${s.total} (${s.label})`;
    })],
  ];

  autoTable(doc, {
    startY: y,
    head: [overviewHead],
    body: overviewBody,
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } },
    margin: { left: 14, right: 14 },
  });

  y = getLastTableY(doc, y + 40) + 8;

  // Metrics comparison
  const allMetrics = deals.map((d) => getMetricsRows(d));

  // Find all unique metric labels across all deal types
  const allLabels: string[] = [];
  for (const m of allMetrics) {
    for (const [label] of m) {
      if (!allLabels.includes(label)) allLabels.push(label);
    }
  }

  const metricsHead = ['Metric', ...deals.map((d) => d.name)];
  const metricsBody = allLabels.map((label) => {
    const row = [label];
    for (const m of allMetrics) {
      const found = m.find(([l]) => l === label);
      row.push(found ? found[1] : '—');
    }
    return row;
  });

  y = ensureSpace(doc, y, 60);

  autoTable(doc, {
    startY: y,
    head: [metricsHead],
    body: metricsBody,
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    margin: { left: 14, right: 14 },
  });

  y = getLastTableY(doc, y + 80) + 8;

  // Cash flow comparison (10 years)
  y = ensureSpace(doc, y, 80);

  const cfHead = ['Year', ...deals.map((d) => `${d.name} CF`)];
  const projections = deals.map((d) =>
    d.dealType === 'real-estate'
      ? projectCashFlows(d.data as RealEstateDeal, 10)
      : d.dealType === 'hybrid'
      ? projectHybridCashFlows(d.data as HybridDeal, 10)
      : projectBusinessCashFlows(d.data as BusinessDeal, 10)
  );

  const cfBody: string[][] = [];
  for (let yr = 0; yr < 10; yr++) {
    const row = [`Year ${yr + 1}`];
    for (const proj of projections) {
      row.push(proj[yr] ? fmt(proj[yr].cashFlow) : '—');
    }
    cfBody.push(row);
  }

  autoTable(doc, {
    startY: y,
    head: [cfHead],
    body: cfBody,
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, halign: 'right' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  // Score breakdown per deal
  doc.addPage();
  y = 16;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Score Breakdown', 14, y);
  y += 8;

  for (const deal of deals) {
    y = ensureSpace(doc, y, 50);

    const score = calcInvestmentScore(deal);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const sc = scoreColor(score.total);
    doc.text(`${deal.name}`, 14, y);
    doc.setTextColor(...sc);
    doc.text(`  ${score.total} — ${score.label}`, 14 + doc.getTextWidth(deal.name), y);
    y += 5;

    const scoreRows = score.breakdown.map((c) => [
      c.name,
      `${Math.round(c.score)}`,
      `${(c.weight * 100).toFixed(0)}%`,
      `${c.weighted.toFixed(1)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Component', 'Score', 'Weight', 'Weighted']],
      body: scoreRows,
      theme: 'striped',
      headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });

    y = getLastTableY(doc, y + 40) + 8;
  }

  // Footers
  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `DealForge Comparison Report • ${dateStr()} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  doc.save(`DealForge_Comparison_${deals.length}_deals.pdf`);
}

// ═══════════════════════════════════════════════════════
// Lender Packet Export
// ═══════════════════════════════════════════════════════

function renderLenderCover(doc: jsPDF, deal: Deal): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 30;

  // Large centered title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Loan Request Package', pageWidth / 2, y, { align: 'center' });
  y += 14;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text(deal.name, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`${getDealTypeLabel(deal)} Investment`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Prepared ${dateStr()}`, pageWidth / 2, y, { align: 'center' });
  y += 3;

  doc.setDrawColor(200);
  doc.line(40, y, pageWidth - 40, y);
  y += 10;

  doc.setTextColor(0);

  // Loan request summary box
  const financing = deal.data.financing;
  const price = getPrice(deal);
  const loanAmt = financing.loanAmount;
  const downPmt = price - loanAmt;
  const ltv = price > 0 ? (loanAmt / price) * 100 : 0;

  const summaryRows: string[][] = [
    ['Property / Business', deal.name],
    ['Deal Type', getDealTypeLabel(deal)],
    [deal.dealType === 'business' ? 'Asking Price' : 'Purchase Price', fmt(price)],
    ['Loan Amount Requested', fmt(loanAmt)],
    ['Down Payment / Equity', `${fmt(downPmt)} (${pct(100 - ltv)})`],
    ['Loan-to-Value (LTV)', pct(ltv)],
    ['Loan Program', financing.loanType.replace(/-/g, ' ').toUpperCase()],
    ['Interest Rate', pct(financing.interestRate)],
    ['Loan Term', `${financing.loanTermYears} years`],
    ['Amortization', `${financing.amortizationYears} years`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Loan Request Summary', '']],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: [...DARK], fontStyle: 'bold', fontSize: 11 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 } },
    margin: { left: 30, right: 30 },
  });

  y = getLastTableY(doc, y + 80) + 10;

  // Table of contents
  y = ensureSpace(doc, y, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Contents', 30, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  const contents = [
    '1. Sources & Uses of Funds',
    '2. Key Investment Metrics',
    '3. Debt Service Coverage Analysis',
    '4. Cash Flow Projections (10-Year)',
    '5. Sensitivity Analysis',
    '6. Amortization Schedule',
    '7. Risk Assessment',
    '8. Recession Stress Test',
  ];
  for (const item of contents) {
    doc.text(item, 34, y);
    y += 5;
  }

  return y;
}

function renderSourcesAndUses(doc: jsPDF, deal: Deal): number {
  doc.addPage();
  let y = 16;

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('1. Sources & Uses of Funds', 14, y);
  y += 8;

  const price = getPrice(deal);
  const financing = deal.data.financing;
  const closingCosts = deal.data.closingCosts;
  const rehabCosts = deal.dealType !== 'business' ? (deal.data as RealEstateDeal | HybridDeal).rehabCosts : 0;
  const totalUses = price + closingCosts + rehabCosts;
  const equity = totalUses - financing.loanAmount;

  // Uses table
  const usesRows: string[][] = [
    [deal.dealType === 'business' ? 'Acquisition Price' : 'Purchase Price', fmt(price), `${((price / totalUses) * 100).toFixed(1)}%`],
    ['Closing Costs', fmt(closingCosts), `${((closingCosts / totalUses) * 100).toFixed(1)}%`],
  ];
  if (rehabCosts > 0) {
    usesRows.push(['Renovation / Rehab', fmt(rehabCosts), `${((rehabCosts / totalUses) * 100).toFixed(1)}%`]);
  }
  usesRows.push(['Total Uses', fmt(totalUses), '100.0%']);

  autoTable(doc, {
    startY: y,
    head: [['Uses of Funds', 'Amount', '% of Total']],
    body: usesRows,
    theme: 'striped',
    headStyles: { fillColor: [...DARK], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right' },
      2: { halign: 'center' },
    },
    margin: { left: 14, right: pageWidth / 2 + 5 },
    tableWidth: pageWidth / 2 - 19,
  });

  const usesEndY = getLastTableY(doc, y + 30);

  // Sources table (right side)
  const sourcesRows: string[][] = [
    ['Loan Proceeds', fmt(financing.loanAmount), `${((financing.loanAmount / totalUses) * 100).toFixed(1)}%`],
    ['Borrower Equity', fmt(equity), `${((equity / totalUses) * 100).toFixed(1)}%`],
    ['Total Sources', fmt(totalUses), '100.0%'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Sources of Funds', 'Amount', '% of Total']],
    body: sourcesRows,
    theme: 'striped',
    headStyles: { fillColor: [...BLUE], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right' },
      2: { halign: 'center' },
    },
    margin: { left: pageWidth / 2 + 5, right: 14 },
    tableWidth: pageWidth / 2 - 19,
  });

  y = Math.max(usesEndY, getLastTableY(doc, y + 30)) + 10;
  return y;
}

function renderDSCRAnalysis(doc: jsPDF, deal: Deal, y: number): number {
  y = ensureSpace(doc, y, 80);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('3. Debt Service Coverage Analysis', 14, y);
  y += 8;

  // Get metrics and calculate DSCR components
  const financing = deal.data.financing;
  let noi = 0;
  let dscr = 0;
  let annualDebtService = 0;
  let annualCashFlow = 0;

  if (deal.dealType === 'real-estate') {
    const m = calcRealEstateMetrics(deal.data as RealEstateDeal);
    noi = m.noi;
    dscr = m.dscr;
    annualDebtService = m.monthlyMortgage * 12;
    annualCashFlow = m.annualCashFlow;
  } else if (deal.dealType === 'hybrid') {
    const m = calcHybridMetrics(deal.data as HybridDeal);
    noi = m.totalNoi;
    dscr = m.dscr;
    annualDebtService = m.monthlyMortgage * 12;
    annualCashFlow = m.annualCashFlow;
  } else {
    const m = calcBusinessMetrics(deal.data as BusinessDeal);
    noi = m.sde; // Use SDE for business deals
    dscr = m.sde / (m.monthlyDebtService * 12 || 1);
    annualDebtService = m.monthlyDebtService * 12;
    annualCashFlow = m.annualCashFlow;
  }

  // DSCR status
  const dscrStatus = dscr >= 1.25 ? 'PASS — Meets typical lender minimum (1.25x)'
    : dscr >= 1.0 ? 'MARGINAL — Below typical 1.25x threshold'
    : 'FAIL — Insufficient coverage';
  const dscrColor: readonly [number, number, number] = dscr >= 1.25 ? GREEN : dscr >= 1.0 ? AMBER : RED;

  const dscrRows: string[][] = [
    [deal.dealType === 'business' ? 'Seller Discretionary Earnings (SDE)' : 'Net Operating Income (NOI)', fmt(noi)],
    ['Annual Debt Service', fmt(annualDebtService)],
    ['Debt Service Coverage Ratio', dscr === Infinity ? 'No Debt' : `${dscr.toFixed(2)}x`],
    ['Annual Cash Flow After Debt', fmt(annualCashFlow)],
    ['DSCR Assessment', dscrStatus],
  ];

  autoTable(doc, {
    startY: y,
    head: [['DSCR Component', 'Value']],
    body: dscrRows,
    theme: 'striped',
    headStyles: { fillColor: [...DARK], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 4 && data.column.index === 1) {
        data.cell.styles.textColor = [...dscrColor];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 2 && data.column.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 11;
      }
    },
  });

  y = getLastTableY(doc, y + 40) + 8;

  // Breakeven analysis
  y = ensureSpace(doc, y, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Breakeven Analysis', 14, y);
  y += 6;

  const monthlyDebt = financing.loanAmount > 0 ? annualDebtService / 12 : 0;
  const monthlyNOI = noi / 12;
  const occupancyBreakeven = monthlyDebt > 0 && deal.dealType !== 'business'
    ? Math.min(100, (monthlyDebt / (monthlyNOI / (1 - (deal.data as RealEstateDeal).vacancyRate / 100))) * 100)
    : 0;

  const beRows: string[][] = [
    ['Monthly Debt Service', fmt(monthlyDebt)],
    ['Monthly NOI / SDE', fmt(monthlyNOI)],
    ['Coverage Cushion (Monthly)', fmt(monthlyNOI - monthlyDebt)],
  ];
  if (deal.dealType !== 'business') {
    beRows.push(['Breakeven Occupancy', pct(occupancyBreakeven)]);
  }

  autoTable(doc, {
    startY: y,
    body: beRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  return getLastTableY(doc, y + 30) + 6;
}

function renderLenderSensitivity(doc: jsPDF, deal: Deal): void {
  doc.addPage();
  let y = 16;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('5. Sensitivity Analysis', 14, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Shows how key outputs change when a single input variable is adjusted.', 14, y);
  y += 6;
  doc.setTextColor(0);

  // Run sensitivity on 2-3 key variables relevant to lenders
  const vars = getVariablesForDealType(deal.dealType);
  const lenderVars = vars.filter((v) =>
    v.key.includes('interestRate') || v.key.includes('vacancy') || v.key.includes('Vacancy') ||
    v.key === 'purchasePrice' || v.key === 'askingPrice' || v.key === 'annualRevenue' ||
    v.key === 'grossRentalIncome'
  ).slice(0, 3);

  for (const variable of lenderVars) {
    y = ensureSpace(doc, y, 50);

    const result = runSensitivity(deal, variable.key, 3);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(`Varying: ${variable.label}`, 14, y);
    y += 5;

    // Show Cash Flow and DSCR columns (most important to lenders)
    const outputKeys = result.outputMetrics
      .filter((m) => m.key === 'cashFlow' || m.key === 'dscr' || m.key === 'cashOnCash' || m.key === 'capRate')
      .slice(0, 4);

    const head = [variable.label, ...outputKeys.map((m) => m.label)];
    const body = result.rows.map((row) => {
      const cells = [row.inputLabel];
      for (const om of outputKeys) {
        const val = row.metrics[om.key];
        if (om.format === 'currency') cells.push(fmt(val));
        else if (om.format === 'percent') cells.push(pct(val));
        else cells.push(val === Infinity ? '--' : val.toFixed(2) + 'x');
      }
      return cells;
    });

    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      theme: 'striped',
      headStyles: { fillColor: [...DARK], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, halign: 'right' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        // Highlight base-case row
        if (data.section === 'body' && result.rows[data.row.index]?.isBase) {
          data.cell.styles.fillColor = [219, 234, 254]; // light blue
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    y = getLastTableY(doc, y + 30) + 8;
  }
}

function renderRecessionStress(doc: jsPDF, deal: Deal): void {
  doc.addPage();
  let y = 16;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('8. Recession Stress Test', 14, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Applies recession-scenario assumptions to test downside performance.', 14, y);
  y += 6;
  doc.setTextColor(0);

  // Calculate base and stressed metrics
  const stressedData = applyRecessionOverrides(deal.data, deal.dealType);
  const stressedDeal: Deal = { ...deal, data: stressedData };

  const baseMetrics = getMetricsRows(deal);
  const stressedMetrics = getMetricsRows(stressedDeal);

  const baseScore = calcInvestmentScore(deal);
  const stressedScore = calcInvestmentScore(stressedDeal);

  // Score comparison
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Investment Score Comparison', 14, y);
  y += 5;

  const scoreCompRows: string[][] = [
    ['Base Case Score', `${baseScore.total} — ${baseScore.label}`],
    ['Stressed Score', `${stressedScore.total} — ${stressedScore.label}`],
    ['Score Impact', `${stressedScore.total - baseScore.total} points`],
  ];

  autoTable(doc, {
    startY: y,
    body: scoreCompRows,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 1 && data.column.index === 1) {
        data.cell.styles.textColor = stressedScore.total >= 65 ? [...GREEN] : stressedScore.total >= 50 ? [...AMBER] : [...RED];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = getLastTableY(doc, y + 30) + 8;

  // Side-by-side metrics comparison
  const compHead = ['Metric', 'Base Case', 'Recession', 'Delta'];
  const compBody: string[][] = [];
  for (let i = 0; i < baseMetrics.length; i++) {
    const label = baseMetrics[i][0];
    const baseVal = baseMetrics[i][1];
    const stressVal = stressedMetrics[i]?.[1] ?? '—';
    compBody.push([label, baseVal, stressVal, baseVal === stressVal ? '--' : 'Changed']);
  }

  autoTable(doc, {
    startY: y,
    head: [compHead],
    body: compBody,
    theme: 'striped',
    headStyles: { fillColor: [...DARK], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3 && data.cell.text[0] === 'Changed') {
        data.cell.styles.textColor = [...RED];
        data.cell.styles.fontStyle = 'italic';
      }
    },
  });

  y = getLastTableY(doc, y + 50) + 8;

  // Recession assumptions
  y = ensureSpace(doc, y, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Stress Assumptions Applied', 14, y);
  y += 5;

  const assumptions = [
    'Vacancy rate increased by +7 percentage points',
    'Revenue / rental income reduced by -10%',
    'Interest rate increased by +1.5 percentage points',
    'Expense growth increased by +1 percentage point',
    'Appreciation and rent/revenue growth reduced by ~50%',
  ];

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  for (const a of assumptions) {
    doc.text(`  -  ${a}`, 14, y);
    y += 4.5;
  }
}

export function exportLenderPacket(deal: Deal) {
  const doc = new jsPDF();
  const score = calcInvestmentScore(deal);
  const analysis = analyzeDeal(deal);

  // Page 1: Cover / Loan Request Summary
  renderLenderCover(doc, deal);

  // Page 2: Sources & Uses
  let y = renderSourcesAndUses(doc, deal);

  // Key Metrics (same page after S&U)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  y = ensureSpace(doc, y, 60);
  doc.text('2. Key Investment Metrics', 14, y);
  y += 2;
  y = renderMetrics(doc, deal, y);

  // DSCR Analysis
  y = renderDSCRAnalysis(doc, deal, y);

  // Cash Flow Projections
  doc.addPage();
  let cfY = 16;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('4. Cash Flow Projections (10-Year)', 14, cfY);
  cfY += 8;
  renderCashFlowProjections(doc, deal, cfY);

  // Sensitivity Analysis (new page)
  renderLenderSensitivity(doc, deal);

  // Amortization Schedule (new page)
  renderAmortization(doc, deal);

  // Risk Assessment (new page)
  renderAnalysisNarrative(doc, analysis);

  // Recession Stress Test (new page)
  renderRecessionStress(doc, deal);

  // Footer on all pages
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${deal.name} — Lender Packet • ${dateStr()} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    // Confidentiality notice
    doc.setFontSize(6);
    doc.text(
      'CONFIDENTIAL — Prepared for lending evaluation purposes only',
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const safeName = deal.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${safeName}_Lender_Packet.pdf`);
}

// ═══════════════════════════════════════════════════════
// CSV Export
// ═══════════════════════════════════════════════════════

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportDealCSV(deal: Deal) {
  const score = calcInvestmentScore(deal);
  const typeLabel = getDealTypeLabel(deal);
  const price = getPrice(deal);
  const metricsRows = getMetricsRows(deal);

  const projections = deal.dealType === 'real-estate'
    ? projectCashFlows(deal.data as RealEstateDeal, 10)
    : deal.dealType === 'hybrid'
    ? projectHybridCashFlows(deal.data as HybridDeal, 10)
    : projectBusinessCashFlows(deal.data as BusinessDeal, 10);

  const lines: string[] = [];

  // Header
  lines.push('DealForge — Deal Export');
  lines.push(`Generated,${dateStr()}`);
  lines.push('');

  // Overview
  lines.push('Deal Overview');
  lines.push(`Name,${escapeCsv(deal.name)}`);
  lines.push(`Type,${typeLabel}`);
  lines.push(`Price,${price}`);
  lines.push(`Investment Score,${score.total},${score.label}`);
  lines.push(`Tags,${escapeCsv(deal.tags.join('; '))}`);
  lines.push('');

  // Metrics
  lines.push('Key Metrics');
  lines.push('Metric,Value');
  for (const [label, value] of metricsRows) {
    lines.push(`${escapeCsv(label)},${escapeCsv(value)}`);
  }
  lines.push('');

  // Score breakdown
  lines.push('Score Breakdown');
  lines.push('Component,Score,Weight,Weighted');
  for (const c of score.breakdown) {
    lines.push(`${escapeCsv(c.name)},${Math.round(c.score)},${(c.weight * 100).toFixed(0)}%,${c.weighted.toFixed(1)}`);
  }
  lines.push('');

  // Cash flow projections
  lines.push('Cash Flow Projections');
  const cfHeader = deal.dealType === 'business'
    ? 'Year,Revenue,Cash Flow,Cumulative'
    : 'Year,NOI,Cash Flow,Cumulative';
  lines.push(cfHeader);
  for (const p of projections) {
    const income = 'noi' in p ? p.noi : (p as { revenue: number }).revenue;
    lines.push(`${p.year},${Math.round(income)},${Math.round(p.cashFlow)},${Math.round(p.cumulativeCashFlow)}`);
  }
  lines.push('');

  // Scenarios
  if (deal.scenarios.length > 0) {
    lines.push('Scenarios');
    lines.push('Name,Overrides');
    for (const s of deal.scenarios) {
      const overrides = Object.entries(s.overrides)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      lines.push(`${escapeCsv(s.name)},${escapeCsv(overrides)}`);
    }
    lines.push('');
  }

  // Breakdowns
  if (deal.breakdowns?.payroll?.employees.length) {
    lines.push('Payroll');
    lines.push('Title,Count,Rate,Type,Annual Wages');
    for (const e of deal.breakdowns.payroll.employees) {
      const annual = e.wageType === 'hourly'
        ? e.wageRate * e.hoursPerWeek * e.weeksPerYear * e.count
        : e.wageRate * e.count;
      lines.push(`${escapeCsv(e.title)},${e.count},${e.wageRate},${e.wageType},${Math.round(annual)}`);
    }
    lines.push('');
  }

  if (deal.breakdowns?.assets?.length) {
    lines.push('Assets');
    lines.push('Name,Status,Cost Basis,Method,Useful Life');
    for (const a of deal.breakdowns.assets) {
      lines.push(`${escapeCsv(a.name)},${a.ownership},${a.costBasis},${a.depreciationMethod},${a.usefulLifeYears}`);
    }
    lines.push('');
  }

  if (deal.breakdowns?.leases?.length) {
    lines.push('Leases');
    lines.push('Location,Landlord,Monthly Rent,Type,Expires');
    for (const l of deal.breakdowns.leases) {
      lines.push(`${escapeCsv(l.location)},${escapeCsv(l.landlord)},${l.monthlyRent},${l.tripleNet ? 'NNN' : 'Gross'},${l.leaseEndDate || ''}`);
    }
    lines.push('');
  }

  // Amortization
  if (deal.data.financing && deal.data.financing.loanAmount > 0) {
    const amortRows = summarizeByYear(generateAmortizationSchedule(deal.data.financing));
    if (amortRows.length > 0) {
      lines.push('Amortization Schedule (Annual)');
      lines.push('Year,Payment,Principal,Interest,Balance,Principal %');
      for (const r of amortRows) {
        lines.push(`${r.year},${Math.round(r.totalPayment)},${Math.round(r.totalPrincipal)},${Math.round(r.totalInterest)},${Math.round(r.endingBalance)},${r.principalPercent.toFixed(1)}%`);
      }
      lines.push('');
    }
  }

  // Notes
  if (deal.notes.trim()) {
    lines.push('Notes');
    lines.push(escapeCsv(deal.notes));
  }

  // Download
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = deal.name.replace(/[^a-zA-Z0-9]/g, '_');
  link.download = `${safeName}_export.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
