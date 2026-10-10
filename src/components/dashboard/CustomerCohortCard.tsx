"use client";

import React from "react";
import {
    Users,
    UserCheck,
    UserPlus,
    RefreshCw,
    TrendingUp,
    ShoppingBag,
    Percent,
    Sparkles,
    ArrowUpRight,
    Store
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SHOP_NAME_MAP: Record<string, string> = {
    // TikTok Shops
    "1": "Him.DrSamhan (TT)",
    "2": "HIM CLINIC (TT)",
    "3": "Vigomax HQ (TT)",
    "4": "VigomaxPlus HQ (TT)",
    // Shopee Shops
    "1245549673": "Vigomax+Hq (Shopee)",
    "562396517": "drsamhansharing (Shopee)",
    "1298030530": "him.drsamhan (Shopee)",
    "1077500606": "him.drsamhan1 (Shopee)",
    "1256177782": "him.drsamhan2 (Shopee)",
    "1285322524": "him.drsamhan3 (Shopee)",
    "1290223366": "him.drsamhan4 (Shopee)",
    "793855746": "vigomaxplus08 (Shopee)",
};

interface CustomerCohortSummary {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    returnCustomerRate: number;
    totalOrders: number;
    newOrders: number;
    returningOrders: number;
    totalGmv: number;
    newGmv: number;
    returningGmv: number;
    newAov: number;
    returningAov: number;
}

interface CustomerCohortCardProps {
    data: {
        summary: CustomerCohortSummary;
        byShop?: Array<{
            shopId: string;
            marketplace?: string;
            newCustomers: number;
            returningCustomers: number;
            totalCustomers: number;
            newGmv: number;
            returningGmv: number;
            totalGmv: number;
            returnRate: number;
        }>;
    } | null;
    isLoading?: boolean;
    dateLabel?: string;
    platform?: "all" | "tiktok" | "shopee";
    onPlatformChange?: (platform: "all" | "tiktok" | "shopee") => void;
}

export function CustomerCohortCard({
    data,
    isLoading,
    dateLabel,
    platform = "all",
    onPlatformChange,
}: CustomerCohortCardProps) {
    const formatRM = (val: number) =>
        `RM ${(val || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const platformLabel =
        platform === "shopee" ? "Shopee" : platform === "tiktok" ? "TikTok" : "Combined (TikTok + Shopee)";

    const badgeLabel =
        platform === "shopee" ? "🛍️ Shopee Buyers" : platform === "tiktok" ? "🎵 TikTok Buyers" : "🌐 All Platforms";

    if (isLoading && !data) {
        return (
            <Card className="border-purple-500/20 bg-purple-500/5 backdrop-blur-sm animate-pulse">
                <CardHeader className="p-4 pb-2 border-b border-border/30">
                    <div className="flex items-center justify-between">
                        <div className="h-4 w-48 bg-muted rounded" />
                        <div className="h-4 w-20 bg-muted rounded" />
                    </div>
                </CardHeader>
                <CardContent className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                    <span>Analyzing customer retention cohorts ({platformLabel})...</span>
                </CardContent>
            </Card>
        );
    }

    if (!data || !data.summary || data.summary.totalCustomers === 0) {
        return (
            <Card className="border-purple-500/20 bg-purple-500/5 backdrop-blur-sm">
                <CardHeader className="p-4 pb-2 border-b border-border/30 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold">Customer Retention &amp; Acquisition</CardTitle>
                            <p className="text-[10px] text-muted-foreground">
                                {platformLabel} customer loyalty &amp; first-time cohorts
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onPlatformChange && (
                            <div className="flex items-center rounded-lg border border-border/50 bg-background/50 p-0.5 text-[10px]">
                                <button
                                    type="button"
                                    onClick={() => onPlatformChange("all")}
                                    className={cn(
                                        "px-2 py-0.5 rounded font-medium transition-colors",
                                        platform === "all" ? "bg-purple-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onPlatformChange("tiktok")}
                                    className={cn(
                                        "px-2 py-0.5 rounded font-medium transition-colors",
                                        platform === "tiktok" ? "bg-purple-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    TikTok
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onPlatformChange("shopee")}
                                    className={cn(
                                        "px-2 py-0.5 rounded font-medium transition-colors",
                                        platform === "shopee" ? "bg-purple-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Shopee
                                </button>
                            </div>
                        )}
                        <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400">
                            {badgeLabel}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 text-center text-xs text-muted-foreground italic">
                    No customer transaction records found for {platformLabel} during the selected period.
                </CardContent>
            </Card>
        );
    }

    const { summary, byShop } = data;
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
    } = summary;

    const newCustPct = totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0;
    const newGmvPct = totalGmv > 0 ? (newGmv / totalGmv) * 100 : 0;
    const retGmvPct = totalGmv > 0 ? (returningGmv / totalGmv) * 100 : 0;

    return (
        <Card className="border-border/60 bg-gradient-to-br from-card/70 via-purple-950/5 to-card/90 backdrop-blur-sm overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm font-bold text-foreground">
                                    Customer Acquisition &amp; Retention
                                </CardTitle>
                                <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[9px] font-mono px-1.5 py-0">
                                    {badgeLabel}
                                </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                First-time new buyers vs. repeat customer cohorts ({platformLabel}) {dateLabel ? `• ${dateLabel}` : ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {onPlatformChange && (
                            <div className="flex items-center rounded-lg border border-border/50 bg-background/50 p-0.5 text-[10px]">
                                <button
                                    type="button"
                                    onClick={() => onPlatformChange("all")}
                                    className={cn(
                                        "px-2 py-0.5 rounded font-medium transition-colors",
                                        platform === "all" ? "bg-purple-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onPlatformChange("tiktok")}
                                    className={cn(
                                        "px-2 py-0.5 rounded font-medium transition-colors",
                                        platform === "tiktok" ? "bg-purple-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    TikTok
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onPlatformChange("shopee")}
                                    className={cn(
                                        "px-2 py-0.5 rounded font-medium transition-colors",
                                        platform === "shopee" ? "bg-purple-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Shopee
                                </button>
                            </div>
                        )}
                        <Badge
                            className={cn(
                                "text-[10px] font-bold px-2.5 py-1 border font-mono flex items-center gap-1",
                                returnCustomerRate >= 50
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                            )}
                        >
                            <TrendingUp className="h-3 w-3" />
                            {returnCustomerRate.toFixed(1)}% Repeat Buyer Rate
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* 4 Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* 1. Total Unique Buyers */}
                    <div className="p-3 rounded-xl bg-muted/15 border border-border/30 space-y-1">
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
                            <span>New Buyers</span>
                            <UserPlus className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-blue-400">
                            {newCustomers.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{newCustPct.toFixed(1)}% of buyers</span>
                            <span>{newOrders.toLocaleString()} orders</span>
                        </div>
                    </div>

                    {/* 3. Returning Customers */}
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                            <span>Repeat Buyers</span>
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
                            {retGmvPct.toFixed(1)}%
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                            {formatRM(returningGmv)}
                        </p>
                    </div>
                </div>

                {/* Progress bar split */}
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Percent className="h-3.5 w-3.5 text-purple-400" />
                            Customer &amp; Revenue Ratio
                        </span>
                        <div className="flex items-center gap-4 text-[11px] font-mono">
                            <span className="flex items-center gap-1 text-blue-400">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                New Buyers: {newCustPct.toFixed(1)}% ({formatRM(newGmv)})
                            </span>
                            <span className="flex items-center gap-1 text-emerald-400">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Repeat Buyers: {returnCustomerRate.toFixed(1)}% ({formatRM(returningGmv)})
                            </span>
                        </div>
                    </div>

                    <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
                        <div
                            className="h-full bg-blue-500 transition-all duration-700"
                            style={{ width: `${newCustPct}%` }}
                            title={`New Buyers: ${newCustPct.toFixed(1)}%`}
                        />
                        <div
                            className="h-full bg-emerald-500 transition-all duration-700"
                            style={{ width: `${returnCustomerRate}%` }}
                            title={`Repeat Buyers: ${returnCustomerRate.toFixed(1)}%`}
                        />
                    </div>
                </div>

                {/* Side-by-side details: AOV and GMV Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-card/60 border border-border/40 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                                <UserPlus className="h-3 w-3" /> New Buyer Cohort Performance
                            </span>
                            <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400">
                                {newGmvPct.toFixed(1)}% of GMV
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-[10px] text-muted-foreground block">GMV</span>
                                <span className="font-bold font-mono text-foreground">{formatRM(newGmv)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-muted-foreground block">Average Order (AOV)</span>
                                <span className="font-bold font-mono text-foreground">{formatRM(newAov)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-card/60 border border-border/40 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                <UserCheck className="h-3 w-3" /> Repeat Buyer Cohort Performance
                            </span>
                            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">
                                {retGmvPct.toFixed(1)}% of GMV
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-[10px] text-muted-foreground block">GMV</span>
                                <span className="font-bold font-mono text-foreground">{formatRM(returningGmv)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-muted-foreground block">Average Order (AOV)</span>
                                <span className="font-bold font-mono text-foreground">{formatRM(returningAov)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shop Breakdown if multiple shops present */}
                {byShop && byShop.length > 1 && (
                    <div className="pt-2 border-t border-border/30 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Store className="h-3 w-3" />
                                Store Cohort Breakdown ({platformLabel})
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                            {byShop.map((s) => {
                                const sName = SHOP_NAME_MAP[s.shopId] || `Shop ${s.shopId}`;
                                return (
                                    <div
                                        key={`${s.shopId}-${s.marketplace || ''}`}
                                        className="p-2.5 rounded-lg border border-border/40 bg-card/40 flex flex-col justify-between space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-foreground truncate max-w-[120px]">{sName}</span>
                                            <Badge
                                                variant="outline"
                                                className="text-[9px] font-mono border-emerald-500/30 text-emerald-400 px-1 py-0"
                                            >
                                                {s.returnRate.toFixed(1)}% rep.
                                            </Badge>
                                        </div>
                                        <div className="text-[11px] space-y-0.5">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>New / Repeat:</span>
                                                <span className="font-mono text-foreground font-semibold">
                                                    {s.newCustomers.toLocaleString()} / {s.returningCustomers.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Total GMV:</span>
                                                <span className="font-mono text-foreground font-semibold">
                                                    {formatRM(s.totalGmv)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default CustomerCohortCard;
