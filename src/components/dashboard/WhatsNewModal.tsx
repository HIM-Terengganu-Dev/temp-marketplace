"use client";

import { useState } from "react";
import { X, Sparkles, Wrench, Zap, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHANGELOG, APP_VERSION, ChangeType, ChangelogEntry } from "@/lib/changelog";

/* ── Badge config per change type ──────────────────────────────────────── */
const TYPE_CONFIG: Record<ChangeType, { label: string; icon: React.ReactNode; style: string }> = {
    new: {
        label: "New",
        icon: <Sparkles className="h-3 w-3" />,
        style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    fix: {
        label: "Fix",
        icon: <Wrench className="h-3 w-3" />,
        style: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    },
    improve: {
        label: "Better",
        icon: <Zap className="h-3 w-3" />,
        style: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    },
    remove: {
        label: "Removed",
        icon: <Trash2 className="h-3 w-3" />,
        style: "bg-red-500/15 text-red-400 border-red-500/30",
    },
};

/* ── Single version card ────────────────────────────────────────────────── */
function VersionCard({ entry, isLatest, defaultOpen }: { entry: ChangelogEntry; isLatest: boolean; defaultOpen: boolean }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={cn(
            "rounded-xl border transition-all duration-200",
            isLatest
                ? "border-primary/30 bg-primary/5"
                : "border-border/50 bg-muted/30"
        )}>
            {/* Header */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-start justify-between gap-3 p-4 text-left"
            >
                <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{entry.emoji}</span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{entry.title}</span>
                            {isLatest && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
                                    Latest
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{entry.date} · v{entry.version}</p>
                        {!open && (
                            <p className="text-xs text-foreground/70 mt-1 leading-relaxed line-clamp-1">{entry.summary}</p>
                        )}
                    </div>
                </div>
                <div className="flex-shrink-0 mt-1 text-muted-foreground">
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>

            {/* Body */}
            {open && (
                <div className="px-4 pb-4 space-y-2">
                    <p className="text-xs text-foreground/80 leading-relaxed mb-3">{entry.summary}</p>
                    {entry.changes.map((change, i) => {
                        const cfg = TYPE_CONFIG[change.type];
                        return (
                            <div key={i} className="flex items-start gap-2.5">
                                <span className={cn(
                                    "inline-flex items-center gap-1 flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border",
                                    cfg.style
                                )}>
                                    {cfg.icon}
                                    {cfg.label}
                                </span>
                                <span className="text-xs text-foreground leading-relaxed">{change.text}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ── Main modal ─────────────────────────────────────────────────────────── */
interface WhatsNewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className={cn(
                        "pointer-events-auto w-full max-w-lg max-h-[85vh] flex flex-col",
                        "rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/50",
                        "animate-in fade-in slide-in-from-bottom-4 duration-300"
                    )}
                    role="dialog"
                    aria-modal="true"
                    aria-label="What's New"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
                        <div>
                            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                What&apos;s New
                            </h2>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Here&apos;s what&apos;s been updated in this dashboard
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-foreground scrollbar-track-transparent">
                        {CHANGELOG.map((entry, i) => (
                            <VersionCard
                                key={entry.version}
                                entry={entry}
                                isLatest={i === 0}
                                defaultOpen={i === 0}
                            />
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-border/60 flex-shrink-0 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">v{APP_VERSION} · HIM Marketplace Dashboard</span>
                        <button
                            onClick={onClose}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 transition-colors"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
