"use client";

import React from "react";
import dynamic from "next/dynamic";
import { 
    TrendingUp, 
    TrendingDown, 
    ShoppingBag, 
    DollarSign, 
    Percent, 
    Filter, 
    Activity, 
    Clock, 
    RefreshCw,
    AlertCircle,
    Eye,
    MousePointerClick,
    Layers,
    ArrowRight,
    Store
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimpleDatePicker, DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { cn } from "@/lib/utils";

// Dynamic import of FunnelCharts to keep Recharts out of initial main bundle
const FunnelCharts = dynamic(() => import("./FunnelCharts"), {
    ssr: false,
    loading: () => (
        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 h-[260px] animate-pulse bg-muted/40 rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading trendlines...
            </div>
            <div className="h-[260px] animate-pulse bg-muted/40 rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading attribution...
            </div>
        </div>
    )
});

interface TrendIndicatorProps {
    value: number;
    showSign?: boolean;
}

function TrendIndicator({ value, showSign = true }: TrendIndicatorProps) {
    const isPositive = value >= 0;
    const absValue = Math.abs(value).toFixed(1);
    
    return (
        <span className={cn(
            "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full border",
            isPositive 
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.05)]" 
                : "border-rose-500/30 text-rose-400 bg-rose-500/5 shadow-[0_0_12px_rgba(244,63,94,0.05)]"
        )}>
            {isPositive ? (
                <TrendingUp className="h-3 w-3" />
            ) : (
                <TrendingDown className="h-3 w-3" />
            )}
            <span>
                {showSign && isPositive ? "+" : ""}
                {absValue}%
            </span>
        </span>
    );
}

interface FunnelOverviewTabProps {
    data: any;
    isLoading: boolean;
    error?: string | null;
    onRetry?: () => void;
    companyFilter: "ALL" | "HIMWELLNESS" | "WEROCA";
    setCompanyFilter: (filter: "ALL" | "HIMWELLNESS" | "WEROCA") => void;
    startDate: string;
    setStartDate: (d: string) => void;
    endDate: string;
    setEndDate: (d: string) => void;
    activePreset: DatePreset;
    setActivePreset: (p: DatePreset) => void;
}

