// ============================================
// PDF Export — Generate deal summary reports
// ============================================
// Uses jsPDF + autoTable to build a downloadable
// single-page report with deal info, metrics, and
// cash flow projections.

'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Deal, RealEstateDeal, BusinessDeal, HybridDeal } from '@/types';
import { calcRealEstateMetrics, projectCashFlows } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics, projectBusinessCashFlows } from '@/lib/calculations/business';
import { calcHybridMetrics, projectHybridCashFlows } from '@/lib/calculations/hybrid';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(2)}%`;

export function exportDealPDF(deal: Deal) {
  const doc = new jsPDF();
  const isRE = deal.dealType === 'real-estate';
  const isHybrid = deal.dealType === 'hybrid';
  const isBiz = deal.dealType === 'business';

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // ─── Title ─────────────────────────────────────────

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('NextVestIQ — Deal Report', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(14);
  doc.text(deal.name, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const typeLabel = isRE ? 'Real Estate' : isHybrid ? 'Hybrid (RE + Business)' : 'Business Acquisition';
  doc.text(typeLabel, pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 8;

  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // ─── Deal Overview ─────────────────────────────────

  const price = isRE
    ? (deal.data as RealEstateDeal).purchasePrice
    : isHybrid
    ? (deal.data as HybridDeal).purchasePrice
    : (deal.data as BusinessDeal).askingPrice;

  const overviewRows: string[][] = [
    ['Deal Name', deal.name],
    ['Type', typeLabel],
    [isRE || isHybrid ? 'Purchase Price' : 'Asking Price', fmt(price)],
    ['Created', new Date(deal.createdAt).toLocaleDateString()],
  ];

  if (deal.tags.length > 0) {
    overviewRows.push(['Tags', deal.tags.join(', ')]);
  }

  if (isHybrid) {
    const h = deal.data as HybridDeal;
    overviewRows.push(['Property Value', fmt(h.propertyValue)]);
    overviewRows.push(['Business Value', fmt(h.businessValue)]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Deal Overview', '']],
    body: overviewRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY ?? y + 40;
  y += 6;

  // ─── Key Metrics ───────────────────────────────────

  let metricsRows: string[][] = [];

  if (isRE) {
    const m = calcRealEstateMetrics(deal.data as RealEstateDeal);
    metricsRows = [
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
  } else if (isHybrid) {
    const m = calcHybridMetrics(deal.data as HybridDeal);
    metricsRows = [
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
    metricsRows = [
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

  autoTable(doc, {
    startY: y,
    head: [['Key Metrics', '']],
    body: metricsRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY ?? y + 60;
  y += 6;

  // ─── Cash Flow Projections ─────────────────────────

  const projections = isRE
    ? projectCashFlows(deal.data as RealEstateDeal, 10)
    : isHybrid
    ? projectHybridCashFlows(deal.data as HybridDeal, 10)
    : projectBusinessCashFlows(deal.data as BusinessDeal, 10);

  const cfHead = isRE || isHybrid
    ? ['Year', 'NOI', 'Cash Flow', 'Cumulative']
    : ['Year', 'Revenue', 'Cash Flow', 'Cumulative'];

  const cfRows = projections.map((p) => [
    `Year ${p.year}`,
    fmt('noi' in p ? p.noi : (p as { revenue: number }).revenue),
    fmt(p.cashFlow),
    fmt(p.cumulativeCashFlow),
  ]);

  // Check if we need a new page
  if (y > 220) {
    doc.addPage();
    y = 16;
  }

  autoTable(doc, {
    startY: y,
    head: [cfHead],
    body: cfRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, halign: 'right' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY ?? y + 80;
  y += 6;

  // ─── Notes ─────────────────────────────────────────

  if (deal.notes.trim()) {
    if (y > 240) {
      doc.addPage();
      y = 16;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(deal.notes, pageWidth - 28);
    doc.text(lines, 14, y);
  }

  // ─── Footer ────────────────────────────────────────

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `NextVestIQ Report • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // ─── Save ──────────────────────────────────────────

  const safeName = deal.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${safeName}_report.pdf`);
}
