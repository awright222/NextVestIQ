// ============================================
// TourProvider — Guided onboarding walkthrough
// ============================================
// A lightweight, portal-based tooltip tour that
// highlights UI elements one at a time. Runs once
// per tour (localStorage), with a manual replay.

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

// ─── Tour Step Definition ────────────────────────────

export interface TourStep {
  /** CSS selector or data-tour value to highlight */
  target: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TourDef {
  id: string;
  steps: TourStep[];
}

// ─── Predefined Tours ────────────────────────────────

export const DASHBOARD_TOUR: TourDef = {
  id: 'dashboard-tour',
  steps: [
    {
      target: '[data-tour="new-deal"]',
      title: 'Create Your First Deal',
      body: 'Start by entering a property or business you\'re evaluating. You can also use a template to load sample data instantly.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="portfolio-tab"]',
      title: 'Portfolio Overview',
      body: 'Once you have multiple deals, switch here to see aggregate metrics — total equity, combined cash flow, weighted returns, and deal rankings.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="alerts-btn"]',
      title: 'Investment Alerts',
      body: 'Define your buy box (e.g. Cap Rate ≥ 8%, DSCR ≥ 1.25). Deals that match get flagged automatically on the dashboard.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="rates-btn"]',
      title: 'Current Lending Rates',
      body: 'Check live lending rates for SBA, conventional, and other loan types. These help you pick realistic financing assumptions.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tabs"]',
      title: 'Filter & Compare',
      body: 'Filter deals by type, search by name or tag, or select multiple deals to compare them side by side.',
      placement: 'bottom',
    },
  ],
};

export const DEAL_DETAIL_TOUR: TourDef = {
  id: 'deal-detail-tour',
  steps: [
    {
      target: '[data-tour="score-ring"]',
      title: 'Investment Score',
      body: 'A 0–100 composite score weighted across key metrics. 80+ is a Strong Buy, 65+ is a Good Deal. Risk flags deduct up to 25 points.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="metrics-grid"]',
      title: 'Key Metrics',
      body: 'All your underwriting numbers at a glance — NOI, Cap Rate, Cash-on-Cash, DSCR, IRR, and more. These update instantly when you edit the deal.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="sensitivity"]',
      title: 'Sensitivity Analysis',
      body: 'See how your returns change when you vary one input. Pick vacancy, interest rate, purchase price, or other variables and see ±4 steps around your base case.',
      placement: 'top',
    },
    {
      target: '[data-tour="analysis"]',
      title: 'Deal Analysis',
      body: 'Get a narrative evaluation — covers what the business produces, what buyers pay, a reasonable price range, the debt service test, and risk flags.',
      placement: 'top',
    },
    {
      target: '[data-tour="scenarios"]',
      title: 'What-If Scenarios',
      body: 'Create named scenarios to compare different assumptions. Adjust any variable and see the metric impact in real time.',
      placement: 'top',
    },
    {
      target: '[data-tour="export-pdf"]',
      title: 'Export Reports',
      body: 'Download a professional PDF report with executive summary, score breakdown, risk flags, projections, and analysis — or export as CSV.',
      placement: 'bottom',
    },
  ],
};

// ─── Context ─────────────────────────────────────────

interface TourContextValue {
  /** Start a tour by its definition */
  startTour: (tour: TourDef) => void;
  /** Whether a tour has been completed (by localStorage key) */
  isTourComplete: (tourId: string) => boolean;
  /** Replay a specific tour */
  replayTour: (tour: TourDef) => void;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  isTourComplete: () => true,
  replayTour: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

// ─── Provider ────────────────────────────────────────

export default function TourProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourDef | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const LS_PREFIX = 'dealforge-tour-';

  const isTourComplete = useCallback(
    (tourId: string) => {
      if (!mounted) return true;
      return localStorage.getItem(`${LS_PREFIX}${tourId}`) === 'done';
    },
    [mounted],
  );

  const completeTour = useCallback((tourId: string) => {
    localStorage.setItem(`${LS_PREFIX}${tourId}`, 'done');
  }, []);

  const startTour = useCallback(
    (tour: TourDef) => {
      if (isTourComplete(tour.id)) return;
      setActiveTour(tour);
      setStepIndex(0);
    },
    [isTourComplete],
  );

  const replayTour = useCallback((tour: TourDef) => {
    localStorage.removeItem(`${LS_PREFIX}${tour.id}`);
    setActiveTour(tour);
    setStepIndex(0);
  }, []);

