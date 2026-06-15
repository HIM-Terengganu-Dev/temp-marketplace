"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
    BarChart3, 
    TrendingUp, 
    TrendingDown, 
    ArrowUpRight, 
    Users, 
    ShoppingBag, 
    DollarSign, 
    Tv, 
    Award, 
    Sparkles, 
    Clock, 
    Flame, 
    Activity, 
    Info,
    RefreshCw,
    Percent,
    AlertCircle,
    X,
    Filter,
    Target,
    Calendar,
    ArrowUp,
    ArrowDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleDatePicker, DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { cn } from "@/lib/utils";

/* ── helpers ────────────────────────────────────────────────────────────── */

/** Returns today's date string YYYY-MM-DD in Asia/Kuala_Lumpur timezone */
function todayKL(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

// Custom theme mapping for channels
const CHANNEL_COLORS: Record<string, string> = {
    "Livestream Commerce": "#3b82f6", // Blue
    "Short Video Ads": "#ec4899",   // Pink
    "Product Showcase": "#f97316",  // Orange
    "Creator Affiliates": "#10b981"  // Emerald
};

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

export default function AnalyticsPage() {
    const { data: session } = useSession();

    // Tab switcher state
    const [currentTab, setCurrentTab] = useState<"funnel" | "mtd">("funnel");

    // Toolbar / Date states (Funnel Overview)
    const [activePreset, setActivePreset] = useState<DatePreset>("last30");
    const [startDate, setStartDate] = useState("2026-04-26");
    const [endDate, setEndDate] = useState(todayKL());

    // Switcher filter states (Funnel Overview)
    const [companyFilter, setCompanyFilter] = useState<"ALL" | "HIMWELLNESS" | "WEROCA">("ALL");
    const [isLoading, setIsLoading] = useState(false);

    // Dynamic dataset state loaded from DB/API
    const [data, setData] = useState<any>(null);

    // MTD States
    const [targetMonth, setTargetMonth] = useState("2026-06");
    const [dayRangeEnd, setDayRangeEnd] = useState(10);
    const [monthlyTarget, setMonthlyTarget] = useState(4000000);
    const [mtdData, setMtdData] = useState<any>(null);
    const [isMtdLoading, setIsMtdLoading] = useState(false);

    // Load Funnel Overview Data
    useEffect(() => {
        let isMounted = true;
        const loadAnalyticsData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/analytics?startDate=${startDate}&endDate=${endDate}&companyFilter=${companyFilter}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch analytics data");
                }
                const result = await response.json();
                if (isMounted) {
                    setData(result);
                }
            } catch (error) {
                console.error("Error loading analytics data:", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadAnalyticsData();
        return () => {
            isMounted = false;
        };
    }, [startDate, endDate, companyFilter]);

    // Load MTD Data
    useEffect(() => {
        if (currentTab !== "mtd") return;
        let isMounted = true;
        const loadMtdData = async () => {
            setIsMtdLoading(true);
            try {
                const response = await fetch(`/api/analytics/mtd-report?targetMonth=${targetMonth}&dayRangeEnd=${dayRangeEnd}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch MTD report data");
                }
                const result = await response.json();
                if (isMounted) {
                    setMtdData(result);
                }
            } catch (error) {
                console.error("Error loading MTD report data:", error);
            } finally {
                if (isMounted) {
                    setIsMtdLoading(false);
                }
            }
        };

        loadMtdData();
        return () => {
            isMounted = false;
        };
    }, [currentTab, targetMonth, dayRangeEnd]);

    if (!data) {
        return (
            <div className="h-[70vh] w-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-4 border border-border/20 rounded-2xl bg-card/10 backdrop-blur-md">
                <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                <div className="flex flex-col items-center gap-1">
                    <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Loading High-Fidelity Analytics</p>
                    <p className="text-xs text-muted-foreground">Reading from attribution database & session logs...</p>
                </div>
            </div>
        );
    }

    const generatedData = data;

    return (
        <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header / Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-purple-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
                        <BarChart3 className="h-8 w-8 text-primary" />
                        Marketing Analytics Engine
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Consolidated Omnichannel simulations across sales funnel channels, host performance, and scheduling profiles.
                    </p>
                </div>
                
                {/* Tab switcher buttons in header */}
                <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-1">
                    <button
                        onClick={() => setCurrentTab("funnel")}
                        className={cn(
                            "text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                            currentTab === "funnel"
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Activity className="h-3.5 w-3.5" />
                        Funnel Overview
                    </button>
                    <button
                        onClick={() => setCurrentTab("mtd")}
                        className={cn(
                            "text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                            currentTab === "mtd"
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Target className="h-3.5 w-3.5" />
                        MTD Performance Report
                    </button>
                </div>
            </div>

            {currentTab === "funnel" ? (
                <>
                    {/* Toolbar Filters Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/40 border border-slate-700/30 p-3.5 rounded-xl backdrop-blur-sm select-none">
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1 mr-1">
                                <Filter className="h-3.5 w-3.5 text-slate-500" />
                                Scope Company:
                            </span>
                            
                            {/* Switcher Controls */}
                            <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800/80 rounded-lg p-0.5">
                                <button
                                    onClick={() => setCompanyFilter("ALL")}
                                    className={cn(
                                        "text-xs font-semibold px-3 py-1.5 rounded transition-all cursor-pointer",
                                        companyFilter === "ALL"
                                            ? "bg-primary text-white shadow-md shadow-primary/20"
                                            : "text-slate-400 hover:text-white"
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
                                            : "text-slate-400 hover:text-white"
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
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    WEROCA
                                </button>
                            </div>
                        </div>

                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-semibold text-xs px-3 py-1 self-end sm:self-auto rounded-md shadow-[0_0_12px_rgba(59,130,246,0.05)]">
                            ⚡ Mode: Simulation Sandbox Active
                        </Badge>
                    </div>

                    {/* Omnichannel Funnel KPI Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* 1. Total Sales GMV */}
                        <Card className="border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Omnichannel Sales (GMV)</CardTitle>
                                <ShoppingBag className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                            </CardHeader>
                            <CardContent className="space-y-1.5">
                                <div className="text-2xl font-bold flex items-baseline gap-2">
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
                        <Card className="border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Marketing Cost</CardTitle>
                                <DollarSign className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                            </CardHeader>
                            <CardContent className="space-y-1.5">
                                <div className="text-2xl font-bold flex items-baseline gap-2">
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
                        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-indigo-950/5 backdrop-blur-sm relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
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
                                <p className="text-[10px] text-indigo-300 font-medium pt-1">
                                    True return index on overall spend
                                </p>
                            </CardContent>
                        </Card>

                        {/* 4. Conversion Rate */}
                        <Card className="border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blended Conv. Rate</CardTitle>
                                <Percent className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                            </CardHeader>
                            <CardContent className="space-y-1.5">
                                <div className="text-2xl font-bold flex items-baseline gap-2">
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

                    {/* Omnichannel Area Trend & Channels Pie */}
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* 1. Area Trend Chart */}
                        <Card className="border-border/50 bg-card/40 backdrop-blur-sm md:col-span-2 flex flex-col justify-between">
                            <CardHeader className="border-b border-border/30 pb-4">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    Omnichannel Performance Over Time
                                </CardTitle>
                                <CardDescription>Visual comparison showing ad cost spend versus gross sales GMV trends.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1 h-[260px]">
                                {isLoading ? (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading trendlines...
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={generatedData.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "#111827",
                                                    borderColor: "#374151",
                                                    borderRadius: "8px",
                                                    color: "#fff",
                                                    fontSize: "11px"
                                                }}
                                                formatter={(val: any) => `RM ${Number(val).toLocaleString()}`}
                                            />
                                            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                            <Area type="monotone" dataKey="Revenue (GMV)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorGmv)" />
                                            <Area type="monotone" dataKey="Ad Spend" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. Source Attribution Share Donut */}
                        <Card className="border-border/50 bg-card/40 backdrop-blur-sm flex flex-col justify-between">
                            <CardHeader className="border-b border-border/30 pb-4">
                                <CardTitle className="text-base font-bold">Source Attribution Breakdown</CardTitle>
                                <CardDescription>Revenue contribution by channels.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1 flex flex-col items-center justify-center gap-6">
                                {isLoading ? (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading attribution...
                                    </div>
                                ) : (
                                    <>
                                        <div className="h-[150px] w-[150px] relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={generatedData.attributionData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={70}
                                                        paddingAngle={4}
                                                        dataKey="sales"
                                                    >
                                                        {generatedData.attributionData.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[entry.name] || "#334155"} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: "#111827",
                                                            borderColor: "#374151",
                                                            borderRadius: "8px",
                                                            color: "#fff",
                                                            fontSize: "11px"
                                                        }}
                                                        formatter={(value: any) => `RM ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                                                <span className="text-[9px] uppercase font-bold text-muted-foreground">Attr. GMV</span>
                                                <span className="text-sm font-extrabold text-foreground">RM {generatedData.gmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                        </div>
                                        <div className="w-full space-y-2">
                                            {generatedData.attributionData.map((item: any, idx: number) => {
                                                const pct = (item.sales / generatedData.gmv) * 100;
                                                return (
                                                    <div key={idx} className="flex items-center justify-between text-xs border-b border-border/10 pb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[item.name] }} />
                                                            <span className="text-slate-300 font-semibold">{item.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono text-slate-200">{pct.toFixed(0)}%</span>
                                                            <TrendIndicator value={item.trend} showSign={true} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

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
                                    <div className="h-3 w-24 bg-gradient-to-r from-slate-900 via-emerald-950 to-emerald-400 rounded-md border border-slate-700" />
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
                                                    <div className="text-[10px] font-extrabold text-slate-400 uppercase font-mono">{day}</div>
                                                    
                                                    {/* Hour Blocks */}
                                                    {dayBlocks.map((block: any, bIdx: number) => {
                                                        // HSL calculation for visual gradient intensity
                                                        const rate = block.conversion;
                                                        
                                                        // Max conversion simulation is around 8% - map this to gradient opacity
                                                        const opacity = Math.min(rate / 8.0, 1.0);
                                                        
                                                        let blockBg = "rgba(15, 23, 42, 0.6)"; // Dark Slate base
                                                        let borderClass = "border-slate-800/80";
                                                        let textClass = "text-slate-500";

                                                        if (rate > 5) {
                                                            blockBg = `rgba(16, 185, 129, ${opacity * 0.45})`; // Glowing Emerald
                                                            borderClass = "border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]";
                                                            textClass = "text-emerald-300 font-extrabold";
                                                        } else if (rate > 3) {
                                                            blockBg = `rgba(16, 185, 129, ${opacity * 0.25})`; // Mild Emerald
                                                            borderClass = "border-emerald-600/20";
                                                            textClass = "text-emerald-400 font-semibold";
                                                        }

                                                        return (
                                                            <div 
                                                                key={bIdx}
                                                                style={{ backgroundColor: blockBg }}
                                                                className={cn(
                                                                    "h-8 border rounded-md flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:border-primary/50 relative group",
                                                                    borderClass
                                                                )}
                                                            >
                                                                <span className={cn("text-[9px] font-mono", textClass)}>
                                                                    {rate.toFixed(1)}%
                                                                </span>
                                                                
                                                                {/* Tooltip Hover Overlay */}
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-32 p-2 bg-slate-950 border border-slate-800 text-[9px] rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 font-mono space-y-1">
                                                                    <div className="font-extrabold text-slate-300">{day} • {block.hour}</div>
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
                </>
            ) : (
                /* MTD Performance Report Content */
                <div className="space-y-6">
                    {/* Controls Row */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 border border-slate-700/30 p-4 rounded-xl backdrop-blur-sm select-none">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-slate-300">Target Month:</span>
                                <select
                                    value={targetMonth}
                                    onChange={(e) => setTargetMonth(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2 focus:ring-primary focus:border-primary cursor-pointer font-semibold"
                                >
                                    <option value="2025-12">DEC 2025</option>
                                    <option value="2026-01">JAN 2026</option>
                                    <option value="2026-02">FEB 2026</option>
                                    <option value="2026-03">MAC 2026</option>
                                    <option value="2026-04">APR 2026</option>
                                    <option value="2026-05">MEI 2026</option>
                                    <option value="2026-06">JUN 2026</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-300">Day Range End (1-31):</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={dayRangeEnd}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (val >= 1 && val <= 31) {
                                            setDayRangeEnd(val);
                                        }
                                    }}
                                    className="w-16 bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2 focus:ring-primary focus:border-primary text-center font-mono font-semibold"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-slate-300">Target (RM):</span>
                                <input
                                    type="number"
                                    step="100000"
                                    value={monthlyTarget}
                                    onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                                    className="w-36 bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2 focus:ring-primary focus:border-primary text-right font-mono font-semibold"
                                />
                            </div>
                        </div>

                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-semibold text-xs px-3 py-1 rounded-md shadow-[0_0_12px_rgba(59,130,246,0.05)]">
                            📊 Month-to-Date Report (Day 1 - {dayRangeEnd})
                        </Badge>
                    </div>

                    {isMtdLoading || !mtdData ? (
                        <div className="h-[50vh] w-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-4 border border-border/20 rounded-2xl bg-card/10 backdrop-blur-md">
                            <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Loading MTD Metrics</p>
                                <p className="text-xs text-muted-foreground">Aggregating daily store & Shopee transaction files...</p>
                            </div>
                        </div>
                    ) : (() => {
                        const actualSales = mtdData.currentMonthData?.total?.sales || 0;
                        const estDaily = monthlyTarget / 30;
                        const daysElapsed = dayRangeEnd;
                        const estCumulative = estDaily * daysElapsed;
                        const avgDaily = actualSales / daysElapsed;
                        const performancePct = estCumulative > 0 ? (actualSales / estCumulative) * 100 : 0;
                        const gap = actualSales - estCumulative;

                        return (
                            <div className="space-y-6">
                                {/* Road to Target KPI Grid */}
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {/* 1. Monthly Target */}
                                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Bulan</CardTitle>
                                            <Target className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            <div className="text-2xl font-bold flex items-baseline gap-2">
                                                <span>RM {monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Est. Daily: <span className="font-mono text-slate-300">RM {estDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium pt-1">
                                                Active target set for overall ecommerce pipeline
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* 2. Cumulative Target */}
                                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Cumulative Target</CardTitle>
                                            <Calendar className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            <div className="text-2xl font-bold flex items-baseline gap-2">
                                                <span>RM {estCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Days Elapsed: <span className="font-mono font-bold text-slate-300">{daysElapsed} Days</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium pt-1">
                                                Required target up to Day {daysElapsed}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* 3. Actual Performance */}
                                    <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-indigo-950/5 backdrop-blur-sm relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider">Actual MTD Sales</CardTitle>
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            <div className="text-2xl font-bold text-primary flex items-baseline gap-2">
                                                <span>RM {actualSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                                                Avg. Daily: <span className="font-mono">RM {avgDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <p className="text-[10px] text-indigo-300 font-medium pt-1 flex justify-between items-center">
                                                <span>Performance Index:</span>
                                                <span className="font-bold text-emerald-400">{performancePct.toFixed(1)}%</span>
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* 4. BTG Gap */}
                                    <Card className={cn(
                                        "backdrop-blur-sm relative overflow-hidden group transition-all duration-300 border",
                                        gap >= 0 ? "border-emerald-500/20 bg-emerald-950/5 hover:border-emerald-500/40" : "border-rose-500/20 bg-rose-950/5 hover:border-rose-500/40"
                                    )}>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className={cn("text-xs font-semibold uppercase tracking-wider", gap >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                BTG (Target Gap)
                                            </CardTitle>
                                            {gap >= 0 ? (
                                                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-rose-400" />
                                            )}
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            <div className={cn("text-2xl font-bold font-mono", gap >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                {gap >= 0 ? "+" : "-"}RM {Math.abs(gap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {gap >= 0 ? "Ahead of pace" : "Behind target pace"}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium pt-1">
                                                Actual Sales vs Cumulative Target
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Platform MTD Summary Table */}
                                <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
                                    <CardHeader className="border-b border-border/30 pb-4">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            Platform MTD Contribution
                                        </CardTitle>
                                        <CardDescription>
                                            Breakdown of aggregated sales, spend, and Return on Ad Spend (ROAS) for active platforms.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b border-border/30 bg-muted/20 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                        <th className="py-3 px-4">Platform Tab</th>
                                                        <th className="py-3 px-4 text-right">Actual Sales (GMV)</th>
                                                        <th className="py-3 px-4 text-right">Spent (Ad Cost)</th>
                                                        <th className="py-3 px-4 text-center">MTD ROAS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Shopee */}
                                                    <tr className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-slate-200">
                                                            Market Place (Shopee)
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-300">
                                                            RM {mtdData.currentMonthData?.shopee?.sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                                                            RM {mtdData.currentMonthData?.shopee?.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-400">
                                                            {mtdData.currentMonthData?.shopee?.roas.toFixed(2)}x
                                                        </td>
                                                    </tr>
                                                    {/* TikTok Shop */}
                                                    <tr className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-slate-200">
                                                            Ecommerce (TikTok Shop)
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-300">
                                                            RM {mtdData.currentMonthData?.tiktok?.sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                                                            RM {mtdData.currentMonthData?.tiktok?.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-400">
                                                            {mtdData.currentMonthData?.tiktok?.roas.toFixed(2)}x
                                                        </td>
                                                    </tr>
                                                    {/* Total */}
                                                    <tr className="border-b border-border/10 hover:bg-muted/10 transition-colors bg-primary/5">
                                                        <td className="py-3.5 px-4 font-extrabold text-primary">
                                                            Total
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">
                                                            RM {mtdData.currentMonthData?.total?.sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-300">
                                                            RM {mtdData.currentMonthData?.total?.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-primary">
                                                            {mtdData.currentMonthData?.total?.roas.toFixed(2)}x
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Ringkasan Bulanan (MTD Trend) Table and Recharts Bar Chart */}
                                <div className="grid gap-6 md:grid-cols-3">
                                    {/* Monthly Trend Table */}
                                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden md:col-span-2">
                                        <CardHeader className="border-b border-border/30 pb-4">
                                            <CardTitle className="text-base font-bold">Ringkasan Bulanan (MTD Trend)</CardTitle>
                                            <CardDescription>
                                                Comparison of Day 1 - Day {dayRangeEnd} aggregated performance across historical months.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-border/30 bg-muted/20 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                            <th className="py-3 px-4">Month</th>
                                                            <th className="py-3 px-4 text-right">Marketplace Sales (Shopee)</th>
                                                            <th className="py-3 px-4 text-right">Ecommerce Sales (TikTok)</th>
                                                            <th className="py-3 px-4 text-right">Total MTD Sales</th>
                                                            <th className="py-3 px-4 text-right">Total Spent</th>
                                                            <th className="py-3 px-4 text-center">ROAS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {mtdData.monthlyTrend.map((m: any, idx: number) => (
                                                            <tr key={idx} className={cn(
                                                                "border-b border-border/10 hover:bg-muted/10 transition-colors",
                                                                m.monthKey === targetMonth ? "bg-primary/5" : ""
                                                            )}>
                                                                <td className="py-3.5 px-4 font-bold text-slate-200">
                                                                    {m.monthLabel} {m.monthKey === targetMonth && "⭐"}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                                                                    RM {m.shopee.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                                                                    RM {m.tiktok.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                                                                    RM {m.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                                                                    RM {m.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-400">
                                                                    {m.roas.toFixed(2)}x
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Monthly Trend Visualizer Bar Chart */}
                                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm flex flex-col justify-between">
                                        <CardHeader className="border-b border-border/30 pb-4">
                                            <CardTitle className="text-base font-bold">Sales Visualizer (MTD)</CardTitle>
                                            <CardDescription>Visual comparison of total MTD sales up to Day {dayRangeEnd}.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-6 flex-1 h-[220px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={mtdData.monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                                    <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={9} tickLine={false} />
                                                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: "#111827",
                                                            borderColor: "#374151",
                                                            borderRadius: "8px",
                                                            color: "#fff",
                                                            fontSize: "11px"
                                                        }}
                                                        formatter={(val: any) => `RM ${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    />
                                                    <Bar dataKey="totalSales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Preceding Months Comparative Delta Tables */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                                        Active Month MoM Deltas
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Detailed comparison cards showing the active month performance changes against prior months (up to Day {dayRangeEnd}).
                                    </p>

                                    <div className="grid gap-6 md:grid-cols-2">
                                        {mtdData.comparisons.map((comp: any, cIdx: number) => {
                                            const renderDeltaRow = (label: string, activeVal: number, prevVal: number, deltaVal: number, deltaPctVal: number, isRoas = false) => {
                                                const isPositive = deltaVal >= 0;
                                                return (
                                                    <tr key={label} className="border-b border-border/5 hover:bg-muted/5 transition-colors">
                                                        <td className="py-2.5 px-3 font-medium text-slate-300 text-xs">{label}</td>
                                                        <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-200">
                                                            {isRoas ? `${activeVal.toFixed(2)}x` : `RM ${activeVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">
                                                            {isRoas ? `${prevVal.toFixed(2)}x` : `RM ${prevVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                        </td>
                                                        <td className={cn(
                                                            "py-2.5 px-3 text-right font-mono text-xs font-semibold",
                                                            isPositive ? "text-emerald-400" : "text-rose-400"
                                                        )}>
                                                            {isRoas ? (
                                                                `${isPositive ? "+" : ""}${deltaVal.toFixed(2)}`
                                                            ) : (
                                                                `${isPositive ? "+" : "-"}RM ${Math.abs(deltaVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                                                isPositive 
                                                                    ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" 
                                                                    : "border-rose-500/20 text-rose-400 bg-rose-500/5"
                                                            )}>
                                                                {isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                                                                {deltaPctVal.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            };

                                            return (
                                                <Card key={comp.comparisonMonth} className="border-border/40 bg-card/20 backdrop-blur-sm overflow-hidden">
                                                    <CardHeader className="bg-muted/10 border-b border-border/20 py-3 px-4">
                                                        <CardTitle className="text-sm font-bold text-slate-200 flex items-center justify-between">
                                                            <span>Active Month vs {comp.comparisonMonth}</span>
                                                            <Badge variant="outline" className="text-[10px] border-slate-700 font-normal">
                                                                MTD Day {dayRangeEnd} Comparison
                                                            </Badge>
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-0">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="border-b border-border/20 bg-muted/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                    <th className="py-2 px-3">Metric</th>
                                                                    <th className="py-2 px-3 text-right">Active</th>
                                                                    <th className="py-2 px-3 text-right">Previous</th>
                                                                    <th className="py-2 px-3 text-right">Delta</th>
                                                                    <th className="py-2 px-3 text-center">Delta %</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {renderDeltaRow("Shopee Sales", comp.shopee.active.sales, comp.shopee.prev.sales, comp.shopee.deltaSales, comp.shopee.deltaSalesPct)}
                                                                {renderDeltaRow("Shopee Spend", comp.shopee.active.spend, comp.shopee.prev.spend, comp.shopee.active.spend - comp.shopee.prev.spend, comp.shopee.prev.spend > 0 ? ((comp.shopee.active.spend - comp.shopee.prev.spend) / comp.shopee.prev.spend) * 100 : 0)}
                                                                {renderDeltaRow("Shopee ROAS", comp.shopee.active.roas, comp.shopee.prev.roas, comp.shopee.deltaRoas, comp.shopee.prev.roas > 0 ? (comp.shopee.deltaRoas / comp.shopee.prev.roas) * 100 : 0, true)}
                                                                
                                                                {renderDeltaRow("TikTok Sales", comp.tiktok.active.sales, comp.tiktok.prev.sales, comp.tiktok.deltaSales, comp.tiktok.deltaSalesPct)}
                                                                {renderDeltaRow("TikTok Spend", comp.tiktok.active.spend, comp.tiktok.prev.spend, comp.tiktok.active.spend - comp.tiktok.prev.spend, comp.tiktok.prev.spend > 0 ? ((comp.tiktok.active.spend - comp.tiktok.prev.spend) / comp.tiktok.prev.spend) * 100 : 0)}
                                                                {renderDeltaRow("TikTok ROAS", comp.tiktok.active.roas, comp.tiktok.prev.roas, comp.tiktok.deltaRoas, comp.tiktok.prev.roas > 0 ? (comp.tiktok.deltaRoas / comp.tiktok.prev.roas) * 100 : 0, true)}
                                                                
                                                                {renderDeltaRow("Total Sales", comp.total.active.sales, comp.total.prev.sales, comp.total.deltaSales, comp.total.deltaSalesPct)}
                                                                {renderDeltaRow("Total Spend", comp.total.active.spend, comp.total.prev.spend, comp.total.active.spend - comp.total.prev.spend, comp.total.prev.spend > 0 ? ((comp.total.active.spend - comp.total.prev.spend) / comp.total.prev.spend) * 100 : 0)}
                                                                {renderDeltaRow("Total ROAS", comp.total.active.roas, comp.total.prev.roas, comp.total.deltaRoas, comp.total.prev.roas > 0 ? (comp.total.deltaRoas / comp.total.prev.roas) * 100 : 0, true)}
                                                            </tbody>
                                                        </table>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            <p className="text-[11px] text-muted-foreground/80 mt-4 leading-normal">
                * Note: Simulated values are generated mathematically using high-fidelity seasonal baselines. 
                Database structures are configured to persist live transaction syncs.
            </p>
        </div>
    );
}
