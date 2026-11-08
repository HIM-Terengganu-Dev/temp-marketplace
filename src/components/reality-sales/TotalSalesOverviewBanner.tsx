"use client";

import React from "react";
import {
    TrendingUp,
    ShoppingBag,
    Video,
    Globe,
    Target,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    Edit3,
    Sparkles,
    BarChart3,
    Layers,
    DollarSign,
    Percent,
    Radio,
    Share2,
    Megaphone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type PlatformFilter = "all" | "tt" | "shopee";

export interface OverallSalesData {
    status: string;
    hasData: boolean;
    targetAmount: number;
    totalGmv: number;
    totalOrders: number;
    totalSpend: number;
    attainmentRate: number;
    variance: number;
    blendedRoas: number;
    tiktok: {
        gmv: number;
        orders: number;
        spend: number;
        targetAmount: number;
        attainmentRate: number;
        sharePct: number;
        roas: number;
        activeDays: number;
    };
    shopee: {
        gmv: number;
        orders: number;
        spend: number;
        targetAmount: number;
        attainmentRate: number;
        sharePct: number;
        roas: number;
        activeDays: number;
    };
}

interface TotalSalesOverviewBannerProps {
    overallData?: OverallSalesData | null;
    marketingData?: any;
    livehostData?: any;
    affiliateData?: any;
    platformFilter: PlatformFilter;
    onPlatformFilterChange: (p: PlatformFilter) => void;
    month: string;
    isAdmin: boolean;
    onEditTarget: (dept: "overall", label: string, currentVal: number) => void;
}

export default function TotalSalesOverviewBanner({
    overallData,
    marketingData,
    livehostData,
    affiliateData,
    platformFilter,
    onPlatformFilterChange,
    month,
    isAdmin,
    onEditTarget,
}: TotalSalesOverviewBannerProps) {
    const totalGmv = overallData?.totalGmv || 0;
    const tiktokGmv = overallData?.tiktok?.gmv || 0;
    const shopeeGmv = overallData?.shopee?.gmv || 0;

    const totalOrders = overallData?.totalOrders || 0;
    const tiktokOrders = overallData?.tiktok?.orders || 0;
    const shopeeOrders = overallData?.shopee?.orders || 0;

    const targetAmount = overallData?.targetAmount || 0;
    const tiktokTarget = overallData?.tiktok?.targetAmount || 0;
    const shopeeTarget = overallData?.shopee?.targetAmount || 0;

    const attainmentRate = overallData?.attainmentRate || 0;
    const tiktokAttainment = overallData?.tiktok?.attainmentRate || 0;
    const shopeeAttainment = overallData?.shopee?.attainmentRate || 0;

    const tiktokShare = overallData?.tiktok?.sharePct || (totalGmv > 0 ? (tiktokGmv / totalGmv) * 100 : 0);
    const shopeeShare = overallData?.shopee?.sharePct || (totalGmv > 0 ? (shopeeGmv / totalGmv) * 100 : 0);

    // Active displayed metric values depending on current platform filter
    const displayGmv =
        platformFilter === "tt" ? tiktokGmv : platformFilter === "shopee" ? shopeeGmv : totalGmv;

    const displayTarget =
        platformFilter === "tt"
            ? tiktokTarget
            : platformFilter === "shopee"
            ? shopeeTarget
            : targetAmount;

    const displayAttainment =
        platformFilter === "tt"
            ? tiktokAttainment
            : platformFilter === "shopee"
            ? shopeeAttainment
            : attainmentRate;

    const displayOrders =
        platformFilter === "tt" ? tiktokOrders : platformFilter === "shopee" ? shopeeOrders : totalOrders;

    const displayVariance = displayGmv - displayTarget;

    // Sub-department contributions for TikTok
    const tiktokMarketingVideoGmv = marketingData?.totalSales || 0;
    const tiktokLiveGmv = livehostData?.tiktokGmv || 0;
    const tiktokAffiliateGmv = affiliateData?.tiktokGmv || 0;

    // Sub-department contributions for Shopee
    const shopeeLiveGmv = livehostData?.shopeeGmv || 0;
    const shopeeAffiliateGmv = affiliateData?.shopeeGmv || 0;

    return (
        <Card className="border-border/70 bg-gradient-to-b from-card via-card/90 to-background/60 shadow-lg relative overflow-hidden backdrop-blur-md">
            {/* Ambient Background Glows */}
            <div className="absolute -top-16 -left-16 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Control Header */}
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                                <DollarSign className="h-4 w-4" />
                            </span>
                            <CardTitle className="text-base sm:text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
                                <span>Total Marketplace Sales</span>
                                <Badge
                                    variant="outline"
                                    className="text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/30"
                                >
                                    {month}
                                </Badge>
                            </CardTitle>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground">
                            Centralised revenue command across TikTok Shop & Shopee marketplace channels.
                        </CardDescription>
                    </div>

                    {/* Platform Selector Buttons: ( all, tt, shopee ) */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/70 border border-border/60 self-start md:self-auto shadow-inner">
                        <Button
                            variant={platformFilter === "all" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => onPlatformFilterChange("all")}
                            className={`h-8 px-3 text-xs font-bold transition-all rounded-lg ${
                                platformFilter === "all"
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            <Globe className="h-3.5 w-3.5 mr-1.5" />
                            <span>All</span>
                        </Button>

                        <Button
                            variant={platformFilter === "tt" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => onPlatformFilterChange("tt")}
                            className={`h-8 px-3 text-xs font-bold transition-all rounded-lg ${
                                platformFilter === "tt"
                                    ? "bg-cyan-500 hover:bg-cyan-600 text-white shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            <Video className="h-3.5 w-3.5 mr-1.5" />
                            <span>TT (TikTok)</span>
                        </Button>

                        <Button
                            variant={platformFilter === "shopee" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => onPlatformFilterChange("shopee")}
                            className={`h-8 px-3 text-xs font-bold transition-all rounded-lg ${
                                platformFilter === "shopee"
                                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                            <span>Shopee</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-6">
                {/* 1. TOTAL SALES DEKAT ATAS (Hero KPI Summary) */}
                <div className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {platformFilter === "all"
                                        ? "Combined Marketplace GMV (Total Sales)"
                                        : platformFilter === "tt"
                                        ? "TikTok Shop Total Sales"
                                        : "Shopee Marketplace Total Sales"}
                                </span>
                                {platformFilter !== "all" && (
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] uppercase font-bold ${
                                            platformFilter === "tt"
                                                ? "text-cyan-500 border-cyan-500/30 bg-cyan-500/10"
                                                : "text-amber-500 border-amber-500/30 bg-amber-500/10"
                                        }`}
                                    >
                                        Filtered: {platformFilter === "tt" ? "TikTok Shop" : "Shopee"}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-baseline gap-3 flex-wrap">
                                <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                                    RM {displayGmv.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {displayTarget > 0 && (
                                    <Badge
                                        variant="outline"
                                        className={`text-xs px-2.5 py-1 font-bold ${
                                            displayAttainment >= 100
                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                                : displayAttainment >= 85
                                                ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                                : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                                        }`}
                                    >
                                        {displayAttainment.toFixed(1)}% Attained
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                                <div className="flex items-center gap-1.5 font-medium">
                                    <Target className="h-3.5 w-3.5 text-primary" />
                                    <span>Target:</span>
                                    <span className="font-mono font-bold text-foreground">
                                        RM {displayTarget.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 font-medium">
                                    <span className="h-1.5 w-1.5 rounded-full bg-border" />
                                    <span>Variance:</span>
                                    <span
                                        className={`font-mono font-bold ${
                                            displayVariance >= 0 ? "text-emerald-500" : "text-rose-500"
                                        }`}
                                    >
                                        {displayVariance >= 0 ? "+" : ""}
                                        RM {displayVariance.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 font-medium">
                                    <span className="h-1.5 w-1.5 rounded-full bg-border" />
                                    <span>Orders:</span>
                                    <span className="font-mono font-bold text-foreground">
                                        {displayOrders.toLocaleString()}
                                    </span>
                                </div>

                                {isAdmin && (
                                    <button
                                        onClick={() => onEditTarget("overall", "Overall Sales", targetAmount)}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline ml-1"
                                    >
                                        <Edit3 className="h-3 w-3" />
                                        <span>Edit Target</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Visual Ratio Progress Bar */}
                        <div className="w-full lg:w-72 space-y-2 p-3 rounded-xl bg-muted/40 border border-border/40">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold flex items-center gap-1.5 text-cyan-500">
                                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                    <span>TT: {tiktokShare.toFixed(1)}%</span>
                                </span>
                                <span className="font-bold flex items-center gap-1.5 text-amber-500">
                                    <span>Shopee: {shopeeShare.toFixed(1)}%</span>
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                </span>
                            </div>

                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex shadow-inner">
                                <div
                                    className="h-full bg-cyan-500 transition-all duration-500"
                                    style={{ width: `${tiktokShare}%` }}
                                    title={`TikTok Shop: ${tiktokShare.toFixed(1)}%`}
                                />
                                <div
                                    className="h-full bg-amber-500 transition-all duration-500"
                                    style={{ width: `${shopeeShare}%` }}
                                    title={`Shopee: ${shopeeShare.toFixed(1)}%`}
                                />
                            </div>

                            <div className="text-[10px] text-muted-foreground text-center">
                                Total GMV Distribution ({totalGmv > 0 ? "100%" : "No data"})
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. BARU PECAHKAN BY PLATFORM (TikTok Shop vs Shopee Cards) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <BarChart3 className="h-3.5 w-3.5 text-primary" />
                            <span>Platform Breakdown (TikTok Shop &amp; Shopee)</span>
                        </h3>
                        {platformFilter !== "all" && (
                            <button
                                onClick={() => onPlatformFilterChange("all")}
                                className="text-xs text-primary hover:underline font-semibold"
                            >
                                Reset Filter to All
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* A. TikTok Shop Card */}
                        <Card
                            onClick={() => onPlatformFilterChange(platformFilter === "tt" ? "all" : "tt")}
                            className={`cursor-pointer transition-all hover:shadow-md relative overflow-hidden border ${
                                platformFilter === "tt"
                                    ? "border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/5 shadow-md"
                                    : "border-border/60 hover:border-cyan-500/50 bg-card/60"
                            }`}
                        >
                            <div className="absolute top-0 right-0 h-28 w-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                            <CardHeader className="p-4 pb-2 border-b border-border/40">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                                            <Video className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                                                <span>TikTok Shop</span>
                                                {platformFilter === "tt" && (
                                                    <Badge className="text-[9px] bg-cyan-500 text-white font-mono h-4 px-1.5">
                                                        ACTIVE
                                                    </Badge>
                                                )}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground block">
                                                HIM Wellness (Shop 1 &amp; 2)
                                            </span>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="text-xs bg-cyan-500/10 text-cyan-500 border-cyan-500/30 font-bold"
                                    >
                                        {tiktokShare.toFixed(1)}% Share
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
                                        RM {tiktokGmv.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                        <span>Target: RM {tiktokTarget.toLocaleString("en-MY", { maximumFractionDigits: 0 })}</span>
                                        <span className="font-bold text-cyan-500">{tiktokAttainment.toFixed(1)}%</span>
                                    </div>
                                </div>

                                {/* Metrics Summary */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                                            Orders
                                        </span>
                                        <span className="text-sm font-bold font-mono text-foreground">
                                            {tiktokOrders.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                                            Avg Order Value
                                        </span>
                                        <span className="text-sm font-bold font-mono text-foreground">
                                            RM {tiktokOrders > 0 ? (tiktokGmv / tiktokOrders).toFixed(2) : "0.00"}
                                        </span>
                                    </div>
                                </div>

                                {/* Reality Department Breakdown Contribution */}
                                <div className="pt-2 border-t border-border/40 space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                        Department Streams Reconciled:
                                    </span>

                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/30">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Megaphone className="h-3 w-3 text-primary" />
                                                <span>1. Marketing Video GMV</span>
                                            </span>
                                            <span className="font-mono font-bold text-foreground">
                                                RM {tiktokMarketingVideoGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/30">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Radio className="h-3 w-3 text-blue-500" />
                                                <span>2. Live Host GMV</span>
                                            </span>
                                            <span className="font-mono font-bold text-foreground">
                                                RM {tiktokLiveGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/30">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Share2 className="h-3 w-3 text-emerald-500" />
                                                <span>3. Affiliate Network GMV</span>
                                            </span>
                                            <span className="font-mono font-bold text-foreground">
                                                RM {tiktokAffiliateGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold flex items-center justify-between pt-1">
                                    <span>{platformFilter === "tt" ? "Showing TikTok view" : "Click to isolate TikTok"}</span>
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* B. Shopee Card */}
                        <Card
                            onClick={() => onPlatformFilterChange(platformFilter === "shopee" ? "all" : "shopee")}
                            className={`cursor-pointer transition-all hover:shadow-md relative overflow-hidden border ${
                                platformFilter === "shopee"
                                    ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-md"
                                    : "border-border/60 hover:border-amber-500/50 bg-card/60"
                            }`}
                        >
                            <div className="absolute top-0 right-0 h-28 w-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                            <CardHeader className="p-4 pb-2 border-b border-border/40">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                            <ShoppingBag className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                                                <span>Shopee Marketplace</span>
                                                {platformFilter === "shopee" && (
                                                    <Badge className="text-[9px] bg-amber-500 text-white font-mono h-4 px-1.5">
                                                        ACTIVE
                                                    </Badge>
                                                )}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground block">
                                                HIM Wellness Official Stores
                                            </span>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                                    >
                                        {shopeeShare.toFixed(1)}% Share
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
                                        RM {shopeeGmv.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                        <span>Target: RM {shopeeTarget.toLocaleString("en-MY", { maximumFractionDigits: 0 })}</span>
                                        <span className="font-bold text-amber-500">{shopeeAttainment.toFixed(1)}%</span>
                                    </div>
                                </div>

                                {/* Metrics Summary */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                                            Orders
                                        </span>
                                        <span className="text-sm font-bold font-mono text-foreground">
                                            {shopeeOrders.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                                            Avg Order Value
                                        </span>
                                        <span className="text-sm font-bold font-mono text-foreground">
                                            RM {shopeeOrders > 0 ? (shopeeGmv / shopeeOrders).toFixed(2) : "0.00"}
                                        </span>
                                    </div>
                                </div>

                                {/* Reality Department Breakdown Contribution */}
                                <div className="pt-2 border-t border-border/40 space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                        Department Streams Reconciled:
                                    </span>

                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/30">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Megaphone className="h-3 w-3 text-muted-foreground/60" />
                                                <span>1. Marketing Video GMV</span>
                                            </span>
                                            <span className="font-mono text-[11px] text-muted-foreground">
                                                TikTok Only
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/30">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Radio className="h-3 w-3 text-blue-500" />
                                                <span>2. Live Host GMV</span>
                                            </span>
                                            <span className="font-mono font-bold text-foreground">
                                                RM {shopeeLiveGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/30">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Share2 className="h-3 w-3 text-emerald-500" />
                                                <span>3. Affiliate Network GMV</span>
                                            </span>
                                            <span className="font-mono font-bold text-foreground">
                                                RM {shopeeAffiliateGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between pt-1">
                                    <span>{platformFilter === "shopee" ? "Showing Shopee view" : "Click to isolate Shopee"}</span>
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
