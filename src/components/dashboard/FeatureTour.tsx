"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

/* ── Tour step definition ───────────────────────────────────────────────── */
export interface TourStep {
    /** CSS selector or element ID to highlight */
    targetId: string;
    title: string;
    description: string;
    emoji: string;
    /** Which side to place the tooltip relative to the target */
    placement?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
    {
        targetId: "tour-recheck-btn",
        title: "Recheck Data Button",
        description:
            "This new amber button scans your selected date range for any missing TikTok shop data. If any day is missing, it automatically fetches and saves it right now.",
        emoji: "🛡️",
        placement: "bottom",
    },
    {
        targetId: "tour-recheck-btn",
        title: "How It Works",
        description:
            "Just select any date or range you're worried about, then click 'Recheck Data'. It checks each of the 4 TikTok shops — if data was missing, it shows '⚠ No' in the Was in DB column, then fixes it.",
        emoji: "🔍",
        placement: "bottom",
    },
    {
        targetId: "tour-date-picker",
        title: "Select the Date Range",
        description:
            "Use the date picker to choose which days to check. For example, select 'Yesterday' if you suspect data is missing for the previous day — then hit Recheck Data.",
        emoji: "📅",
        placement: "top",
    },
    {
        targetId: "tour-recheck-btn",
        title: "Reading the Log",
        description:
            "After rechecking, a log panel appears below this toolbar. It shows a row for every shop × date — green 'Synced' means data was missing and is now fixed, grey 'OK' means everything was already correct.",
        emoji: "📋",
        placement: "bottom",
    },
];

/* ── Spotlight overlay ──────────────────────────────────────────────────── */
function getElementRect(id: string): DOMRect | null {
    const el = document.getElementById(id);
    return el ? el.getBoundingClientRect() : null;
}

interface SpotlightProps {
    targetId: string;
    padding?: number;
}

function Spotlight({ targetId, padding = 8 }: SpotlightProps) {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const update = () => setRect(getElementRect(targetId));
        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, [targetId]);

    if (!rect) return null;

    const x = rect.left - padding;
    const y = rect.top - padding;
    const w = rect.width + padding * 2;
    const h = rect.height + padding * 2;
    const r = 10; // corner radius

    return (
        <svg
            className="fixed inset-0 w-full h-full pointer-events-none z-[60]"
            style={{ mixBlendMode: "normal" }}
        >
            <defs>
                <mask id="spotlight-mask">
                    {/* White = visible overlay; black cutout = transparent spotlight */}
                    <rect width="100%" height="100%" fill="white" />
                    <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
                </mask>
            </defs>
            {/* Dark overlay with spotlight cutout */}
            <rect
                width="100%"
                height="100%"
                fill="rgba(2, 6, 23, 0.80)"
                mask="url(#spotlight-mask)"
            />
            {/* Glowing border around the highlighted element */}
            <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={r}
                fill="none"
                stroke="rgba(245, 158, 11, 0.8)"
                strokeWidth="2"
                className="animate-pulse"
            />
            {/* Outer soft glow */}
            <rect
                x={x - 4}
                y={y - 4}
                width={w + 8}
                height={h + 8}
                rx={r + 4}
                fill="none"
                stroke="rgba(245, 158, 11, 0.25)"
                strokeWidth="6"
            />
        </svg>
    );
}

/* ── Tooltip card ──────────────────────────────────────────────────────── */
interface TooltipProps {
    step: TourStep;
    stepIndex: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
}

