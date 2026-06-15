"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
    ArrowDown,
    Save,
    MessageCircle,
    Download,
    CheckCircle2,
    Building2
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
    const [dayRangeEnd, setDayRangeEnd] = useState(() => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        return parseInt(today.split('-')[2], 10) || 10;
    });
    const [monthlyTarget, setMonthlyTarget] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mtd_monthly_target');
            return saved ? Number(saved) : 4000000;
        }
        return 4000000;
    });
    const [targetInput, setTargetInput] = useState<number | null>(null);
    const [targetSaved, setTargetSaved] = useState(false);
    const [mtdCompany, setMtdCompany] = useState<'ALL' | 'HIMWELLNESS' | 'WEROCA'>('ALL');
    const [mtdData, setMtdData] = useState<any>(null);
    const [isMtdLoading, setIsMtdLoading] = useState(false);
    // WhatsApp share modal
    const [showWaModal, setShowWaModal] = useState(false);
    const [waMetrics, setWaMetrics] = useState<Record<string, boolean>>({
        roadToTarget: true,
        platformTable: true,
        ringkasanTable: true,
        ringkasanChart: true,
        momLatest: true,
        momAll: false,
    });
    const [isGeneratingImg, setIsGeneratingImg] = useState(false);
    const mtdReportRef = useRef<HTMLDivElement>(null);

    // Derived: the displayed monthly target (use input override if being edited)
    const displayTarget = targetInput !== null ? targetInput : monthlyTarget;

    const handleSaveTarget = useCallback(() => {
        const val = targetInput !== null ? targetInput : monthlyTarget;
        setMonthlyTarget(val);
        setTargetInput(null);
        if (typeof window !== 'undefined') {
            localStorage.setItem('mtd_monthly_target', String(val));
        }
        setTargetSaved(true);
        setTimeout(() => setTargetSaved(false), 2000);
    }, [targetInput, monthlyTarget]);

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
                const response = await fetch(`/api/analytics/mtd-report?targetMonth=${targetMonth}&dayRangeEnd=${dayRangeEnd}&companyFilter=${mtdCompany}`);
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
    }, [currentTab, targetMonth, dayRangeEnd, mtdCompany]);

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
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-1">
                    <button
                        onClick={() => setCurrentTab("funnel")}
                        className={cn(
                            "text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                            currentTab === "funnel"
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-100/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/30 p-3.5 rounded-xl backdrop-blur-sm select-none">
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1 mr-1">
                                <Filter className="h-3.5 w-3.5 text-slate-500" />
                                Scope Company:
                            </span>
                            
                            {/* Switcher Controls */}
                            <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-0.5">
                                <button
                                    onClick={() => setCompanyFilter("ALL")}
                                    className={cn(
                                        "text-xs font-semibold px-3 py-1.5 rounded transition-all cursor-pointer",
                                        companyFilter === "ALL"
                                            ? "bg-primary text-white shadow-md shadow-primary/20"
                                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
                                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
                                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
                        <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Omnichannel Sales (GMV)</CardTitle>
                                <ShoppingBag className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
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
                        <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Marketing Cost</CardTitle>
                                <DollarSign className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
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
                        <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blended Conv. Rate</CardTitle>
                                <Percent className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
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

                    {/* Omnichannel Area Trend & Channels Pie */}
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* 1. Area Trend Chart */}
                        <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm md:col-span-2 flex flex-col justify-between">
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
                        <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm flex flex-col justify-between">
                            <CardHeader className="border-b border-border/30 pb-4">
                                <CardTitle className="text-base font-bold text-foreground">Source Attribution Breakdown</CardTitle>
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
                                                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono text-slate-800 dark:text-slate-200">{pct.toFixed(0)}%</span>
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
                                                    <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase font-mono">{day}</div>
                                                    
                                                    {/* Hour Blocks */}
                                                    {dayBlocks.map((block: any, bIdx: number) => {
                                                        // HSL calculation for visual gradient intensity
                                                        const rate = block.conversion;
                                                        
                                                        // Max conversion simulation is around 8% - map this to gradient opacity
                                                        const opacity = Math.min(rate / 8.0, 1.0);
                                                        
                                                        let blockBgClass = "bg-slate-100 dark:bg-slate-900/60"; // Adaptive theme base
                                                        let borderClass = "border-slate-200 dark:border-slate-800/80";
                                                        let textClass = "text-slate-450 dark:text-slate-500 font-medium";
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
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/30 p-4 rounded-xl backdrop-blur-sm select-none">
                        <div className="flex flex-wrap items-center gap-3">

                            {/* Month Selector */}
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Month:</span>
                                <select
                                    value={targetMonth}
                                    onChange={(e) => setTargetMonth(e.target.value)}
                                    className="bg-card dark:bg-slate-950 border border-border dark:border-slate-800 text-foreground text-sm rounded-lg p-2 focus:ring-primary focus:border-primary cursor-pointer font-semibold"
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

                            {/* Day Range */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Day 1 –</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={dayRangeEnd}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (val >= 1 && val <= 31) setDayRangeEnd(val);
                                    }}
                                    className="w-14 bg-card dark:bg-slate-950 border border-border dark:border-slate-800 text-foreground text-sm rounded-lg p-2 focus:ring-primary focus:border-primary text-center font-mono font-semibold"
                                />
                            </div>

                            {/* Target Input + Save */}
                            <div className="flex items-center gap-1.5">
                                <Target className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target:</span>
                                <input
                                    type="number"
                                    step="100000"
                                    value={targetInput !== null ? targetInput : monthlyTarget}
                                    onChange={(e) => setTargetInput(Number(e.target.value))}
                                    className="w-32 bg-card dark:bg-slate-950 border border-border dark:border-slate-800 text-foreground text-sm rounded-lg p-2 focus:ring-primary focus:border-primary text-right font-mono font-semibold"
                                />
                                <button
                                    onClick={handleSaveTarget}
                                    className={cn(
                                        "flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer border",
                                        targetSaved
                                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                            : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                    )}
                                >
                                    {targetSaved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                                    {targetSaved ? "Saved!" : "Save"}
                                </button>
                            </div>

                            {/* Company Stream Filter */}
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Stream:</span>
                                <div className="flex items-center bg-slate-200/50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    {([['ALL', 'All'], ['HIMWELLNESS', 'HIM'], ['WEROCA', 'Weroca']] as const).map(([val, label]) => (
                                        <button
                                            key={val}
                                            onClick={() => setMtdCompany(val)}
                                            className={cn(
                                                "text-xs font-bold px-3 py-2 transition-all cursor-pointer",
                                                mtdCompany === val
                                                    ? "bg-primary text-white"
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right side: badge + WhatsApp button */}
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-semibold text-xs px-3 py-1 rounded-md">
                                📊 MTD Day 1 – {dayRangeEnd}
                            </Badge>
                            <button
                                onClick={() => setShowWaModal(true)}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-all cursor-pointer"
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp
                            </button>
                        </div>
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
                            <div className="space-y-6" ref={mtdReportRef}>
                                {/* Road to Target KPI Grid */}
                                <div id="mtd-road-to-target" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {/* 1. Monthly Target */}
                                    <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Bulan</CardTitle>
                                            <Target className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            <div className="text-2xl font-bold flex items-baseline gap-2 text-foreground">
                                                <span>RM {monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Est. Daily: <span className="font-mono text-slate-700 dark:text-slate-300">RM {estDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium pt-1">
                                                Active target set for overall ecommerce pipeline
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* 2. Cumulative Target */}
                                    <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Cumulative Target</CardTitle>
                                            <Calendar className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            <div className="text-2xl font-bold flex items-baseline gap-2 text-foreground">
                                                <span>RM {estCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Days Elapsed: <span className="font-mono font-bold text-slate-800 dark:text-slate-300">{daysElapsed} Days</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium pt-1">
                                                Required target up to Day {daysElapsed}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* 3. Actual Performance */}
                                    <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 dark:to-indigo-950/5 backdrop-blur-sm relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider">Actual MTD Sales</CardTitle>
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            <div className="text-2xl font-bold text-primary flex items-baseline gap-2">
                                                <span>RM {actualSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="text-xs text-indigo-600 dark:text-indigo-300 font-semibold flex items-center gap-1">
                                                Avg. Daily: <span className="font-mono">RM {avgDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <p className="text-[10px] text-indigo-600 dark:text-indigo-300 font-medium pt-1 flex justify-between items-center">
                                                <span>Performance Index:</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{performancePct.toFixed(1)}%</span>
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* 4. BTG Gap */}
                                    <Card className={cn(
                                        "backdrop-blur-sm relative overflow-hidden group transition-all duration-300 border",
                                        gap >= 0 ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/5 hover:border-emerald-500/40" : "border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/5 hover:border-rose-500/40"
                                    )}>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className={cn("text-xs font-semibold uppercase tracking-wider", gap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                                BTG (Target Gap)
                                            </CardTitle>
                                            {gap >= 0 ? (
                                                <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                            )}
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            <div className={cn("text-2xl font-bold font-mono", gap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
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

                                {/* Platform MTD Summary Table — TikTok FIRST */}
                                <Card id="mtd-platform-table" className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm overflow-hidden">
                                    <CardHeader className="border-b border-border/30 pb-4">
                                        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                                            Platform MTD Contribution
                                        </CardTitle>
                                        <CardDescription>
                                            Breakdown of aggregated sales, spend, and ROAS for active platforms (Day 1–{dayRangeEnd}).
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b border-border/30 bg-muted/20 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                        <th className="py-3 px-4">Platform</th>
                                                        <th className="py-3 px-4 text-right">Actual Sales (GMV)</th>
                                                        <th className="py-3 px-4 text-right">Spent (Ad Cost)</th>
                                                        <th className="py-3 px-4 text-center">MTD ROAS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* TikTok Shop — FIRST */}
                                                    <tr className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                                                            <span className="inline-flex items-center gap-2">
                                                                <span className="text-base">🛒</span> Ecommerce (TikTok Shop)
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                            RM {(mtdData.currentMonthData?.tiktok?.sales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                                            RM {(mtdData.currentMonthData?.tiktok?.spend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-bold text-pink-600 dark:text-pink-400">
                                                            {(mtdData.currentMonthData?.tiktok?.roas ?? 0).toFixed(2)}x
                                                        </td>
                                                    </tr>
                                                    {/* Shopee — SECOND */}
                                                    <tr className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                                                            <span className="inline-flex items-center gap-2">
                                                                <span className="text-base">🛍</span> Market Place (Shopee)
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                            RM {(mtdData.currentMonthData?.shopee?.sales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                                            RM {(mtdData.currentMonthData?.shopee?.spend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-bold text-orange-600 dark:text-orange-400">
                                                            {(mtdData.currentMonthData?.shopee?.roas ?? 0).toFixed(2)}x
                                                        </td>
                                                    </tr>
                                                    {/* Total */}
                                                    <tr className="border-b border-border/10 hover:bg-muted/10 transition-colors bg-primary/5">
                                                        <td className="py-3.5 px-4 font-extrabold text-primary">Total</td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">
                                                            RM {(mtdData.currentMonthData?.total?.sales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                            RM {(mtdData.currentMonthData?.total?.spend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-primary">
                                                            {(mtdData.currentMonthData?.total?.roas ?? 0).toFixed(2)}x
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Ringkasan Bulanan — TikTok column FIRST */}
                                <div id="mtd-ringkasan" className="grid gap-6 md:grid-cols-3">
                                    <Card id="mtd-ringkasan-table" className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm overflow-hidden md:col-span-2">
                                        <CardHeader className="border-b border-border/30 pb-4">
                                            <CardTitle className="text-base font-bold text-foreground">Ringkasan Bulanan (MTD Trend)</CardTitle>
                                            <CardDescription>
                                                Comparison of Day 1 – Day {dayRangeEnd} aggregated performance across historical months.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-border/30 bg-muted/20 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                            <th className="py-3 px-4">Month</th>
                                                            <th className="py-3 px-4 text-right">🛒 TikTok Sales</th>
                                                            <th className="py-3 px-4 text-right">🛍 Shopee Sales</th>
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
                                                                <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                                                                    {m.monthLabel} {m.monthKey === targetMonth && "⭐"}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-right font-mono text-pink-600 dark:text-pink-300">
                                                                    RM {m.tiktok.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-right font-mono text-orange-600 dark:text-orange-300">
                                                                    RM {m.shopee.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                                                    RM {m.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                                                    RM {m.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                                                                    {m.roas.toFixed(2)}x
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Bar Chart */}
                                    <Card id="mtd-ringkasan-chart" className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm flex flex-col justify-between">
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
                                                    <Bar dataKey="tiktok.sales" name="TikTok" fill="#ec4899" radius={[3, 3, 0, 0]} stackId="a" />
                                                    <Bar dataKey="shopee.sales" name="Shopee" fill="#f97316" radius={[3, 3, 0, 0]} stackId="a" />
                                                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Active Month MoM Deltas — Split TikTok + Shopee cards */}
                                <div id="mtd-mom-deltas" className="space-y-4">
                                    <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                                        Active Month MoM Deltas
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Platform-specific comparison cards vs prior months (MTD Day 1–{dayRangeEnd}). TikTok Shop first.
                                    </p>

                                    <div className="space-y-6">
                                        {mtdData.comparisons.map((comp: any, cIdx: number) => {
                                            const renderPlatformCard = (
                                                platform: 'tiktok' | 'shopee',
                                                label: string,
                                                emoji: string,
                                                accentClass: string,
                                                borderClass: string,
                                                bgClass: string
                                            ) => {
                                                const d = comp[platform];
                                                const salesDelta = d.deltaSales;
                                                const salesPct = d.deltaSalesPct;
                                                const spendDelta = d.active.spend - d.prev.spend;
                                                const spendPct = d.prev.spend > 0 ? (spendDelta / d.prev.spend) * 100 : 0;
                                                const roasDelta = d.deltaRoas;
                                                const roasPct = d.prev.roas > 0 ? (roasDelta / d.prev.roas) * 100 : 0;

                                                const DeltaBadge = ({ delta, pct, isRoas = false }: { delta: number; pct: number; isRoas?: boolean }) => (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span className={cn("font-mono text-xs font-bold", delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                                            {isRoas
                                                                ? `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`
                                                                : `${delta >= 0 ? '+' : '-'}RM ${Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                                            }
                                                        </span>
                                                        <span className={cn(
                                                            "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                                            delta >= 0 ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5" : "border-rose-500/20 text-rose-600 dark:text-rose-400 bg-rose-500/5"
                                                        )}>
                                                            {delta >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                                                            {Math.abs(pct).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                );

                                                return (
                                                    <Card className={cn("border overflow-hidden flex-1 min-w-0 bg-card dark:bg-card/40", borderClass, bgClass)}>
                                                        <CardHeader className="pb-3 px-4 pt-4">
                                                            <CardTitle className={cn("text-sm font-bold flex items-center gap-2", accentClass)}>
                                                                <span className="text-lg">{emoji}</span> {label}
                                                                <Badge variant="outline" className="ml-auto text-[9px] border-slate-200 dark:border-slate-700 font-normal text-slate-500 dark:text-slate-400">
                                                                    vs {comp.comparisonMonth}
                                                                </Badge>
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-0">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="border-b border-border/20 bg-muted/5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                        <th className="py-2 px-4">Metric</th>
                                                                        <th className="py-2 px-4 text-right">Active</th>
                                                                        <th className="py-2 px-4 text-right">Prev</th>
                                                                        <th className="py-2 px-4 text-right">Δ Change</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr className="border-b border-border/5 hover:bg-muted/5">
                                                                        <td className="py-2.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">Sales</td>
                                                                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">RM {d.active.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-500 dark:text-slate-400">RM {d.prev.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                                        <td className="py-2.5 px-4"><DeltaBadge delta={salesDelta} pct={salesPct} /></td>
                                                                    </tr>
                                                                    <tr className="border-b border-border/5 hover:bg-muted/5">
                                                                        <td className="py-2.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">Spend</td>
                                                                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-800 dark:text-slate-200">RM {d.active.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-500 dark:text-slate-400">RM {d.prev.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                                        <td className="py-2.5 px-4"><DeltaBadge delta={spendDelta} pct={spendPct} /></td>
                                                                    </tr>
                                                                    <tr className="hover:bg-muted/5">
                                                                        <td className="py-2.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">ROAS</td>
                                                                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">{d.active.roas.toFixed(2)}x</td>
                                                                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-500 dark:text-slate-400">{d.prev.roas.toFixed(2)}x</td>
                                                                        <td className="py-2.5 px-4"><DeltaBadge delta={roasDelta} pct={roasPct} isRoas /></td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            };

                                            return (
                                                <div key={cIdx} id={cIdx === mtdData.comparisons.length - 1 ? "mtd-mom-latest" : undefined} className="space-y-2">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                                                        Active vs {comp.comparisonMonth} — Day {dayRangeEnd}
                                                    </p>
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        {renderPlatformCard('tiktok', 'TikTok Shop', '🛒', 'text-pink-600 dark:text-pink-400', 'border-pink-500/20', 'bg-pink-500/5 dark:bg-pink-950/5')}
                                                        {renderPlatformCard('shopee', 'Shopee Market Place', '🛍', 'text-orange-600 dark:text-orange-400', 'border-orange-500/20', 'bg-orange-500/5 dark:bg-orange-950/5')}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* WhatsApp Share Modal */}
                    {showWaModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowWaModal(false)}>
                            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setShowWaModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
                                    <X className="h-5 w-5" />
                                </button>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                                        <MessageCircle className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Share via WhatsApp</h3>
                                        <p className="text-xs text-slate-400">Each section downloads as a separate polished image</p>
                                    </div>
                                </div>

                                <div className="space-y-2.5 mb-6 max-h-[260px] overflow-y-auto pr-1">
                                    {([
                                        ['roadToTarget',   '🎯 Road to Target KPIs',       'Target, Cumulative, Actual Sales, BTG Gap'],
                                        ['platformTable',  '📊 Platform MTD Contribution',  'TikTok & Shopee sales, spend, ROAS'],
                                        ['ringkasanTable', '📅 Ringkasan Bulanan Table',    'Historical month-over-month sales table'],
                                        ['ringkasanChart', '📊 Sales Visualizer Chart',    'Visual comparison of total MTD sales'],
                                        ['momLatest',      '📈 MoM Delta (Latest Month)',   'TikTok & Shopee vs latest prior month'],
                                        ['momAll',         '📈 All MoM Deltas (Full Grid)', 'All historical comparison cards'],
                                    ] as const).map(([key, title, desc]) => (
                                        <label key={key} className="flex items-start gap-3 p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 cursor-pointer transition-colors bg-slate-800/30">
                                            <input
                                                type="checkbox"
                                                checked={waMetrics[key] ?? false}
                                                onChange={(e) => setWaMetrics(prev => ({ ...prev, [key]: e.target.checked }))}
                                                className="mt-0.5 h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-200">{title}</p>
                                                <p className="text-[11px] text-slate-400">{desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {/* Progress bar */}
                                {isGeneratingImg && (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs text-slate-400 font-semibold">Generating images…</span>
                                            <RefreshCw className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full animate-pulse w-3/4" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1.5">Do not close this window…</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={async () => {
                                            setIsGeneratingImg(true);
                                            try {
                                                const { toPng } = await import('html-to-image');

                                                // Wait for fonts to finish loading so text doesn't render in fallback fonts
                                                await document.fonts.ready;

                                                // Section definitions — label, DOM id, checkbox key
                                                const sectionDefs = [
                                                    { label: '🎯 Road to Target KPIs',      id: 'mtd-road-to-target',   key: 'roadToTarget'   },
                                                    { label: '📊 Platform MTD Contribution', id: 'mtd-platform-table',  key: 'platformTable'  },
                                                    { label: '📅 Ringkasan Bulanan Table',   id: 'mtd-ringkasan-table',  key: 'ringkasanTable' },
                                                    { label: '📊 Sales Visualizer Chart',    id: 'mtd-ringkasan-chart',  key: 'ringkasanChart' },
                                                    { label: '📈 MoM Delta (Latest Month)',   id: 'mtd-mom-latest',       key: 'momLatest'      },
                                                    { label: '📈 All MoM Deltas (Full Grid)', id: 'mtd-mom-deltas',       key: 'momAll'         },
                                                ] as const;

                                                const selected = sectionDefs.filter(s => waMetrics[s.key]);
                                                if (selected.length === 0) return;

                                                const dateLabel = `${targetMonth} · Day 1–${dayRangeEnd}`;
                                                const streamLabel = mtdCompany === 'ALL' ? 'All Streams' : mtdCompany === 'HIMWELLNESS' ? 'HIM Wellness' : 'Weroca';

                                                let partNum = 1;
                                                for (const sec of selected) {
                                                    const el = document.getElementById(sec.id);
                                                    if (!el) continue;

                                                    // --- Render live element + canvas stitching ---
                                                    // 1. Capture the element's actual PNG image
                                                    const contentDataUrl = await toPng(el, {
                                                        quality: 0.98,
                                                        pixelRatio: 2,
                                                        backgroundColor: '#0b1120',
                                                    });

                                                    // 2. Load it as an Image
                                                    const contentImg = new Image();
                                                    contentImg.src = contentDataUrl;
                                                    await new Promise((resolve, reject) => {
                                                        contentImg.onload = resolve;
                                                        contentImg.onerror = reject;
                                                    });

                                                    // 3. Create canvas
                                                    const canvas = document.createElement('canvas');
                                                    const scale = 2; // matching pixelRatio
                                                    const headerHeight = 64 * scale;
                                                    const footerHeight = 36 * scale;
                                                    
                                                    canvas.width = contentImg.width;
                                                    canvas.height = contentImg.height + headerHeight + footerHeight;

                                                    const ctx = canvas.getContext('2d');
                                                    if (!ctx) throw new Error('Could not get 2D context');

                                                    // 4. Fill background (slate-950 color: #0b1120)
                                                    ctx.fillStyle = '#0b1120';
                                                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                                                    // 5. Draw Header background (linear gradient)
                                                    const gradient = ctx.createLinearGradient(0, 0, canvas.width, headerHeight);
                                                    gradient.addColorStop(0, '#1e1b4b'); // deep indigo-950
                                                    gradient.addColorStop(1, '#0f172a'); // slate-900
                                                    ctx.fillStyle = gradient;
                                                    ctx.fillRect(0, 0, canvas.width, headerHeight);

                                                    // Draw header bottom border
                                                    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)'; // indigo border
                                                    ctx.lineWidth = 1 * scale;
                                                    ctx.beginPath();
                                                    ctx.moveTo(0, headerHeight);
                                                    ctx.lineTo(canvas.width, headerHeight);
                                                    ctx.stroke();

                                                    // 6. Draw Header text
                                                    const paddingX = 24 * scale;

                                                    // Small category label
                                                    ctx.fillStyle = '#a5b4fc'; // indigo-300
                                                    ctx.font = `bold ${10 * scale}px Inter, system-ui, -apple-system, sans-serif`;
                                                    ctx.fillText('HIM ANALYTICS · MTD REPORT', paddingX, 22 * scale);

                                                    // Main section title
                                                    ctx.fillStyle = '#ffffff';
                                                    ctx.font = `bold ${17 * scale}px Inter, system-ui, -apple-system, sans-serif`;
                                                    ctx.fillText(sec.label, paddingX, 44 * scale);

                                                    // Right-aligned header metadata
                                                    ctx.textAlign = 'right';
                                                    
                                                    // Date Label
                                                    ctx.fillStyle = '#6366f1'; // indigo-500
                                                    ctx.font = `bold ${11 * scale}px Inter, system-ui, -apple-system, sans-serif`;
                                                    ctx.fillText(dateLabel, canvas.width - paddingX, 24 * scale);

                                                    // Stream Label & Part Number
                                                    ctx.fillStyle = '#94a3b8'; // slate-400
                                                    ctx.font = `${10 * scale}px Inter, system-ui, -apple-system, sans-serif`;
                                                    ctx.fillText(`${streamLabel} · Part ${partNum} of ${selected.length}`, canvas.width - paddingX, 42 * scale);

                                                    // Reset alignment
                                                    ctx.textAlign = 'left';

                                                    // 7. Draw Content Image
                                                    ctx.drawImage(contentImg, 0, headerHeight);

                                                    // 8. Draw Footer background
                                                    ctx.fillStyle = '#0b1120';
                                                    ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight);

                                                    // Draw footer top border
                                                    ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
                                                    ctx.lineWidth = 1 * scale;
                                                    ctx.beginPath();
                                                    ctx.moveTo(0, canvas.height - footerHeight);
                                                    ctx.lineTo(canvas.width, canvas.height - footerHeight);
                                                    ctx.stroke();

                                                    // Draw footer text
                                                    ctx.fillStyle = '#475569'; // slate-600
                                                    ctx.font = `${9 * scale}px Inter, system-ui, -apple-system, sans-serif`;
                                                    ctx.fillText('Generated from HIM Analytics Dashboard', paddingX, canvas.height - 14 * scale);

                                                    // Right-aligned timestamp
                                                    ctx.textAlign = 'right';
                                                    const timeStr = new Date().toLocaleString('en-MY', {
                                                        timeZone: 'Asia/Kuala_Lumpur',
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short'
                                                    });
                                                    ctx.fillText(timeStr, canvas.width - paddingX, canvas.height - 14 * scale);

                                                    const finalDataUrl = canvas.toDataURL('image/png');

                                                    const link = document.createElement('a');
                                                    link.download = `mtd-${sec.id}-part${partNum}-${targetMonth}.png`;
                                                    link.href = finalDataUrl;
                                                    link.click();

                                                    // Stagger downloads so browser doesn't block them
                                                    await new Promise(r => setTimeout(r, 400));
                                                    partNum++;
                                                }

                                                // Build WA text summary
                                                const lines: string[] = [
                                                    `📊 *MTD Performance Report*`,
                                                    `📅 ${dateLabel} · ${streamLabel}`,
                                                    ``
                                                ];
                                                if (waMetrics.roadToTarget) {
                                                    const actualSalesWa = mtdData.currentMonthData?.total?.sales || 0;
                                                    const gapWa = actualSalesWa - (monthlyTarget / 30 * dayRangeEnd);
                                                    lines.push(`🎯 *Road to Target*`);
                                                    lines.push(`Target: RM ${monthlyTarget.toLocaleString()}`);
                                                    lines.push(`Actual: RM ${actualSalesWa.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
                                                    lines.push(`Gap: ${gapWa >= 0 ? '+' : '-'}RM ${Math.abs(gapWa).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
                                                    lines.push(``);
                                                }
                                                if (waMetrics.platformTable) {
                                                    lines.push(`📊 *Platform Breakdown*`);
                                                    lines.push(`🛒 TikTok: RM ${(mtdData.currentMonthData?.tiktok?.sales ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} (ROAS: ${(mtdData.currentMonthData?.tiktok?.roas ?? 0).toFixed(2)}x)`);
                                                    lines.push(`🛍 Shopee: RM ${(mtdData.currentMonthData?.shopee?.sales ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} (ROAS: ${(mtdData.currentMonthData?.shopee?.roas ?? 0).toFixed(2)}x)`);
                                                    lines.push(`💰 Total: RM ${(mtdData.currentMonthData?.total?.sales ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
                                                    lines.push(``);
                                                }
                                                lines.push(`_${selected.length} image${selected.length > 1 ? 's' : ''} downloaded — attach above to this message_`);
                                                lines.push(`_Generated from HIM Analytics Dashboard_`);
                                                const waText = encodeURIComponent(lines.join('\n'));

                                                setTimeout(() => {
                                                    window.open(`https://wa.me/?text=${waText}`, '_blank');
                                                }, 600);

                                                setShowWaModal(false);
                                            } catch (err) {
                                                console.error('Image generation error:', err);
                                            } finally {
                                                setIsGeneratingImg(false);
                                            }
                                        }}
                                        disabled={isGeneratingImg || !Object.values(waMetrics).some(Boolean)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-2.5 rounded-xl transition-colors cursor-pointer"
                                    >
                                        {isGeneratingImg ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                        {isGeneratingImg ? 'Generating images…' : `Download ${Object.values(waMetrics).filter(Boolean).length} Image${Object.values(waMetrics).filter(Boolean).length !== 1 ? 's' : ''} + Open WA`}
                                    </button>
                                    <button
                                        onClick={() => setShowWaModal(false)}
                                        className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white border border-slate-700 rounded-xl hover:border-slate-600 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <p className="text-[10px] text-slate-500 text-center mt-3">
                                    Each section saves as a separate polished PNG. WhatsApp opens with a text summary — attach images manually.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <p className="text-[11px] text-muted-foreground/80 mt-4 leading-normal">
                * MTD data sourced from live database (credentials.daily_shopee_metrics + credentials.daily_shop_metrics).
            </p>
        </div>
    );
}
