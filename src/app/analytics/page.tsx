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
    const [tiktokTargetVal, setTiktokTargetVal] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedVal = localStorage.getItem('mtd_tiktok_target_val');
            if (savedVal) return Number(savedVal);
            
            const savedPct = localStorage.getItem('mtd_tiktok_target_pct');
            if (savedPct) {
                const pct = Number(savedPct);
                const target = localStorage.getItem('mtd_monthly_target') ? Number(localStorage.getItem('mtd_monthly_target')) : 4000000;
                return target * (pct / 100);
            }
            return 3000000;
        }
        return 3000000;
    });
    const [tiktokTargetValInput, setTiktokTargetValInput] = useState<number | null>(null);
    const [targetSaved, setTargetSaved] = useState(false);
    const [mtdCompany, setMtdCompany] = useState<'ALL' | 'HIMWELLNESS' | 'WEROCA'>('ALL');
    const [mtdData, setMtdData] = useState<any>(null);
    const [isMtdLoading, setIsMtdLoading] = useState(false);
    // WhatsApp share modal
    const [showWaModal, setShowWaModal] = useState(false);
    const [waPreviewUrl, setWaPreviewUrl] = useState<string | null>(null);
    const [waPreviewLoading, setWaPreviewLoading] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');
    const mtdReportRef = useRef<HTMLDivElement>(null);

    // Derived: the displayed monthly target (use input override if being edited)
    const displayTarget = targetInput !== null ? targetInput : monthlyTarget;

    const handleSaveTarget = useCallback(() => {
        const val = targetInput !== null ? targetInput : monthlyTarget;
        const splitVal = tiktokTargetValInput !== null ? tiktokTargetValInput : tiktokTargetVal;
        setMonthlyTarget(val);
        setTiktokTargetVal(splitVal);
        setTargetInput(null);
        setTiktokTargetValInput(null);
        if (typeof window !== 'undefined') {
            localStorage.setItem('mtd_monthly_target', String(val));
            localStorage.setItem('mtd_tiktok_target_val', String(splitVal));
        }
        setTargetSaved(true);
        setTimeout(() => setTargetSaved(false), 2000);
    }, [targetInput, tiktokTargetValInput, monthlyTarget, tiktokTargetVal]);

    // Theme detector for WhatsApp preview styling
    useEffect(() => {
        if (typeof window === "undefined") return;
        const observer = new MutationObserver(() => {
            const isDark = document.documentElement.classList.contains("dark");
            setCurrentTheme(isDark ? "dark" : "light");
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        setCurrentTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
        return () => observer.disconnect();
    }, []);

    // Generate/refresh WhatsApp preview image
    useEffect(() => {
        if (!showWaModal || !mtdData) return;
        let isMounted = true;
        
        const generatePreview = async () => {
            setWaPreviewLoading(true);
            setWaPreviewUrl(null);
            try {
                // Stagger slightly to make sure the offscreen element is fully rendered and styled under the active theme classes
                await new Promise(resolve => setTimeout(resolve, 350));
                
                const { toPng } = await import("html-to-image");
                await document.fonts.ready;
                
                const el = document.getElementById("mtd-whatsapp-export-target");
                if (el && isMounted) {
                    const dataUrl = await toPng(el, {
                        width: 1080,
                        height: 1080,
                        pixelRatio: 1,
                        quality: 0.95
                    });
                    if (isMounted) {
                        setWaPreviewUrl(dataUrl);
                    }
                }
            } catch (err) {
                console.error("Failed to generate MTD image preview:", err);
            } finally {
                if (isMounted) {
                    setWaPreviewLoading(false);
                }
            }
        };

        generatePreview();
        return () => {
            isMounted = false;
        };
    }, [showWaModal, mtdData, currentTheme, targetMonth, dayRangeEnd, mtdCompany, monthlyTarget, tiktokTargetVal]);

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
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Target className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target:</span>
                                <input
                                    type="number"
                                    step="100000"
                                    value={targetInput !== null ? targetInput : monthlyTarget}
                                    onChange={(e) => setTargetInput(Number(e.target.value))}
                                    className="w-32 bg-card dark:bg-slate-950 border border-border dark:border-slate-800 text-foreground text-sm rounded-lg p-2 focus:ring-primary focus:border-primary text-right font-mono font-semibold"
                                />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">TikTok Split:</span>
                                <input
                                    type="number"
                                    step="100000"
                                    value={tiktokTargetValInput !== null ? tiktokTargetValInput : tiktokTargetVal}
                                    onChange={(e) => setTiktokTargetValInput(Number(e.target.value))}
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

                        const tkMonthlyTarget = tiktokTargetVal;
                        const spMonthlyTarget = Math.max(0, monthlyTarget - tiktokTargetVal);

                        const tkEstCumulative = (tkMonthlyTarget / 30) * dayRangeEnd;
                        const spEstCumulative = (spMonthlyTarget / 30) * dayRangeEnd;

                        const tkSales = mtdData.currentMonthData?.tiktok?.sales || 0;
                        const spSales = mtdData.currentMonthData?.shopee?.sales || 0;

                        const tkPacingMet = tkEstCumulative > 0 ? (tkSales / tkEstCumulative) * 100 : 0;
                        const spPacingMet = spEstCumulative > 0 ? (spSales / spEstCumulative) * 100 : 0;
                        const totalPacingMet = estCumulative > 0 ? (actualSales / estCumulative) * 100 : 0;

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
                                                        <th className="py-3 px-4 text-right">Target MTD (Month)</th>
                                                        <th className="py-3 px-4 text-right">Spent (Ad Cost)</th>
                                                        <th className="py-3 px-4 text-center">MTD ROAS</th>
                                                        <th className="py-3 px-4 text-center">Pacing Met %</th>
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
                                                            RM {tkSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                                            <div className="flex flex-col items-end">
                                                                <span>RM {tkEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                <span className="text-[10px] text-muted-foreground font-semibold">Month: RM {tkMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                                            RM {(mtdData.currentMonthData?.tiktok?.spend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-bold text-pink-600 dark:text-pink-400">
                                                            {(mtdData.currentMonthData?.tiktok?.roas ?? 0).toFixed(2)}x
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className={cn(
                                                                "font-bold px-2.5 py-1 rounded-full text-xs font-mono border",
                                                                tkPacingMet >= 100 
                                                                    ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-450 bg-emerald-500/5 dark:bg-emerald-950/10" 
                                                                    : "border-rose-500/20 text-rose-600 dark:text-rose-450 bg-rose-500/5 dark:bg-rose-950/10"
                                                            )}>
                                                                {tkPacingMet.toFixed(1)}%
                                                            </span>
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
                                                            RM {spSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                                            <div className="flex flex-col items-end">
                                                                <span>RM {spEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                <span className="text-[10px] text-muted-foreground font-semibold">Month: RM {spMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                                            RM {(mtdData.currentMonthData?.shopee?.spend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-bold text-orange-600 dark:text-orange-400">
                                                            {(mtdData.currentMonthData?.shopee?.roas ?? 0).toFixed(2)}x
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className={cn(
                                                                "font-bold px-2.5 py-1 rounded-full text-xs font-mono border",
                                                                spPacingMet >= 100 
                                                                    ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-450 bg-emerald-500/5 dark:bg-emerald-950/10" 
                                                                    : "border-rose-500/20 text-rose-600 dark:text-rose-450 bg-rose-500/5 dark:bg-rose-950/10"
                                                            )}>
                                                                {spPacingMet.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    {/* Total */}
                                                    <tr className="border-b border-border/10 hover:bg-muted/10 transition-colors bg-primary/5 font-extrabold">
                                                        <td className="py-3.5 px-4 text-primary">Total</td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-primary font-bold">
                                                            RM {(mtdData.currentMonthData?.total?.sales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-primary">
                                                            <div className="flex flex-col items-end">
                                                                <span>RM {estCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                <span className="text-[10px] text-primary/75 font-semibold">Month: RM {monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-350">
                                                            RM {(mtdData.currentMonthData?.total?.spend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono text-primary font-extrabold">
                                                            {(mtdData.currentMonthData?.total?.roas ?? 0).toFixed(2)}x
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className={cn(
                                                                "font-extrabold px-2.5 py-1 rounded-full text-xs font-mono border",
                                                                totalPacingMet >= 100 
                                                                    ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-450 bg-emerald-500/10" 
                                                                    : "border-rose-500/30 text-rose-700 dark:text-rose-455 bg-rose-500/10"
                                                            )}>
                                                                {totalPacingMet.toFixed(1)}%
                                                            </span>
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
                            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setShowWaModal(false)} className="absolute top-4 right-4 text-slate-450 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                                
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl">
                                        <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Share MTD Report</h3>
                                        <p className="text-xs text-slate-550 dark:text-slate-400">Preview the unified square performance graphic (1080x1080)</p>
                                    </div>
                                </div>

                                {/* Preview Area */}
                                <div className="mb-6 flex flex-col items-center">
                                    {waPreviewLoading ? (
                                        <div className="w-full aspect-square max-w-[380px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
                                            <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
                                            <span className="text-xs font-semibold">Generating report preview…</span>
                                        </div>
                                    ) : waPreviewUrl ? (
                                        <div className="w-full max-w-[380px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-550/5 dark:bg-slate-950/40 shadow-inner p-1 flex items-center justify-center">
                                            <img 
                                                src={waPreviewUrl} 
                                                className="w-full aspect-square object-contain rounded-lg border border-slate-200/50 dark:border-slate-800/50" 
                                                alt="WhatsApp Report Preview" 
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full aspect-square max-w-[380px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                                            <AlertCircle className="h-6 w-6 text-rose-500" />
                                            <span className="text-xs font-semibold">Failed to generate preview</span>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-500 dark:text-slate-450 text-center mt-2.5">
                                        💡 Tip: Long-press or right-click the preview image to copy/share directly.
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            if (!waPreviewUrl) return;
                                            const link = document.createElement('a');
                                            link.download = `mtd-performance-${targetMonth}-${mtdCompany.toLowerCase()}.png`;
                                            link.href = waPreviewUrl;
                                            link.click();
                                            setShowWaModal(false);
                                        }}
                                        disabled={waPreviewLoading || !waPreviewUrl}
                                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-2.5 rounded-xl transition-colors cursor-pointer"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download PNG
                                    </button>
                                    <button
                                        onClick={() => setShowWaModal(false)}
                                        className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Offscreen container for 1080x1080 MTD Report Graphic */}
                    {mtdData && (
                        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                            <div id="mtd-whatsapp-export-target" style={{ width: '1080px', height: '1080px' }}>
                                <MtdReportGraphic 
                                    mtdData={mtdData} 
                                    targetMonth={targetMonth} 
                                    dayRangeEnd={dayRangeEnd} 
                                    mtdCompany={mtdCompany} 
                                    monthlyTarget={monthlyTarget} 
                                    tiktokTargetVal={tiktokTargetVal}
                                />
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

function MtdReportGraphic({
    mtdData,
    targetMonth,
    dayRangeEnd,
    mtdCompany,
    monthlyTarget,
    tiktokTargetVal
}: MtdReportGraphicProps) {
    if (!mtdData) return null;

    const actualSales = mtdData.currentMonthData?.total?.sales || 0;
    const estDaily = monthlyTarget / 30;
    const estCumulative = estDaily * dayRangeEnd;
    const gap = actualSales - estCumulative;
    const progressPct = monthlyTarget > 0 ? (actualSales / monthlyTarget) * 100 : 0;

    const tkMonthlyTarget = tiktokTargetVal;
    const spMonthlyTarget = Math.max(0, monthlyTarget - tiktokTargetVal);
    const tkEstCumulative = (tkMonthlyTarget / 30) * dayRangeEnd;
    const spEstCumulative = (spMonthlyTarget / 30) * dayRangeEnd;

    const streamLabel = mtdCompany === 'ALL' ? 'ALL STREAMS' : mtdCompany === 'HIMWELLNESS' ? 'HIM WELLNESS' : 'WEROCA';
    
    // Format Month Label (e.g. "2026-06" -> "JUNE 2026")
    const dateLabel = (() => {
        try {
            const [yearStr, monthStr] = targetMonth.split('-');
            const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
            const mIdx = parseInt(monthStr, 10) - 1;
            return `${months[mIdx]} ${yearStr} · DAY 1–${dayRangeEnd}`;
        } catch (e) {
            return `${targetMonth} · DAY 1–${dayRangeEnd}`;
        }
    })();

    // Platform breakdown metrics (TikTok Shop always first!)
    const tkSales = mtdData.currentMonthData?.tiktok?.sales || 0;
    const tkSpend = mtdData.currentMonthData?.tiktok?.spend || 0;
    const tkRoas = mtdData.currentMonthData?.tiktok?.roas || 0;

    const spSales = mtdData.currentMonthData?.shopee?.sales || 0;
    const spSpend = mtdData.currentMonthData?.shopee?.spend || 0;
    const spRoas = mtdData.currentMonthData?.shopee?.roas || 0;

    const tkGap = tkSales - tkEstCumulative;
    const spGap = spSales - spEstCumulative;

    // MoM comparison delta values (vs prior month)
    const latestComp = mtdData.comparisons && mtdData.comparisons.length > 0 
        ? mtdData.comparisons[mtdData.comparisons.length - 1] 
        : null;

    const tkDeltaSales = latestComp?.tiktok?.deltaSales ?? 0;
    const tkDeltaSalesPct = latestComp?.tiktok?.deltaSalesPct ?? 0;

    const spDeltaSales = latestComp?.shopee?.deltaSales ?? 0;
    const spDeltaSalesPct = latestComp?.shopee?.deltaSalesPct ?? 0;

    // Trend items (last 3 months)
    const trendItems = mtdData.monthlyTrend ? mtdData.monthlyTrend.slice(-3).reverse() : [];

    return (
        <div className="w-[1080px] h-[1080px] p-12 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between select-none border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-black tracking-widest text-indigo-650 dark:text-indigo-400 uppercase">
                        HIM & WEROCA ANALYTICS
                    </span>
                    <h1 className="text-3xl font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        MTD Performance Report
                    </h1>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-mono font-bold px-3.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {dateLabel}
                    </span>
                    <span className={cn(
                        "text-[10px] font-black px-2.5 py-0.5 rounded border uppercase tracking-wider",
                        mtdCompany === 'ALL' ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400"
                        : mtdCompany === 'HIMWELLNESS' ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                        : "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400"
                    )}>
                        {streamLabel}
                    </span>
                </div>
            </div>

            {/* Target Card */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-400">Target Pacing Analysis</span>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Bulanan</span>
                        <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100">RM {monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-mono">Est. Daily Target: RM {estDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 border-x border-slate-200 dark:border-slate-800/60 px-6">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Actual MTD Sales</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100">RM {actualSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">({progressPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 pl-6">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Gap vs Est. Cumulative</span>
                        <span className={cn(
                            "text-2xl font-black font-mono",
                            gap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                            {gap >= 0 ? '+' : '-'}RM {Math.abs(gap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            {gap >= 0 ? 'Pacing ahead of target' : `Behind pacing by -${Math.abs(gap / estCumulative * 100).toFixed(1)}%`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Platform Comparison Split */}
            <div className="grid grid-cols-2 gap-6">
                {/* TikTok - ALWAYS first/top */}
                <div className="bg-pink-500/5 dark:bg-pink-950/10 border border-pink-500/15 dark:border-pink-500/20 rounded-2xl p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-pink-500/10 pb-3.5 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🛒</span>
                            <span className="text-sm font-black text-pink-700 dark:text-pink-400 tracking-wide">TikTok Shop</span>
                        </div>
                        {latestComp && (
                            <div className={cn(
                                "flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded border font-mono",
                                tkDeltaSales >= 0 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-455"
                            )}>
                                {tkDeltaSales >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                                {Math.abs(tkDeltaSalesPct).toFixed(1)}% MoM
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Target (MTD Pacing)</span>
                            <div className="flex flex-col">
                                <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">RM {tkEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                <span className="text-[9px] font-bold text-slate-500 font-mono mt-0.5">({(tkEstCumulative > 0 ? (tkSales / tkEstCumulative) * 100 : 0).toFixed(0)}% met of RM {tkMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Sales (GMV)</span>
                            <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">RM {tkSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Gap</span>
                            <span className={cn(
                                "text-lg font-black font-mono",
                                tkGap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-455"
                            )}>
                                {tkGap >= 0 ? '+' : '-'}RM {Math.abs(tkGap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex flex-col border-t border-pink-500/10 pt-2.5">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Ad Spend</span>
                            <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">RM {tkSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex flex-col border-t border-pink-500/10 pt-2.5">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">ROAS</span>
                            <span className="text-lg font-black font-mono text-pink-700 dark:text-pink-450">{tkRoas.toFixed(2)}x</span>
                        </div>
                        <div className="flex flex-col border-t border-pink-500/10 pt-2.5" />
                    </div>
                </div>

                {/* Shopee */}
                <div className="bg-orange-500/5 dark:bg-orange-950/10 border border-orange-500/15 dark:border-orange-500/20 rounded-2xl p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-orange-500/10 pb-3.5 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🛍</span>
                            <span className="text-sm font-black text-orange-700 dark:text-orange-400 tracking-wide">Shopee Shop</span>
                        </div>
                        {latestComp && (
                            <div className={cn(
                                "flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded border font-mono",
                                spDeltaSales >= 0 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-455"
                            )}>
                                {spDeltaSales >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                                {Math.abs(spDeltaSalesPct).toFixed(1)}% MoM
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Target (MTD Pacing)</span>
                            <div className="flex flex-col">
                                <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">RM {spEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                <span className="text-[9px] font-bold text-slate-500 font-mono mt-0.5">({(spEstCumulative > 0 ? (spSales / spEstCumulative) * 100 : 0).toFixed(0)}% met of RM {spMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Sales (GMV)</span>
                            <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">RM {spSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Gap</span>
                            <span className={cn(
                                "text-lg font-black font-mono",
                                spGap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-455"
                            )}>
                                {spGap >= 0 ? '+' : '-'}RM {Math.abs(spGap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex flex-col border-t border-orange-500/10 pt-2.5">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Ad Spend</span>
                            <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">RM {spSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex flex-col border-t border-orange-500/10 pt-2.5">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">ROAS</span>
                            <span className="text-lg font-black font-mono text-orange-700 dark:text-orange-450">{spRoas.toFixed(2)}x</span>
                        </div>
                        <div className="flex flex-col border-t border-orange-500/10 pt-2.5" />
                    </div>
                </div>
            </div>

            {/* Section 3: Ringkasan Bulanan Table */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-400 font-mono">Ringkasan Bulanan (MTD Day 1 - {dayRangeEnd})</span>
                </div>
                
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">
                            <th className="py-2 px-4">Month</th>
                            <th className="py-2 px-4 text-right">TikTok Sales</th>
                            <th className="py-2 px-4 text-right">Shopee Sales</th>
                            <th className="py-2 px-4 text-right">Total Sales</th>
                            <th className="py-2 px-4 text-right">Ad Spend</th>
                            <th className="py-2 px-4 text-right">Blended ROAS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trendItems.map((item: any) => {
                            const isCurrent = item.monthKey === targetMonth;
                            return (
                                <tr 
                                    key={item.monthKey} 
                                    className={cn(
                                        "border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 text-xs font-semibold",
                                        isCurrent && "bg-indigo-500/5 dark:bg-indigo-950/10 font-bold border-l-2 border-l-indigo-600 dark:border-l-indigo-400"
                                    )}
                                >
                                    <td className="py-2.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                                        {item.monthLabel} {isCurrent && "⭐"}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono text-slate-850 dark:text-slate-200">RM {item.tiktok.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2.5 px-4 text-right font-mono text-slate-850 dark:text-slate-200">RM {item.shopee.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2.5 px-4 text-right font-mono text-slate-900 dark:text-white font-extrabold">RM {item.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2.5 px-4 text-right font-mono text-slate-850 dark:text-slate-200">RM {item.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2.5 px-4 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">{item.roas.toFixed(2)}x</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    HIMWELLNESS & WEROCA ECOMMERCE GROUP
                </span>
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                    Generated on {new Date().toLocaleString('en-MY', {
                        timeZone: 'Asia/Kuala_Lumpur',
                        dateStyle: 'medium',
                        timeStyle: 'short'
                    })} (MYT)
                </span>
            </div>
        </div>
    );
}

interface MtdReportGraphicProps {
    mtdData: any;
    targetMonth: string;
    dayRangeEnd: number;
    mtdCompany: 'ALL' | 'HIMWELLNESS' | 'WEROCA';
    monthlyTarget: number;
    tiktokTargetVal: number;
}