function TourTooltip({ step, stepIndex, totalSteps, onNext, onPrev, onClose }: TooltipProps) {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const update = () => setRect(getElementRect(step.targetId));
        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, [step.targetId]);

    // Compute tooltip position
    const TOOLTIP_WIDTH = 320;
    const TOOLTIP_GAP = 16;

    let style: React.CSSProperties = { position: "fixed", zIndex: 70, width: TOOLTIP_WIDTH };

    if (rect) {
        if (step.placement === "bottom" || !step.placement) {
            style.top = rect.bottom + TOOLTIP_GAP;
            style.left = Math.max(8, Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8));
        } else if (step.placement === "top") {
            style.bottom = window.innerHeight - rect.top + TOOLTIP_GAP;
            style.left = Math.max(8, Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8));
        } else if (step.placement === "right") {
            style.top = rect.top;
            style.left = rect.right + TOOLTIP_GAP;
        } else {
            style.top = rect.top;
            style.right = window.innerWidth - rect.left + TOOLTIP_GAP;
        }
    } else {
        // Fallback: center of screen
        style.top = "50%";
        style.left = "50%";
        style.transform = "translate(-50%, -50%)";
    }

    const isFirst = stepIndex === 0;
    const isLast = stepIndex === totalSteps - 1;

    return (
        <div
            style={style}
            className="rounded-2xl border border-amber-500/30 bg-slate-950/98 shadow-2xl shadow-black/60 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
            {/* Top strip */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{step.emoji}</span>
                    <div className="flex gap-1">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    i === stepIndex
                                        ? "w-5 bg-amber-400"
                                        : "w-1.5 bg-slate-700"
                                )}
                            />
                        ))}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded"
                    aria-label="Close tour"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-4 space-y-2">
                <h3 className="text-sm font-bold text-amber-300">{step.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-500 font-medium">
                    {stepIndex + 1} of {totalSteps}
                </span>
                <div className="flex items-center gap-2">
                    {!isFirst && (
                        <button
                            onClick={onPrev}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Back
                        </button>
                    )}
                    {isLast ? (
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-colors px-3 py-1.5 rounded-lg"
                        >
                            <Sparkles className="h-3 w-3" />
                            Got it!
                        </button>
                    ) : (
                        <button
                            onClick={onNext}
                            className="flex items-center gap-1 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-colors px-3 py-1.5 rounded-lg"
                        >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Tour trigger button (shown in toolbar after whats-new dismissal) ───── */
interface FeatureTourProps {
    /** Whether to auto-start the tour on mount (e.g. after first-time seeing this version) */
    autoStart?: boolean;
}

export function FeatureTour({ autoStart = false }: FeatureTourProps) {
    const [active, setActive] = useState(false);
    const [step, setStep] = useState(0);

    const TOUR_KEY = "him_dashboard_tour_v1.6.0";

    useEffect(() => {
        if (autoStart && !localStorage.getItem(TOUR_KEY)) {
            // Small delay so the page finishes rendering first
            const t = setTimeout(() => setActive(true), 800);
            return () => clearTimeout(t);
        }
    }, [autoStart]);

    const handleClose = useCallback(() => {
        setActive(false);
        setStep(0);
        localStorage.setItem(TOUR_KEY, "done");
    }, []);

    const handleNext = useCallback(() => {
        setStep((s) => Math.min(s + 1, TOUR_STEPS.length - 1));
    }, []);

    const handlePrev = useCallback(() => {
        setStep((s) => Math.max(s - 1, 0));
    }, []);

    const handleStart = useCallback(() => {
        setStep(0);
        setActive(true);
    }, []);

    return (
        <>
            {/* Inline trigger button */}
            <button
                id="tour-start-btn"
                onClick={handleStart}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-amber-600/30 bg-amber-500/8 hover:bg-amber-500/15 text-amber-400 hover:text-amber-300 transition-all duration-200 font-semibold text-[11px]"
                title="Take a quick tour of the new Recheck Data feature"
            >
                <ShieldCheck className="h-3.5 w-3.5" />
                How to use
            </button>

            {/* Tour overlay */}
            {active && (
                <>
                    {/* Click-outside to close */}
                    <div
                        className="fixed inset-0 z-[59] cursor-pointer"
                        onClick={handleClose}
                        aria-hidden="true"
                    />

                    {/* Spotlight cutout */}
                    <Spotlight targetId={TOUR_STEPS[step].targetId} />

                    {/* Tooltip */}
                    <TourTooltip
                        step={TOUR_STEPS[step]}
                        stepIndex={step}
                        totalSteps={TOUR_STEPS.length}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onClose={handleClose}
                    />
                </>
            )}
        </>
    );
}
