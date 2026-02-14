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
import { analyzeDeal, type DealAnalysis } from '@/lib/analysis';

// ─── Formatters ──────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(2)}%`;

const dateStr = () =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
  const verdictLines = doc.splitTextToSize(analysis.verdictSummary, pageWidth - 28);
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

  const flags = flagSection.content.split('\n').map((f) => f.replace(/^•\s*/, '').trim()).filter(Boolean);
  if (flags.length === 0) return y;

  const flagRows = flags.map((f) => ['⚠', f]);

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
    doc.text(`${section.emoji} ${section.title}`, 14, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    // Clean up markdown-style bold
    const cleanContent = section.content.replace(/\*\*/g, '');
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

  // Breakdown Schedules (new page, if breakdowns exist)
  renderBreakdowns(doc, deal.breakdowns);

  // Footer on all pages
  renderFooters(doc);

  // Save
  const safeName = deal.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${safeName}_report.pdf`);
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