export function FunnelOverviewTab({
    data,
    isLoading,
    error,
    onRetry,
    companyFilter,
    setCompanyFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    activePreset,
    setActivePreset
}: FunnelOverviewTabProps) {
    const [dailyFunnelPlatform, setDailyFunnelPlatform] = React.useState<'ALL' | 'TIKTOK' | 'SHOPEE'>('ALL');

    if (!data) {
        if (error) {
            return (
                <div className="h-64 w-full flex flex-col items-center justify-center bg-card/20 backdrop-blur-md rounded-2xl border border-destructive/30 p-6 text-center gap-3">
                    <AlertCircle className="h-8 w-8 text-destructive animate-bounce" />
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">Failed to Load Analytics Data</p>
                        <p className="text-xs text-muted-foreground max-w-md">{error}</p>
                    </div>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                        </button>
                    )}
                </div>
            );
        }
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/80 dark:bg-muted/30 border border-border dark:border-border/50 p-3.5 rounded-xl backdrop-blur-sm">
                    <div className="h-8 w-64 bg-muted/60 animate-pulse rounded-lg" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 bg-muted/20 animate-pulse rounded-xl border border-border/30" />
                    ))}
                </div>
                <div className="h-64 bg-muted/20 animate-pulse rounded-xl border border-border/30 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                </div>
            </div>
        );
    }

    const generatedData = data;

    return (
        <div className="space-y-6">
            {/* Toolbar Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/80 dark:bg-muted/30 border border-border dark:border-border/50 p-3.5 rounded-xl backdrop-blur-sm select-none">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1 mr-1">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        Scope Company:
                    </span>
                    
                    {/* Switcher Controls */}
                    <div className="flex items-center gap-1 bg-muted/50 dark:bg-muted/60 border border-border dark:border-border/80 rounded-lg p-0.5">
                        <button
                            onClick={() => setCompanyFilter("ALL")}
                            className={cn(
                                "text-xs font-semibold px-3 py-1.5 rounded transition-all cursor-pointer",
                                companyFilter === "ALL"
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white"
                            )}
                        >
                            All Channels
                        </button>
                        <button
                            onClick={() => setCompanyFilter("HIMWELLNESS")}
                            className={cn(
                                "text-xs font-semibold px-3 py-1.5 rounded transition-all cursor-pointer",
                                companyFilter === "HIMWELLNESS"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                    : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white"
                            )}
                        >
                            HIMWELLNESS
                        </button>
                        <button
                            onClick={() => setCompanyFilter("WEROCA")}
                            className={cn(
                                "text-xs font-semibold px-3 py-1.5 rounded transition-all cursor-pointer",
                                companyFilter === "WEROCA"
                                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                                    : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white"
                            )}
                        >
                            WEROCA
                        </button>
                    </div>

                    <SimpleDatePicker
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        activePreset={activePreset}
                        onPresetChange={setActivePreset}
                    />
                </div>

                <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5 font-semibold text-xs px-3 py-1 self-end sm:self-auto rounded-md shadow-[0_0_12px_rgba(16,185,129,0.05)]">
                    🟢 Live Database Metrics
                </Badge>
            </div>

            {/* Omnichannel Funnel KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Total Sales GMV */}
                <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-border dark:hover:border-border transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Omnichannel Sales (GMV)</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="text-2xl font-bold flex items-baseline gap-2 text-foreground">
                            <span>RM {generatedData.gmv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <TrendIndicator value={generatedData.gmvWow} />
                            <span className="text-muted-foreground">vs Last Period</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium pt-1">
                            Calculated across {generatedData.orders.toLocaleString()} orders generated
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Total Spend */}
                <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-border dark:hover:border-border transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Marketing Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="text-2xl font-bold flex items-baseline gap-2 text-foreground">
                            <span>RM {generatedData.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <TrendIndicator value={generatedData.spendWow} />
                            <span className="text-muted-foreground">vs Last Period</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium pt-1">
                            Blended cost (bidding + digital SST & WHT)
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Blended Omni-ROAS */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 dark:to-indigo-950/5 backdrop-blur-sm relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider">Blended Omni-ROAS</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="text-2xl font-bold text-primary flex items-baseline gap-2">
                            <span>{(generatedData.gmv / Math.max(generatedData.spend, 1)).toFixed(2)}x</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <TrendIndicator value={generatedData.roasWow} />
                            <span className="text-primary/75">vs Last Period</span>
                        </div>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-300 font-medium pt-1">
                            True return index on overall spend
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Conversion Rate */}
                <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-border dark:hover:border-border transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blended Conv. Rate</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="text-2xl font-bold flex items-baseline gap-2 text-foreground">
                            <span>{generatedData.conversionRate.toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <TrendIndicator value={generatedData.convWow} />
                            <span className="text-muted-foreground">vs Last Period</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium pt-1">
                            Attributed from {generatedData.visitors.toLocaleString()} traffic clicks
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Omnichannel Area Trend & Channels Pie (Dynamically Imported) */}
            <FunnelCharts generatedData={generatedData} isLoading={isLoading} TrendIndicator={TrendIndicator} />

            {/* Daily Funnel View: Impression --> Clicked --> Total Order (With TikTok / Shopee Switcher) */}
            <Card className="border-border/50 bg-card/40 backdrop-blur-sm w-full">
                <CardHeader className="border-b border-border/30 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                            <Layers className="h-5 w-5 text-blue-500" />
                            Daily Funnel View (Impression → Clicked → Total Order)
                        </CardTitle>
                        <CardDescription>
                            Real database customer journey tracking ad impressions, user clicks, and completed orders.
                        </CardDescription>
                    </div>
                    {/* Platform Selector */}
                    <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-muted/80 border border-border rounded-lg p-1">
                        <button
                            onClick={() => setDailyFunnelPlatform("ALL")}
                            className={cn(
                                "text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer",
                                dailyFunnelPlatform === "ALL"
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            All Channels
                        </button>
                        <button
                            onClick={() => setDailyFunnelPlatform("TIKTOK")}
                            className={cn(
                                "text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer",
                                dailyFunnelPlatform === "TIKTOK"
                                    ? "bg-pink-600 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            🛒 TikTok Shop
                        </button>
                        <button
                            onClick={() => setDailyFunnelPlatform("SHOPEE")}
                            className={cn(
                                "text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer",
                                dailyFunnelPlatform === "SHOPEE"
                                    ? "bg-orange-600 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            🛍 Shopee
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {isLoading || !generatedData.dailyFunnel ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading real daily funnel metrics...
                        </div>
                    ) : (() => {
                        const dfList: any[] = generatedData.dailyFunnel || [];
                        const isTk = dailyFunnelPlatform === "TIKTOK";
                        const isSp = dailyFunnelPlatform === "SHOPEE";
                        const getRowImp = (d: any) => isTk ? (d.tiktok?.impressions || 0) : isSp ? (d.shopee?.impressions || 0) : (d.impressions || 0);
                        const getRowThruplay = (d: any) => isTk ? (d.tiktok?.thruplay || 0) : isSp ? (d.shopee?.thruplay || d.shopee?.impressions || 0) : (d.thruplay || 0);
                        const getRowClicks = (d: any) => isTk ? (d.tiktok?.clicks || 0) : isSp ? (d.shopee?.clicks || 0) : (d.clicks || 0);
                        const getRowOrders = (d: any) => isTk ? (d.tiktok?.orders || 0) : isSp ? (d.shopee?.orders || 0) : (d.orders || 0);

                        const maxImp = Math.max(...dfList.map(getRowImp), 1);

                        const totalImpressions = dfList.reduce((acc, d) => acc + getRowImp(d), 0);
                        const totalThruplay = dfList.reduce((acc, d) => acc + getRowThruplay(d), 0);
                        const totalClicks = dfList.reduce((acc, d) => acc + getRowClicks(d), 0);
                        const totalOrders = dfList.reduce((acc, d) => acc + getRowOrders(d), 0);
                        const blendedThruplayRate = totalImpressions > 0 ? ((totalThruplay / totalImpressions) * 100).toFixed(2) : "0.00";
                        const blendedClickRate = totalThruplay > 0 ? ((totalClicks / totalThruplay) * 100).toFixed(2) : (totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00");
                        const blendedCvr = totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(2) : "0.00";

                        return (
                            <div className="space-y-6">
                                {/* 4-Stage Summary Flow Cards */}
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {/* Stage 1: Impression */}
                                    <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 relative overflow-hidden flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                                                <Eye className="h-4 w-4" /> 1. Impressions
                                            </span>
                                            <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-[10px] px-1.5 py-0">
                                                {isTk ? "TikTok" : isSp ? "Shopee" : "All"}
                                            </Badge>
                                        </div>
                                        <div className="mt-2.5">
                                            <span className="text-xl font-black font-mono text-foreground">{totalImpressions.toLocaleString()}</span>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Total ad & product views
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stage 2: Thruplay */}
                                    <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 relative overflow-hidden flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                                                ▶️ 2. Thruplay (6s)
                                            </span>
                                            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                                Rate: {blendedThruplayRate}%
                                            </span>
                                        </div>
                                        <div className="mt-2.5">
                                            <span className="text-xl font-black font-mono text-foreground">{totalThruplay.toLocaleString()}</span>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Imp → Thruplay: <strong className="text-purple-400">{blendedThruplayRate}%</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stage 3: Anchor Click */}
                                    <div className="p-3.5 rounded-xl border border-pink-500/30 bg-pink-500/5 relative overflow-hidden flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold uppercase text-pink-400 tracking-wider flex items-center gap-1.5">
                                                <MousePointerClick className="h-4 w-4" /> 3. Anchor Clicks
                                            </span>
                                            <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                                                Rate: {blendedClickRate}%
                                            </span>
                                        </div>
                                        <div className="mt-2.5">
                                            <span className="text-xl font-black font-mono text-foreground">{totalClicks.toLocaleString()}</span>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Thruplay → Click: <strong className="text-pink-400">{blendedClickRate}%</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stage 4: Total Orders */}
                                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                                                <ShoppingBag className="h-4 w-4" /> 4. Total Orders
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                CVR: {blendedCvr}%
                                            </span>
                                        </div>
                                        <div className="mt-2.5">
                                            <span className="text-xl font-black font-mono text-foreground">{totalOrders.toLocaleString()}</span>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Click → Order: <strong className="text-emerald-400">{blendedCvr}%</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Daily Breakdown Table */}
                                <div className="border border-border/40 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="border-b border-border/30 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    <th className="py-3 px-3">Date</th>
                                                    <th className="py-3 px-3 text-right">👁 Impressions</th>
                                                    <th className="py-3 px-3 text-right">▶️ Thruplay (6s)</th>
                                                    <th className="py-3 px-3 text-right">🖱 Anchor Click</th>
                                                    <th className="py-3 px-3 text-right">🛍 Orders</th>
                                                    <th className="py-3 px-3 text-center">Thruplay %</th>
                                                    <th className="py-3 px-3 text-center">Click Rate %</th>
                                                    <th className="py-3 px-3 text-center">Order CVR %</th>
                                                    <th className="py-3 px-3 text-center">Yield %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dfList.map((row: any, idx: number) => {
                                                    const imp = getRowImp(row);
                                                    const thruplay = getRowThruplay(row);
                                                    const clicks = getRowClicks(row);
                                                    const orders = getRowOrders(row);

                                                    const thruplayRate = imp > 0 ? ((thruplay / imp) * 100).toFixed(2) : "0.00";
                                                    const clickRate = thruplay > 0 ? ((clicks / thruplay) * 100).toFixed(2) : (imp > 0 ? ((clicks / imp) * 100).toFixed(2) : "0.00");
                                                    const cvr = clicks > 0 ? ((orders / clicks) * 100).toFixed(2) : "0.00";
                                                    const overallCvr = imp > 0 ? ((orders / imp) * 100).toFixed(2) : "0.00";
                                                    const impWidth = Math.max(8, Math.round((imp / maxImp) * 100));

                                                    return (
                                                        <tr key={idx} className="border-b border-border/10 hover:bg-muted/15 transition-colors text-xs">
                                                            <td className="py-2.5 px-3 font-bold text-foreground font-mono whitespace-nowrap">
                                                                {row.date}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                <div className="flex flex-col items-end gap-0.5">
                                                                    <span className="font-mono font-semibold text-foreground">{imp.toLocaleString()}</span>
                                                                    <div className="w-16 bg-muted/40 h-1 rounded-full overflow-hidden">
                                                                        <div className={cn("h-full rounded-full", isTk ? "bg-pink-500" : isSp ? "bg-orange-500" : "bg-blue-500")} style={{ width: `${impWidth}%` }} />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-purple-400">
                                                                {thruplay.toLocaleString()}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground/90">
                                                                {clicks.toLocaleString()}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-foreground">
                                                                {orders.toLocaleString()}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <span className="inline-flex items-center text-[10px] font-extrabold font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                                                    {thruplayRate}%
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <span className="inline-flex items-center text-[10px] font-extrabold font-mono text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                                                                    {clickRate}%
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <span className="inline-flex items-center text-[10px] font-extrabold font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                                    {cvr}%
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <span className="text-[10px] font-bold font-mono text-indigo-400">
                                                                    {overallCvr}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </CardContent>
            </Card>

            {/* Platform Comparison Funnel Breakdown: TikTok Shop vs Shopee Real Database Data */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* 1. TikTok Shop Real Funnel */}
                <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
                    <CardHeader className="border-b border-border/30 pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                            <span className="text-lg">🛒</span> TikTok Shop Conversion Funnel
                        </CardTitle>
                        <CardDescription>
                            Real DB metrics sourced from credentials.daily_shop_metrics
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoading || !generatedData.platformFunnels ? (
                            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                                <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading TikTok funnel...
                            </div>
                        ) : (() => {
                            const tk = generatedData.platformFunnels.tiktok;
                            const stages = [
                                { label: "1. Impressions", value: tk.impressions, sub: "Total Views" },
                                { label: "2. Thruplay (6s)", value: tk.thruplay, sub: `Rate: ${tk.thruplayRate}%` },
                                { label: "3. Anchor Click", value: tk.clicks, sub: `Rate: ${tk.clickRate}%` },
                                { label: "4. Total Orders", value: tk.orders, sub: `CVR: ${tk.cvr}%` }
                            ];

                            return (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {stages.map((st, i) => (
                                            <div key={i} className="p-2.5 bg-muted/20 border border-border/40 rounded-xl">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase block">{st.label}</span>
                                                <span className="text-base font-black font-mono text-foreground block mt-1">{st.value.toLocaleString()}</span>
                                                <span className="text-[10px] font-bold text-pink-400 block mt-1">{st.sub}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-pink-500/5 border border-pink-500/20 rounded-xl flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Overall Funnel Yield (Imp → Order):</span>
                                        <span className="font-bold font-mono text-pink-400">{tk.overallCvr}%</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* 2. Shopee Real Funnel */}
                <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
                    <CardHeader className="border-b border-border/30 pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                            <span className="text-lg">🛍</span> Shopee Conversion Funnel
                        </CardTitle>
                        <CardDescription>
                            Real DB metrics sourced from credentials.daily_shopee_metrics
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoading || !generatedData.platformFunnels ? (
                            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                                <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading Shopee funnel...
                            </div>
                        ) : (() => {
                            const sp = generatedData.platformFunnels.shopee;
                            const stages = [
                                { label: "1. Ad Impressions", value: sp.impressions, sub: "Total Views" },
                                { label: "2. Thruplay", value: sp.thruplay, sub: "Rate: 100%" },
                                { label: "3. Ad Clicks", value: sp.clicks, sub: `Rate: ${sp.clickRate}%` },
                                { label: "4. Total Orders", value: sp.orders, sub: `CVR: ${sp.cvr}%` }
                            ];

                            return (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {stages.map((st, i) => (
                                            <div key={i} className="p-2.5 bg-muted/20 border border-border/40 rounded-xl">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase block">{st.label}</span>
                                                <span className="text-base font-black font-mono text-foreground block mt-1">{st.value.toLocaleString()}</span>
                                                <span className="text-[10px] font-bold text-orange-400 block mt-1">{st.sub}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Overall Funnel Yield (Imp → Order):</span>
                                        <span className="font-bold font-mono text-orange-400">{sp.overallCvr}%</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>

            {/* Individual Store Performance Breakdown Cards */}
            <Card className="border-border/50 bg-card/40 backdrop-blur-sm w-full">
                <CardHeader className="border-b border-border/30 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                            <Store className="h-5 w-5 text-indigo-400" />
                            Individual Store Funnel Breakdown
                        </CardTitle>
                        <CardDescription>
                            Real database 4-stage funnel metrics separated by individual TikTok Shop and Shopee stores.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading || !generatedData.shopFunnels ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading individual store funnels...
                        </div>
                    ) : (() => {
                        const shops: any[] = generatedData.shopFunnels || [];
                        if (shops.length === 0) {
                            return <div className="text-center py-6 text-muted-foreground text-sm">No store data found for selected period.</div>;
                        }

                        return (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {shops.map((shop: any, idx: number) => {
                                    const isTikTok = shop.platform === "TikTok Shop";
                                    return (
                                        <div key={idx} className="p-4 rounded-xl border border-border/50 bg-card/80 dark:bg-card/40 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-base">{isTikTok ? "🛒" : "🛍"}</span>
                                                    <span className="font-bold text-sm text-foreground truncate max-w-[150px] sm:max-w-[170px]" title={shop.shopName}>
                                                        {shop.shopName}
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className={cn("text-[10px] px-2 font-bold whitespace-nowrap", isTikTok ? "border-pink-500/30 text-pink-400 bg-pink-500/10" : "border-orange-500/30 text-orange-400 bg-orange-500/10")}>
                                                    {shop.platform}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/20">
                                                    <span className="text-[10px] text-muted-foreground block font-bold uppercase">GMV Sales</span>
                                                    <span className="font-mono font-black text-foreground text-sm block mt-0.5">RM {shop.gmv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/20">
                                                    <span className="text-[10px] text-muted-foreground block font-bold uppercase">Ad Spend</span>
                                                    <span className="font-mono font-bold text-foreground/80 text-sm block mt-0.5">RM {shop.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                                                <div className="p-1.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                                    <span className="text-[9px] text-blue-400 font-bold block uppercase">👁 Imp</span>
                                                    <span className="font-mono font-extrabold text-foreground block mt-0.5 text-xs">{shop.impressions.toLocaleString()}</span>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-purple-500/5 border border-purple-500/20">
                                                    <span className="text-[9px] text-purple-400 font-bold block uppercase">▶️ 6s</span>
                                                    <span className="font-mono font-extrabold text-foreground block mt-0.5 text-xs">{shop.thruplay.toLocaleString()}</span>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-pink-500/5 border border-pink-500/20">
                                                    <span className="text-[9px] text-pink-400 font-bold block uppercase">🖱 Click</span>
                                                    <span className="font-mono font-extrabold text-foreground block mt-0.5 text-xs">{shop.clicks.toLocaleString()}</span>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                                    <span className="text-[9px] text-emerald-400 font-bold block uppercase">🛍 Order</span>
                                                    <span className="font-mono font-extrabold text-foreground block mt-0.5 text-xs">{shop.orders.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-border/20 flex items-center justify-between text-[11px] font-mono">
                                                <span className="text-muted-foreground">Thruplay: <strong className="text-purple-400">{shop.thruplayRate}%</strong></span>
                                                <span className="text-muted-foreground">Click: <strong className="text-pink-400">{shop.clickRate}%</strong></span>
                                                <span className="text-muted-foreground">CVR: <strong className="text-emerald-400">{shop.cvr}%</strong></span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </CardContent>
            </Card>

            {/* Conversion Matrix Heatmap Scheduler */}
            <Card className="border-border/50 bg-card/40 backdrop-blur-sm w-full flex flex-col justify-between">
                <CardHeader className="border-b border-border/30 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Clock className="h-5 w-5 text-emerald-400" />
                            Conversion Matrix Heatmap Scheduler
                        </CardTitle>
                        <CardDescription>Identifies peak-performing hours and days of the week to maximize advertising bids and campaign performance.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 flex-1 flex flex-col justify-between">
                    {/* Map Heatmap Grid */}
                    <div className="space-y-4">
                        {/* Heatmap Legend */}
                        <div className="flex items-center justify-end gap-3 text-[10px] text-muted-foreground px-2">
                            <span>Low Conversion (0%-3%)</span>
                            <div className="h-3 w-24 bg-gradient-to-r from-card via-emerald-950 to-emerald-400 rounded-md border border-border" />
                            <span>Optimal Conversion (3%+)</span>
                        </div>

                        {/* Main Matrix */}
                        <div className="overflow-x-auto">
                            <div className="min-w-[500px] space-y-1">
                                {/* Days Headers */}
                                <div className="grid grid-cols-13 gap-1.5 text-center text-[10px] text-muted-foreground font-bold font-mono pb-2 border-b border-border/10">
                                    <div className="text-left pl-1">DAY</div>
                                    <div>00:00</div>
                                    <div>02:00</div>
                                    <div>04:00</div>
                                    <div>06:00</div>
                                    <div>08:00</div>
                                    <div>10:00</div>
                                    <div>12:00</div>
                                    <div>14:00</div>
                                    <div>16:00</div>
                                    <div>18:00</div>
                                    <div>20:00</div>
                                    <div>22:00</div>
                                </div>

                                {/* Heatmap Rows */}
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day: string) => {
                                    const dayBlocks = generatedData.heatmap.filter((b: any) => b.day === day);
                                    return (
                                        <div key={day} className="grid grid-cols-13 gap-1.5 items-center">
                                            {/* Day Label */}
                                            <div className="text-[10px] font-extrabold text-muted-foreground dark:text-muted-foreground uppercase font-mono">{day}</div>
                                            
                                            {/* Hour Blocks */}
                                            {dayBlocks.map((block: any, bIdx: number) => {
                                                const rate = block.conversion;
                                                const opacity = Math.min(rate / 8.0, 1.0);
                                                
                                                let blockBgClass = "bg-muted/50 dark:bg-muted/30";
                                                let borderClass = "border-border dark:border-border/80";
                                                let textClass = "text-muted-foreground dark:text-muted-foreground font-medium";
                                                let customStyle: React.CSSProperties = {};

                                                if (rate > 5) {
                                                    blockBgClass = "";
                                                    borderClass = "border-emerald-400/30 dark:border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.05)] dark:shadow-[0_0_8px_rgba(16,185,129,0.1)]";
                                                    textClass = "text-emerald-600 dark:text-emerald-300 font-extrabold";
                                                    customStyle = { backgroundColor: `rgba(16, 185, 129, ${opacity * 0.45})` };
                                                } else if (rate > 3) {
                                                    blockBgClass = "";
                                                    borderClass = "border-emerald-400/20 dark:border-emerald-600/20";
                                                    textClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
                                                    customStyle = { backgroundColor: `rgba(16, 185, 129, ${opacity * 0.25})` };
                                                }

                                                return (
                                                    <div 
                                                        key={bIdx}
                                                        style={customStyle}
                                                        className={cn(
                                                            "h-8 border rounded-md flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:border-primary/50 relative group",
                                                            blockBgClass,
                                                            borderClass
                                                        )}
                                                    >
                                                        <span className={cn("text-[9px] font-mono", textClass)}>
                                                            {rate.toFixed(1)}%
                                                        </span>
                                                        
                                                        {/* Tooltip Hover Overlay */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-32 p-2 bg-card border border-border text-[9px] rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 font-mono space-y-1">
                                                            <div className="font-extrabold text-foreground">{day} • {block.hour}</div>
                                                            <div className="flex justify-between">
                                                                <span>Conversion:</span>
                                                                <span className="font-bold text-emerald-400">{rate}%</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>YoY Growth:</span>
                                                                <span className={cn("font-bold", block.trend >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                                    {block.trend >= 0 ? "+" : ""}{block.trend}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mt-4 leading-normal">
                        * Recommended Bidding Slot: Schedule ad boosts between <strong>18:00 and 22:00</strong> on Friday, Saturday, and Sunday where average conversion peaks above <strong>5.5%</strong>.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default FunnelOverviewTab;
