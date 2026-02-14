// ============================================
// Deal Analysis Panel — AI + Rule-Based Feedback
// ============================================
// Renders narrative deal analysis with section-by-section
// breakdown. Fetches from /api/analyze (AI if available,
// rule engine fallback).

'use client';

import { useState, useCallback } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Cpu,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { Deal } from '@/types';
import type { DealAnalysis } from '@/lib/analysis';

interface Props {
  deal: Deal;
}

const verdictConfig: Record<
  DealAnalysis['verdict'],
  { color: string; bg: string; border: string; icon: React.ReactNode; ring: string }
> = {
  'strong-buy': {
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    border: 'border-emerald-200 dark:border-emerald-800',
    ring: 'ring-emerald-500/20',
    icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
  },
  reasonable: {
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    ring: 'ring-blue-500/20',
    icon: <ShieldCheck className="h-6 w-6 text-blue-500" />,
  },
  caution: {
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-amber-200 dark:border-amber-800',
    ring: 'ring-amber-500/20',
    icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
  },
  overpriced: {
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-200 dark:border-orange-800',
    ring: 'ring-orange-500/20',
    icon: <ShieldAlert className="h-6 w-6 text-orange-500" />,
  },
  'walk-away': {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    ring: 'ring-red-500/20',
    icon: <XCircle className="h-6 w-6 text-red-500" />,
  },
};

export default function DealAnalysisPanel({ deal }: Props) {
  const [analysis, setAnalysis] = useState<DealAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Analysis failed (${res.status})`);
      }

      const data: DealAnalysis = await res.json();
      setAnalysis(data);
      // Expand all sections by default
      setExpandedSections(new Set(data.sections.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [deal]);

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // ─── Initial state: show CTA button ─────────────

  if (!analysis && !loading && !error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Deal Analysis</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Get a disciplined, no-BS assessment of this deal — earnings evaluation,
              rational valuation range, debt service test, risk flags, and a straight answer.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" />
            Analyze This Deal
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Analyzing deal...</p>
          <p className="text-xs text-muted-foreground">Evaluating earnings, valuation, debt, and risk factors</p>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
        <div className="flex flex-col items-center gap-3 py-4">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={runAnalysis}
            className="mt-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Analysis results ──────────────────────────

  if (!analysis) return null;

  const vc = verdictConfig[analysis.verdict];

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-card-foreground">Deal Analysis</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground"
            title={analysis.mode === 'ai' ? 'AI-enhanced analysis' : 'Rule-based analysis'}
          >
            {analysis.mode === 'ai' ? (
              <>
                <Sparkles className="h-3 w-3" /> AI
              </>
            ) : (
              <>
                <Cpu className="h-3 w-3" /> Rule Engine
              </>
            )}
          </span>
          <button
            onClick={runAnalysis}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary"
          >
            Re-analyze
          </button>
        </div>
      </div>

      {/* Verdict Banner */}
      <div className={`mx-4 mt-4 rounded-lg border ${vc.border} ${vc.bg} p-4 ring-1 ${vc.ring}`}>
        <div className="flex items-start gap-3">
          {vc.icon}
          <div>
            <p className={`text-sm font-bold ${vc.color}`}>{analysis.verdictLabel}</p>
            <p className={`mt-1 text-sm ${vc.color} opacity-90`}>{analysis.verdictSummary}</p>
          </div>
        </div>
      </div>

      {/* Analysis Sections */}
      <div className="p-4">
        <div className="space-y-2">
          {analysis.sections.map((section, i) => {
            // Skip the "My Straight Answer" section since verdict banner covers it
            if (section.title === 'My Straight Answer') return null;

            const isExpanded = expandedSections.has(i);

            return (
              <div key={i} className="rounded-lg border border-border">
                <button
                  onClick={() => toggleSection(i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-secondary/50"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <span className="text-base">{section.emoji}</span>
                    {section.title}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {section.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          Analysis generated {new Date(analysis.generatedAt).toLocaleString()} ·{' '}
          {analysis.mode === 'ai'
            ? 'AI-enhanced analysis — verify key assumptions independently'
            : 'Rule-based analysis — add OPENAI_API_KEY for AI-enhanced narrative'}
        </p>
      </div>
    </div>
  );
}
