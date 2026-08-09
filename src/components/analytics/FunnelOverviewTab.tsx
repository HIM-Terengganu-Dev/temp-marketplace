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
    RefreshCw 
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
    companyFilter,
    setCompanyFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    activePreset,
    setActivePreset
}: FunnelOverviewTabProps) {
    if (!data) {
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

            {/* TikTok Shop Conversion Funnel View */}
            <Card className="border-border/50 bg-card/40 backdrop-blur-sm w-full">
                <CardHeader className="border-b border-border/30 pb-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        TikTok Shop Conversion Funnel
                    </CardTitle>
                    <CardDescription>
                        Customer journey progression from initial impression to completed order.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading || !generatedData.funnelData ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading funnel metrics...
                        </div>
                    ) : (() => {
                        const fd = generatedData.funnelData;
                        const stages = [
                            { label: "Total Impression", value: fd.totalImpression, pct: 100, drop: 0 },
                            { label: "Visitors (Clicks)", value: fd.visitors, pct: (fd.visitors / fd.totalImpression) * 100, drop: (fd.visitors / fd.totalImpression) * 100 },
                            { label: "Product Impression", value: fd.productImpression, pct: (fd.productImpression / fd.totalImpression) * 100, drop: (fd.productImpression / fd.visitors) * 100 },
                            { label: "Product Click", value: fd.productClick, pct: (fd.productClick / fd.totalImpression) * 100, drop: (fd.productClick / fd.productImpression) * 100 },
                            { label: "Orders", value: fd.orders, pct: (fd.orders / fd.totalImpression) * 100, drop: (fd.orders / fd.productClick) * 100 }
                        ];

                        return (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-5">
                                    {stages.map((stage, idx) => (
                                        <div key={idx} className="relative flex flex-col justify-between p-4 bg-muted/20 dark:bg-muted/10 border border-border/50 rounded-xl hover:border-primary/30 transition-all">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">{stage.label}</span>
                                                <span className="text-xl font-extrabold text-foreground block mt-1 font-mono">{stage.value.toLocaleString()}</span>
                                            </div>
                                            <div className="mt-4 pt-2 border-t border-border/10 flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">Conv. Rate:</span>
                                                <span className="font-semibold text-primary">{stage.pct === 100 ? "100%" : `${stage.pct.toFixed(2)}%`}</span>
                                            </div>
                                            {idx > 0 && (
                                                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                                                    <span>Conversion step:</span>
                                                    <span className="font-medium text-emerald-400">{(stage.drop).toFixed(1)}%</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Visual Funnel Representation */}
                                <div className="space-y-3 pt-2">
                                    {stages.map((stage, idx) => {
                                        const maxWidth = 100;
                                        const minWidth = 10;
                                        const scaleWidth = idx === 0 
                                            ? maxWidth 
                                            : minWidth + (stage.pct * (maxWidth - minWidth) / 100);
                                        
                                        return (
                                            <div key={idx} className="flex items-center gap-4">
                                                <div className="w-36 text-xs font-semibold text-foreground/80 dark:text-foreground text-right truncate">
                                                    {stage.label}
                                                </div>
                                                <div className="flex-1 bg-muted/30 dark:bg-muted/10 h-7 rounded-lg overflow-hidden border border-border/10 flex items-center relative">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-primary/30 to-primary/80 transition-all duration-500 flex items-center pl-3"
                                                        style={{ width: `${scaleWidth}%` }}
                                                    >
                                                        <span className="text-[10px] font-bold text-white whitespace-nowrap drop-shadow-md">
                                                            {stage.value.toLocaleString()} ({stage.pct === 100 ? "100%" : `${stage.pct.toFixed(2)}%`})
                                                        </span>
                                                    </div>
                                                    {idx > 0 && (
                                                        <div className="absolute right-3 text-[10px] font-semibold text-emerald-400">
                                                            ↓ {(stage.drop).toFixed(1)}% Step Conversion
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
