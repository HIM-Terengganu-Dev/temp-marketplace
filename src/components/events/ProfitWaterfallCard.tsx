"use client";

import React from "react";
import {
    TrendingUp,
    DollarSign,
    Minus,
    Equal,
    Boxes,
    Receipt,
    Wallet,
    Percent,
    ArrowDownRight,
    ArrowUpRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventAnalysisMetrics } from "@/types/events";

interface ProfitWaterfallCardProps {
    metrics: EventAnalysisMetrics;
}

export default function ProfitWaterfallCard({
    metrics,
}: ProfitWaterfallCardProps) {
    const { sales, spend, totalCogs, platformCost = 0, platformCostRate = 25, totalCustomCosts, profit, profitMargin, roas } = metrics;

    const spendPct = sales > 0 ? (spend / sales) * 100 : 0;
    const cogsPct = sales > 0 ? (totalCogs / sales) * 100 : 0;
    const platformPct = sales > 0 ? (platformCost / sales) * 100 : platformCostRate;
    const customPct = sales > 0 ? (totalCustomCosts / sales) * 100 : 0;
    const isProfitable = profit >= 0;

    const formatRM = (val: number) =>
        `RM ${val.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

    return (
        <Card className="border-border/60 bg-card/60 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-border/40 bg-muted/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span>Net Profitability & P&L Waterfall</span>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] font-mono ${
                                        isProfitable
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                            : "bg-destructive/10 text-destructive border-destructive/30"
                                    }`}
                                >
                                    {profitMargin.toFixed(1)}% Margin
                                </Badge>
                            </CardTitle>
                            <p className="text-[11px] text-muted-foreground">
                                Real-time deduction waterfall: Sales &minus; Ad Spend &minus; COGS &minus; Platform Cost ({platformCostRate}%) &minus; Custom Costs = Net Profit.
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Blended ROAS</span>
                        <span className="text-sm font-extrabold font-mono text-foreground">
                            {roas.toFixed(2)}x
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4">
                {/* 6-Step Equation Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-stretch">
                    {/* Step 1: Gross Sales */}
                    <div className="p-3 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold uppercase tracking-wider">1. Gross Sales</span>
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="my-2">
                            <span className="text-lg font-extrabold font-mono text-foreground">
                                {formatRM(sales)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                                100.0% Baseline
                            </span>
                        </div>
                        <div className="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 w-fit">
                            Total Revenue
                        </div>
                    </div>

                    {/* Step 2: Less Ad Spend */}
                    <div className="p-3 rounded-xl bg-card border border-border/60 flex flex-col justify-between relative">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                                <Minus className="h-3 w-3 text-red-400" />
                                2. Ad Spend
                            </span>
                            <DollarSign className="h-3.5 w-3.5 text-red-400" />
                        </div>
                        <div className="my-2">
                            <span className="text-lg font-extrabold font-mono text-red-400">
                                {formatRM(spend)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                                {spendPct.toFixed(1)}% of Sales
                            </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5 w-fit">
                            This System Cost
                        </div>
                    </div>

                    {/* Step 3: Less COGS */}
                    <div className="p-3 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                                <Minus className="h-3 w-3 text-amber-400" />
                                3. Total COGS
                            </span>
                            <Boxes className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="my-2">
                            <span className="text-lg font-extrabold font-mono text-amber-400">
                                {formatRM(totalCogs)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                                {cogsPct.toFixed(1)}% of Sales
                            </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5 w-fit">
                            Product Inventory
                        </div>
                    </div>

                    {/* Step 4: Less Platform Cost */}
                    <div className="p-3 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                                <Minus className="h-3 w-3 text-sky-400" />
                                4. Platform Cost
                            </span>
                            <Percent className="h-3.5 w-3.5 text-sky-400" />
                        </div>
                        <div className="my-2">
                            <span className="text-lg font-extrabold font-mono text-sky-400">
                                {formatRM(platformCost)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                                {platformPct.toFixed(1)}% of Sales
                            </span>
                        </div>
                        <div className="text-[10px] text-sky-400 bg-sky-500/10 rounded px-1.5 py-0.5 w-fit">
                            {platformCostRate}% Channel Fee
                        </div>
                    </div>

                    {/* Step 5: Less Custom Costs */}
                    <div className="p-3 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                                <Minus className="h-3 w-3 text-purple-400" />
                                5. Custom Costs
                            </span>
                            <Receipt className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <div className="my-2">
                            <span className="text-lg font-extrabold font-mono text-purple-400">
                                {formatRM(totalCustomCosts)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                                {customPct.toFixed(1)}% of Sales
                            </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5 w-fit">
                            {metrics.customCosts.length} Line Items
                        </div>
                    </div>

                    {/* Step 6: Equal Net Profit */}
                    <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                        isProfitable 
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" 
                            : "bg-destructive/10 border-destructive/40 text-destructive"
                    }`}>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                                <Equal className="h-3 w-3" />
                                6. Net Profit
                            </span>
                            {isProfitable ? (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                                <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                        </div>
                        <div className="my-2">
                            <span className="text-xl font-black font-mono">
                                {formatRM(profit)}
                            </span>
                            <span className="text-[10px] block opacity-80">
                                Net Margin: {profitMargin.toFixed(1)}%
                            </span>
                        </div>
                        <div className="text-[10px] font-bold rounded px-1.5 py-0.5 w-fit bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {isProfitable ? "Profitable Event" : "Loss Incurred"}
                        </div>
                    </div>
                </div>

                {/* Visual Waterfall Bar */}
                <div className="mt-4 pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                        <span>Margin Distribution Allocation</span>
                        <span>Total Revenue (100%)</span>
                    </div>
                    <div className="h-3.5 w-full rounded-full bg-muted/40 overflow-hidden flex shadow-inner">
                        {/* Spend Bar */}
                        {spendPct > 0 && (
                            <div
                                style={{ width: `${Math.min(100, spendPct)}%` }}
                                className="h-full bg-red-500/80 transition-all"
                                title={`Ad Spend: ${spendPct.toFixed(1)}% (${formatRM(spend)})`}
                            />
                        )}
                        {/* COGS Bar */}
                        {cogsPct > 0 && (
                            <div
                                style={{ width: `${Math.min(100, cogsPct)}%` }}
                                className="h-full bg-amber-500/80 transition-all"
                                title={`COGS: ${cogsPct.toFixed(1)}% (${formatRM(totalCogs)})`}
                            />
                        )}
                        {/* Platform Cost Bar */}
                        {platformCost > 0 && (
                            <div
                                style={{ width: `${Math.min(100, platformPct)}%` }}
                                className="h-full bg-sky-500/80 transition-all"
                                title={`Platform Cost: ${platformPct.toFixed(1)}% (${formatRM(platformCost)})`}
                            />
                        )}
                        {/* Custom Costs Bar */}
                        {customPct > 0 && (
                            <div
                                style={{ width: `${Math.min(100, customPct)}%` }}
                                className="h-full bg-purple-500/80 transition-all"
                                title={`Custom Costs: ${customPct.toFixed(1)}% (${formatRM(totalCustomCosts)})`}
                            />
                        )}
                        {/* Net Profit Bar */}
                        {profitMargin > 0 && (
                            <div
                                style={{ width: `${Math.min(100, profitMargin)}%` }}
                                className="h-full bg-emerald-500 transition-all"
                                title={`Net Profit: ${profitMargin.toFixed(1)}% (${formatRM(profit)})`}
                            />
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            <span>Ad Spend ({spendPct.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span>COGS ({cogsPct.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-sky-500" />
                            <span>Platform Cost ({platformPct.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-purple-500" />
                            <span>Custom Costs ({customPct.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>Net Profit ({profitMargin.toFixed(1)}%)</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