  const closeTour = useCallback(() => {
    if (activeTour) completeTour(activeTour.id);
    setActiveTour(null);
    setStepIndex(0);
    setTargetRect(null);
  }, [activeTour, completeTour]);

  const goNext = useCallback(() => {
    if (!activeTour) return;
    if (stepIndex < activeTour.steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      closeTour();
    }
  }, [activeTour, stepIndex, closeTour]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Measure target element position
  useEffect(() => {
    if (!activeTour) return;
    const step = activeTour.steps[stepIndex];
    if (!step) return;

    const measure = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        setTargetRect(null);
      }
    };

    // Small delay to let DOM settle after tab switches
    const timer = setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [activeTour, stepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!activeTour) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTour();
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTour, closeTour, goNext, goBack]);

  // Calculate tooltip position
  function getTooltipStyle(): React.CSSProperties {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const step = activeTour?.steps[stepIndex];
    const rawPlacement = step?.placement || 'bottom';
    // On narrow screens, force left/right placements to bottom
    const placement = typeof window !== 'undefined' && window.innerWidth < 480
      ? (rawPlacement === 'left' || rawPlacement === 'right' ? 'bottom' : rawPlacement)
      : rawPlacement;
    const pad = 12;
    const tooltipWidth = typeof window !== 'undefined' ? Math.min(340, window.innerWidth - 16) : 340;

    const cx = targetRect.left + targetRect.width / 2;
    const style: React.CSSProperties = { position: 'fixed', zIndex: 60, width: tooltipWidth };

    switch (placement) {
      case 'bottom':
        style.top = targetRect.bottom + pad;
        style.left = Math.max(8, Math.min(cx - tooltipWidth / 2, window.innerWidth - tooltipWidth - 8));
        break;
      case 'top':
        style.bottom = window.innerHeight - targetRect.top + pad;
        style.left = Math.max(8, Math.min(cx - tooltipWidth / 2, window.innerWidth - tooltipWidth - 8));
        break;
      case 'left':
        style.top = targetRect.top + targetRect.height / 2 - 60;
        style.right = window.innerWidth - targetRect.left + pad;
        break;
      case 'right':
        style.top = targetRect.top + targetRect.height / 2 - 60;
        style.left = targetRect.right + pad;
        break;
    }

    return style;
  }

  const step = activeTour?.steps[stepIndex];
  const isLast = activeTour ? stepIndex === activeTour.steps.length - 1 : false;
  const isFirst = stepIndex === 0;

  return (
    <TourContext.Provider value={{ startTour, isTourComplete, replayTour }}>
      {children}

      {/* Tour overlay */}
      {activeTour && step && mounted &&
        createPortal(
          <>
            {/* Backdrop with cutout */}
            <div className="fixed inset-0 z-50">
              {/* Semi-transparent overlay */}
              <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
                <defs>
                  <mask id="tour-mask">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    {targetRect && (
                      <rect
                        x={targetRect.left - 6}
                        y={targetRect.top - 6}
                        width={targetRect.width + 12}
                        height={targetRect.height + 12}
                        rx="8"
                        fill="black"
                      />
                    )}
                  </mask>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="rgba(0,0,0,0.5)"
                  mask="url(#tour-mask)"
                  style={{ pointerEvents: 'auto' }}
                  onClick={closeTour}
                />
              </svg>

              {/* Highlight ring around target */}
              {targetRect && (
                <div
                  className="pointer-events-none absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
                  style={{
                    top: targetRect.top - 6,
                    left: targetRect.left - 6,
                    width: targetRect.width + 12,
                    height: targetRect.height + 12,
                    zIndex: 51,
                  }}
                />
              )}

              {/* Tooltip */}
              <div
                ref={tooltipRef}
                style={getTooltipStyle()}
                className="rounded-xl border border-border bg-card p-4 shadow-2xl"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <button
                    onClick={closeTour}
                    className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {stepIndex + 1} of {activeTour.steps.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {!isFirst && (
                      <button
                        onClick={goBack}
                        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        Back
                      </button>
                    )}
                    <button
                      onClick={goNext}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      {isLast ? 'Done' : 'Next'}
                      {!isLast && <ChevronRight className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </TourContext.Provider>
  );
}

// ─── Replay Button Component ─────────────────────────

export function ReplayTourButton({ tour, className }: { tour: TourDef; className?: string }) {
  const { replayTour } = useTour();

  return (
    <button
      onClick={() => replayTour(tour)}
      className={`flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground ${className || ''}`}
      title="Replay guided tour"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Tour
    </button>
  );
}
