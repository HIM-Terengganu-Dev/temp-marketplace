"use client";

import React from "react";
import {
    Users,
    UserCheck,
    UserPlus,
    RefreshCw,
    TrendingUp,
    ShoppingBag,
    DollarSign,
    Percent,
    Sparkles
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventAnalysisMetrics } from "@/types/events";

interface CustomerRetentionCardProps {
    metrics: EventAnalysisMetrics;
    platform?: "combine" | "tiktok" | "shopee";
}

export default function CustomerRetentionCard({ metrics, platform = "combine" }: CustomerRetentionCardProps) {
    const cohort = metrics.customerCohort;

    const formatRM = (val: number) =>
        `RM ${val.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const platformLabel =
        platform === "shopee"
            ? "Shopee"
            : platform === "tiktok"
            ? "TikTok"
            : "Combined (TikTok + Shopee)";

    const badgeLabel =
        platform === "shopee"
            ? "🛍️ Shopee Buyer Analytics"
            : platform === "tiktok"
            ? "🎵 TikTok Buyer Analytics"
            : "🌐 Combined Buyer Analytics";

    if (!cohort || cohort.totalCustomers === 0) {
        return (
            <Card className="border-border/60 bg-card/60 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400">
                                <Users className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm">Customer Acquisition & Retention</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">
                            {badgeLabel}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 text-center text-xs text-muted-foreground italic">
                    No customer order records detected for {platformLabel} within this event date window.
                </CardContent>
            </Card>
        );
    }

    const {
        totalCustomers,
        newCustomers,
        returningCustomers,
        returnCustomerRate,
        newGmv,
        returningGmv,
        totalGmv,
        newOrders,
        returningOrders,
        totalOrders,
        newAov,
        returningAov,
    } = cohort;

    const newCustomerPct = totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0;
    const newGmvPct = totalGmv > 0 ? (newGmv / totalGmv) * 100 : 0;
    const returningGmvPct = totalGmv > 0 ? (returningGmv / totalGmv) * 100 : 0;

    return (
        <Card className="border-border/60 bg-gradient-to-br from-card/80 to-purple-950/10 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <span>Customer Acquisition &amp; Retention</span>
                                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[9px] font-mono">
                                    {badgeLabel}
                                </Badge>
                            </CardTitle>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                Unique buyers split by First-Time buyers vs. Returning customer cohorts ({platformLabel})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono text-[10px] px-2 py-0.5"
                        >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {returnCustomerRate.toFixed(1)}% Repeat Rate
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {/* 4 Summary Metric Columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* 1. Total Unique Buyers */}
                    <div className="p-3 rounded-xl bg-card/60 border border-border/40 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                            <span>Total Buyers</span>
                            <Users className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
                            {totalCustomers.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {totalOrders.toLocaleString()} total orders
                        </p>
                    </div>

                    {/* 2. New Customers */}
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-400 tracking-wider">
                            <span>New Customers</span>
                            <UserPlus className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-blue-400">
                            {newCustomers.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{newCustomerPct.toFixed(1)}% of buyers</span>
                            <span>{newOrders.toLocaleString()} orders</span>
                        </div>
                    </div>

                    {/* 3. Returning Customers */}
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                            <span>Repeat Customers</span>
                            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                            {returningCustomers.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{returnCustomerRate.toFixed(1)}% of buyers</span>
                            <span>{returningOrders.toLocaleString()} orders</span>
                        </div>
                    </div>

                    {/* 4. Repeat GMV Contribution */}
                    <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-purple-400 tracking-wider">
                            <span>Repeat GMV Share</span>
                            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-purple-400">
                            {returningGmvPct.toFixed(1)}%
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                            {formatRM(returningGmv)}
                        </p>
                    </div>
                </div>

                {/* Cohort Comparison Bar & Side-by-side Deep Dive */}
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Percent className="h-3.5 w-3.5 text-purple-400" />
                            Customer &amp; Revenue Composition
                        </span>
                        <div className="flex items-center gap-4 text-[11px] font-mono">
                            <span className="flex items-center gap-1 text-blue-400">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                New ({newCustomerPct.toFixed(0)}%)
                            </span>
                            <span className="flex items-center gap-1 text-emerald-400">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Repeat ({returnCustomerRate.toFixed(0)}%)
                            </span>
                        </div>
                    </div>

                    {/* Visual Segment Bar */}
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
                        <div
                            className="h-full bg-blue-500 transition-all duration-700"
                            style={{ width: `${newCustomerPct}%` }}
                            title={`New Customers: ${newCustomerPct.toFixed(1)}%`}
                        />
                        <div
                            className="h-full bg-emerald-500 transition-all duration-700"
                            style={{ width: `${returnCustomerRate}%` }}
                            title={`Repeat Customers: ${returnCustomerRate.toFixed(1)}%`}
                        />
                    </div>

                    {/* Detailed Side-by-Side Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* New Cohort Box */}
                        <div className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                                    <UserPlus className="h-3 w-3" /> New Buyer Segment
                                </span>
                                <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400">
                                    {newGmvPct.toFixed(1)}% of Sales
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">GMV Generated</span>
                                    <span className="font-bold font-mono text-foreground">{formatRM(newGmv)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">Average Order (AOV)</span>
                                    <span className="font-bold font-mono text-foreground">{formatRM(newAov)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Repeat Cohort Box */}
                        <div className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                    <UserCheck className="h-3 w-3" /> Repeat Buyer Segment
                                </span>
                                <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">
                                    {returningGmvPct.toFixed(1)}% of Sales
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">GMV Generated</span>
                                    <span className="font-bold font-mono text-foreground">{formatRM(returningGmv)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">Average Order (AOV)</span>
                                    <span className="font-bold font-mono text-foreground">{formatRM(returningAov)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
