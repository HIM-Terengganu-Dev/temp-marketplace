"use client";

import React, { useState } from "react";
import { X, Target, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditDepartmentTargetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    department: 'marketing' | 'livehost' | 'affiliate';
    departmentLabel: string;
    month: string;
    currentTarget: number;
}

export default function EditDepartmentTargetModal({
    isOpen,
    onClose,
    onSaved,
    department,
    departmentLabel,
    month,
    currentTarget,
}: EditDepartmentTargetModalProps) {
    const [targetVal, setTargetVal] = useState<string>(currentTarget ? currentTarget.toString() : "0");
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(false);

        const amount = parseFloat(targetVal);
        if (isNaN(amount) || amount < 0) {
            setErrorMsg("Please enter a valid target amount (greater than or equal to 0).");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/reality-sales/targets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    month,
                    department,
                    targetAmount: amount,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to update monthly target");
            }

            setSuccessMsg(true);
            setTimeout(() => {
                setIsSaving(false);
                onSaved();
                onClose();
            }, 600);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to save target");
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
            <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        <Target className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Configure Monthly Target</h3>
                        <p className="text-xs text-muted-foreground">Admin Only • {departmentLabel} ({month})</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            Target Month
                        </label>
                        <input
                            type="text"
                            value={month}
                            disabled
                            className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            Monthly Target (RM)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">RM</span>
                            <input
                                type="number"
                                step="1000"
                                min="0"
                                required
                                value={targetVal}
                                onChange={(e) => setTargetVal(e.target.value)}
                                placeholder="350000"
                                className="w-full rounded-md border border-input bg-background pl-11 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            This monthly baseline is used to compute attainment percentage and shortfall.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                            {errorMsg}
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            Target saved successfully!
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isSaving}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[90px]"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Target"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
