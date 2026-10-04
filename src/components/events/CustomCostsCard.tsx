"use client";

import React, { useState } from "react";
import {
    DollarSign,
    Plus,
    Trash2,
    Receipt,
    Loader2,
    Sparkles,
    AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomCostItem, CampaignEvent } from "@/types/events";

interface CustomCostsCardProps {
    event: CampaignEvent;
    onUpdateEvent: (updated: CampaignEvent) => void;
    totalCustomCosts: number;
}

export default function CustomCostsCard({
    event,
    onUpdateEvent,
    totalCustomCosts,
}: CustomCostsCardProps) {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Please enter an item name");
            return;
        }
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt < 0) {
            setError("Please enter a valid amount >= 0");
            return;
        }

        const newItem: CustomCostItem = {
            id: `cost_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: name.trim(),
            amount: amt,
        };

        const updatedCosts = [...(event.customCosts || []), newItem];
        await saveCosts(updatedCosts);
        setName("");
        setAmount("");
    };

    const handleDelete = async (costId: string) => {
        const updatedCosts = (event.customCosts || []).filter((c) => c.id !== costId);
        await saveCosts(updatedCosts);
    };

    const saveCosts = async (newCosts: CustomCostItem[]) => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/centralised-data/events", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: event.id,
                    customCosts: newCosts,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to update custom costs");
            }
            onUpdateEvent(data.event);
        } catch (err: any) {
            setError(err.message || "Failed to save custom cost changes");
        } finally {
            setIsSaving(false);
        }
    };

    const costs = event.customCosts || [];

    return (
        <Card className="border-border/60 bg-card/60 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Receipt className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span>Custom Operational Costs</span>
                                <Badge variant="outline" className="text-[10px] font-mono text-amber-500 border-amber-500/30">
                                    {costs.length} {costs.length === 1 ? "Item" : "Items"}
                                </Badge>
                            </CardTitle>
                            <p className="text-[11px] text-muted-foreground">
                                Specific event expenses deducted from gross sales (e.g. talent fees, studio setup, vouchers, giveaways).
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Total Custom Cost</span>
                        <span className="text-base font-extrabold font-mono text-amber-500">
                            RM {totalCustomCosts.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {error && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Inline Add Form */}
                <form onSubmit={handleAdd} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <Input
                        placeholder="Cost item name (e.g. Special Talent Fee, Promo Vouchers, Prop Rental)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSaving}
                        className="h-8 text-xs flex-1"
                    />
                    <div className="relative w-full sm:w-36 shrink-0">
                        <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground font-bold">
                            RM
                        </span>
                        <Input
                            type="number"
                            min="0"
                            step="10"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isSaving}
                            className="h-8 pl-8 text-xs font-mono"
                        />
                    </div>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isSaving}
                        className="h-8 px-3 text-xs gap-1 shrink-0 shadow-xs"
                    >
                        {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Plus className="h-3.5 w-3.5" />
                        )}
                        <span>Add Cost</span>
                    </Button>
                </form>

                {/* Cost Items Table / List */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {costs.length === 0 ? (
                        <div className="p-4 text-center border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground">
                            No custom costs configured for this event. Enter an item name and amount above to deduct from event profit.
                        </div>
                    ) : (
                        costs.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40 hover:border-border transition-colors text-xs"
                            >
                                <div className="flex items-center gap-2 min-w-0 pr-3">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span className="font-semibold text-foreground truncate">
                                        {item.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className="font-mono font-bold text-amber-400">
                                        RM {Number(item.amount).toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(item.id)}
                                        disabled={isSaving}
                                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                        title="Delete custom cost"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
