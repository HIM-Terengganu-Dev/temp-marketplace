"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    GripVertical,
    MessageSquarePlus,
    X,
    CheckCircle2,
    Send,
    Loader2,
    ExternalLink,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Position {
    x: number;
    y: number;
}

export function FeedbackWidget() {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();

    // Position & Drag State
    const [position, setPosition] = useState<Position>({ x: -1, y: -1 });
    const [isDragging, setIsDragging] = useState(false);
    const [hasMoved, setHasMoved] = useState(false);
    const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
        startX: 0,
        startY: 0,
        posX: 0,
        posY: 0,
    });

    // Modal & Form State
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedId, setSubmittedId] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [form, setForm] = useState({
        type: "improvement",
        priority: "medium",
        title: "",
        description: "",
        sender_name: "",
    });

    // Pre-fill sender name from session when session loads
    useEffect(() => {
        if (session?.user?.name && !form.sender_name) {
            setForm((prev) => ({ ...prev, sender_name: session?.user?.name || "Tester" }));
        }
    }, [session]);

    // Restore & Clamp Position on Mount / Resize
    useEffect(() => {
        const updateInitialPosition = () => {
            const saved = localStorage.getItem("feedback_widget_pos");
            const btnWidth = window.innerWidth < 640 ? 150 : 180;
            const btnHeight = 44;
            const margin = 12;
            const bottomMargin = window.innerWidth < 768 ? 76 : 24;

            let initialX = window.innerWidth - btnWidth - margin;
            let initialY = window.innerHeight - btnHeight - bottomMargin;

            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
                        initialX = Math.max(margin, Math.min(parsed.x, window.innerWidth - btnWidth - margin));
                        initialY = Math.max(margin, Math.min(parsed.y, window.innerHeight - btnHeight - bottomMargin));
                    }
                } catch (e) {
                    console.error("Failed to parse feedback widget position", e);
                }
            }

            setPosition({ x: initialX, y: initialY });
        };

        updateInitialPosition();
        window.addEventListener("resize", updateInitialPosition);
        return () => window.removeEventListener("resize", updateInitialPosition);
    }, []);

    // Pointer Drag Handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        setHasMoved(false);

        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            posX: position.x,
            posY: position.y,
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;

        const dx = e.clientX - dragStartRef.current.startX;
        const dy = e.clientY - dragStartRef.current.startY;
        const distance = Math.hypot(dx, dy);

        if (distance > 4) {
            setHasMoved(true);
        }

        const btnWidth = window.innerWidth < 640 ? 150 : 180;
        const btnHeight = 44;
        const margin = 8;
        const bottomMargin = window.innerWidth < 768 ? 72 : 16;

        const newX = Math.max(margin, Math.min(dragStartRef.current.posX + dx, window.innerWidth - btnWidth - margin));
        const newY = Math.max(margin, Math.min(dragStartRef.current.posY + dy, window.innerHeight - btnHeight - bottomMargin));

        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;

        e.currentTarget.releasePointerCapture(e.pointerId);
        setIsDragging(false);

        if (hasMoved) {
            localStorage.setItem("feedback_widget_pos", JSON.stringify(position));
        }
    };

    const handleClickWidget = () => {
        if (!hasMoved) {
            setIsOpen(true);
            setSubmittedId(null);
            setErrorMsg(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) {
            setErrorMsg("Please fill out both summary title and details.");
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: form.type,
                    title: form.title,
                    description: form.description,
                    sender_name: form.sender_name || session?.user?.name || "Tester",
                    page_url: pathname,
                    priority: form.priority,
                }),
            });

            const data = await res.json();
            if (data.success && data.data?.id) {
                setSubmittedId(data.data.id);
                setForm({
                    type: "improvement",
                    priority: "medium",
                    title: "",
                    description: "",
                    sender_name: session?.user?.name || "Tester",
                });
            } else {
                setErrorMsg(data.error || "Failed to submit feedback.");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Network error submitting feedback.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (position.x < 0) return null;

    return (
        <>
            {/* ── Draggable Floating Widget Button ────────────────────────────── */}
            <div
                style={{ left: `${position.x}px`, top: `${position.y}px` }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleClickWidget}
                className={cn(
                    "fixed z-50 flex items-center gap-2 px-3 py-2.5 rounded-full shadow-2xl transition-all duration-150 border touch-none select-none",
                    "bg-slate-900/95 dark:bg-slate-900/90 backdrop-blur-md border-slate-700/60 text-slate-100",
                    "hover:border-violet-500/50 hover:shadow-violet-500/20 hover:bg-slate-900",
                    isDragging ? "cursor-grabbing scale-105 shadow-violet-500/30 border-violet-500" : "cursor-grab"
                )}
            >
                <div className="text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2">
                    <MessageSquarePlus className="h-4.5 w-4.5 text-violet-400" />
                    <span className="text-xs font-semibold tracking-wide">Feedback & Bugs</span>
                </div>
            </div>

            {/* ── Submission Modal ───────────────────────────────────────────── */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg bg-card border border-border text-card-foreground rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex-shrink-0">
                                    <MessageSquarePlus className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-foreground leading-tight">Send System Feedback</h3>
                                    <p className="text-xs text-muted-foreground">Report bugs, suggest ideas, or request features</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
                            {submittedId ? (
                                /* Success State */
                                <div className="py-6 text-center space-y-4">
                                    <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-foreground">Thank You for Your Feedback!</h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Reference Ticket: <span className="font-mono text-violet-600 dark:text-violet-400 font-semibold">#{submittedId}</span>
                                        </p>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setSubmittedId(null)}
                                            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border transition-all"
                                        >
                                            Submit Another
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsOpen(false);
                                                router.push("/feedback");
                                            }}
                                            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-violet-600/20"
                                        >
                                            View Feedback Board
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Form State */
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {errorMsg && (
                                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>{errorMsg}</span>
                                        </div>
                                    )}

                                    {/* Dynamic Page URL Indicator */}
                                    <div className="px-3 py-2 rounded-xl bg-muted/60 border border-border flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="text-[11px] font-medium text-muted-foreground">Captured Path:</span>
                                        <span className="font-mono text-violet-600 dark:text-violet-400 truncate max-w-[280px]">{pathname}</span>
                                    </div>

                                    {/* Type & Priority Row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-foreground mb-1.5">
                                                Feedback Type
                                            </label>
                                            <select
                                                value={form.type}
                                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="bug">🐛 Bug Report</option>
                                                <option value="improvement">⚡ Improvement</option>
                                                <option value="feature">✨ Feature Request</option>
                                                <option value="other">💬 General Feedback</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-foreground mb-1.5">
                                                Priority
                                            </label>
                                            <select
                                                value={form.priority}
                                                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="critical">Critical 🔥</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                                            Title / Summary <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Table sorting fails on Shopee Ads page"
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            required
                                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                                            Details & Steps to Reproduce <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            rows={4}
                                            placeholder="Describe what happened or what you'd like improved..."
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            required
                                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                        />
                                    </div>

                                    {/* Sender Name */}
                                    <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                                            Your Name / Tester Tag
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Tester"
                                            value={form.sender_name}
                                            onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    {/* Action buttons */}
                                    <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
                                        <button
                                            type="button"
                                            onClick={() => setIsOpen(false)}
                                            className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/25 transition-all"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-3.5 w-3.5" />
                                                    Submit Feedback
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
