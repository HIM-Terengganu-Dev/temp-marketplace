"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { 
    TrendingUp, 
    TrendingDown, 
    Target, 
    Calendar, 
    Save, 
    MessageCircle, 
    Building2, 
    CheckCircle2, 
    RefreshCw, 
    ArrowUpRight, 
    ArrowUp, 
    ArrowDown, 
    X, 
    Download, 
    AlertCircle 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Dynamic import of MtdCharts (Recharts BarChart)
const MtdCharts = dynamic(() => import("./MtdCharts"), {
    ssr: false,
    loading: () => (
        <div className="h-[220px] animate-pulse bg-muted/40 rounded-xl flex items-center justify-center text-xs text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading sales visualizer...
        </div>
    )
});

interface MtdReportTabProps {
    targetMonth: string;
    setTargetMonth: (m: string) => void;
    monthOptions: Array<{ val: string; label: string }>;
    dayRangeEnd: number;
    setDayRangeEnd: (d: number) => void;
    monthlyTarget: number;
    setMonthlyTarget: (t: number) => void;
    tiktokTargetVal: number;
    setTiktokTargetVal: (t: number) => void;
    mtdCompany: 'ALL' | 'HIMWELLNESS' | 'WEROCA';
    setMtdCompany: (c: 'ALL' | 'HIMWELLNESS' | 'WEROCA') => void;
    mtdData: any;
    isMtdLoading: boolean;
    mtdError?: string | null;
    onRetry?: () => void;
}

export function MtdReportTab({
    targetMonth,
    setTargetMonth,
    monthOptions,
    dayRangeEnd,
    setDayRangeEnd,
    monthlyTarget,
    setMonthlyTarget,
    tiktokTargetVal,
    setTiktokTargetVal,
    mtdCompany,
    setMtdCompany,
    mtdData,
    isMtdLoading,
    mtdError,
    onRetry
}: MtdReportTabProps) {
    const [targetInput, setTargetInput] = useState<number | null>(null);
    const [tiktokTargetValInput, setTiktokTargetValInput] = useState<number | null>(null);
    const [targetSaved, setTargetSaved] = useState(false);
    const [showWaModal, setShowWaModal] = useState(false);
    const [waPreviewUrl, setWaPreviewUrl] = useState<string | null>(null);
    const [waPreviewLoading, setWaPreviewLoading] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');
    const mtdReportRef = useRef<HTMLDivElement>(null);

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
    }, [targetInput, tiktokTargetValInput, monthlyTarget, tiktokTargetVal, setMonthlyTarget, setTiktokTargetVal]);

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
                await new Promise(resolve => setTimeout(resolve, 350));
                
                const { toPng } = await import("html-to-image");
                await document.fonts.ready;
                
                const el = document.getElementById("mtd-whatsapp-export-target");
                if (el && isMounted) {
                    const dataUrl = await toPng(el, {
                        width: 1080,
                        height: 1080,
                        pixelRatio: 2,
                        quality: 1
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

    return (
        <div className="space-y-6">
            {/* Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/80 dark:bg-muted/30 border border-border dark:border-border/50 p-4 rounded-xl backdrop-blur-sm select-none">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Month Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground/70 dark:text-foreground">Month:</span>
                        <select
                            value={targetMonth}
                            onChange={(e) => setTargetMonth(e.target.value)}
                            className="bg-card dark:bg-card border border-border dark:border-border text-foreground text-sm rounded-lg p-2 focus:ring-primary focus:border-primary cursor-pointer font-semibold"
                        >
                            {monthOptions.map(opt => (
                                <option key={opt.val} value={opt.val}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Day Range */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground/70 dark:text-foreground">Day 1 –</span>
                        <input
                            type="number"
                            min={1}
                            max={31}
                            value={dayRangeEnd}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (val >= 1 && val <= 31) setDayRangeEnd(val);
                            }}
                            className="w-14 bg-card dark:bg-card border border-border dark:border-border text-foreground text-sm rounded-lg p-2 focus:ring-primary focus:border-primary text-center font-mono font-semibold"
                        />
                    </div>

                    {/* Target Input + Save */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground/70 dark:text-foreground">Target:</span>
                        <input
                            type="text"
                            value={(targetInput !== null ? targetInput : monthlyTarget).toLocaleString()}
                            onChange={(e) => {
                                const val = e.target.value.replace(/,/g, '');
                                if (/^\d*$/.test(val)) setTargetInput(Number(val));
                            }}
                            className="w-32 bg-card dark:bg-card border border-border dark:border-border text-foreground text-sm rounded-lg p-2 focus:ring-primary focus:border-primary text-right font-mono font-semibold"
                        />
                        <span className="text-sm font-semibold text-foreground/70 dark:text-foreground ml-1">TikTok Split:</span>
                        <input
                            type="text"
                            value={(tiktokTargetValInput !== null ? tiktokTargetValInput : tiktokTargetVal).toLocaleString()}
                            onChange={(e) => {
                                const val = e.target.value.replace(/,/g, '');
                                if (/^\d*$/.test(val)) setTiktokTargetValInput(Number(val));
                            }}
                            className="w-32 bg-card dark:bg-card border border-border dark:border-border text-foreground text-sm rounded-lg p-2 focus:ring-primary focus:border-primary text-right font-mono font-semibold"
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
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground/70 dark:text-foreground">Stream:</span>
                        <div className="flex items-center bg-muted/50 dark:bg-muted/80 border border-border dark:border-border rounded-lg overflow-hidden">
                            {([['ALL', 'All'], ['HIMWELLNESS', 'HIM'], ['WEROCA', 'Weroca']] as const).map(([val, label]) => (
                                <button
                                    key={val}
                                    onClick={() => setMtdCompany(val)}
                                    className={cn(
                                        "text-xs font-bold px-3 py-2 transition-all cursor-pointer",
                                        mtdCompany === val
                                            ? "bg-primary text-white"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:text-muted-foreground dark:hover:text-white dark:hover:bg-muted/60"
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

            {mtdError && !mtdData ? (
                <div className="h-[40vh] w-full flex flex-col items-center justify-center bg-card/20 backdrop-blur-md rounded-2xl border border-destructive/30 p-6 text-center gap-3">
                    <AlertCircle className="h-8 w-8 text-destructive animate-bounce" />
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">Failed to Load MTD Report Data</p>
                        <p className="text-xs text-muted-foreground max-w-md">{mtdError}</p>
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
            ) : isMtdLoading || !mtdData ? (
                <div className="h-[50vh] w-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-4 border border-border/20 rounded-2xl bg-card/10 backdrop-blur-md">
                    <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">Loading MTD Metrics</p>
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
                            <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-border dark:hover:border-border transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Bulan</CardTitle>
                                    <Target className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </CardHeader>
                                <CardContent className="space-y-1.5">
                                    <div className="text-2xl font-bold flex items-baseline gap-2 text-foreground">
                                        <span>RM {monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Est. Daily: <span className="font-mono text-foreground/70 dark:text-foreground">RM {estDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-medium pt-1">
                                        Active target set for overall ecommerce pipeline
                                    </p>
                                </CardContent>
                            </Card>

                            {/* 2. Cumulative Target */}
                            <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm relative overflow-hidden group hover:border-border dark:hover:border-border transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Cumulative Target</CardTitle>
                                    <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </CardHeader>
                                <CardContent className="space-y-1.5">
                                    <div className="text-2xl font-bold flex items-baseline gap-2 text-foreground">
                                        <span>RM {estCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Days Elapsed: <span className="font-mono font-bold text-foreground/80 dark:text-foreground">{daysElapsed} Days</span>
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
                                            <tr className="border-b border-border/30 bg-muted/20 text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
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
                                                <td className="py-3.5 px-4 font-bold text-foreground/80 dark:text-foreground">
                                                    <span className="inline-flex items-center gap-2">
                                                        <span className="text-base">🛒</span> Ecommerce (TikTok Shop)
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground/70 dark:text-foreground">
                                                    RM {tkSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono text-foreground/70 dark:text-foreground">
                                                    <div className="flex flex-col items-end">
                                                        <span>RM {tkEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                        <span className="text-[10px] text-muted-foreground font-semibold">Month: RM {tkMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono text-muted-foreground dark:text-foreground">
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
                                                <td className="py-3.5 px-4 font-bold text-foreground/80 dark:text-foreground">
                                                    <span className="inline-flex items-center gap-2">
                                                        <span className="text-base">🛍</span> Market Place (Shopee)
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground/70 dark:text-foreground">
                                                    RM {spSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono text-foreground/70 dark:text-foreground">
                                                    <div className="flex flex-col items-end">
                                                        <span>RM {spEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                        <span className="text-[10px] text-muted-foreground font-semibold">Month: RM {spMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono text-muted-foreground dark:text-foreground">
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
                                                <td className="py-3.5 px-4 text-right font-mono text-foreground/70 dark:text-foreground/60">
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
                                                <tr className="border-b border-border/30 bg-muted/20 text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
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
                                                        <td className="py-3.5 px-4 font-bold text-foreground/80 dark:text-foreground">
                                                            {m.monthLabel} {m.monthKey === targetMonth && "⭐"}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-pink-600 dark:text-pink-300">
                                                            RM {m.tiktok.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-orange-600 dark:text-orange-300">
                                                            RM {m.shopee.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground/80 dark:text-foreground">
                                                            RM {m.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-muted-foreground dark:text-foreground">
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

                            {/* Bar Chart (Dynamically Imported) */}
                            <MtdCharts monthlyTrend={mtdData.monthlyTrend} dayRangeEnd={dayRangeEnd} />
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
                                                        <Badge variant="outline" className="ml-auto text-[9px] border-border dark:border-border font-normal text-muted-foreground dark:text-muted-foreground">
                                                            vs {comp.comparisonMonth}
                                                        </Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="border-b border-border/20 bg-muted/5 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                                                                <th className="py-2 px-4">Metric</th>
                                                                <th className="py-2 px-4 text-right">Active</th>
                                                                <th className="py-2 px-4 text-right">Prev</th>
                                                                <th className="py-2 px-4 text-right">Δ Change</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="border-b border-border/5 hover:bg-muted/5">
                                                                <td className="py-2.5 px-4 text-xs font-medium text-foreground/70 dark:text-foreground">Sales</td>
                                                                <td className="py-2.5 px-4 text-right font-mono text-xs text-foreground/80 dark:text-foreground font-bold">RM {d.active.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                                <td className="py-2.5 px-4 text-right font-mono text-xs text-muted-foreground dark:text-muted-foreground">RM {d.prev.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                                <td className="py-2.5 px-4"><DeltaBadge delta={salesDelta} pct={salesPct} /></td>
                                                            </tr>
                                                            <tr className="border-b border-border/5 hover:bg-muted/5">
                                                                <td className="py-2.5 px-4 text-xs font-medium text-foreground/70 dark:text-foreground">Spend</td>
                                                                <td className="py-2.5 px-4 text-right font-mono text-xs text-foreground/80 dark:text-foreground">RM {d.active.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                                <td className="py-2.5 px-4 text-right font-mono text-xs text-muted-foreground dark:text-muted-foreground">RM {d.prev.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                                <td className="py-2.5 px-4"><DeltaBadge delta={spendDelta} pct={spendPct} /></td>
                                                            </tr>
                                                            <tr className="hover:bg-muted/5">
                                                                <td className="py-2.5 px-4 text-xs font-medium text-foreground/70 dark:text-foreground">ROAS</td>
                                                                <td className="py-2.5 px-4 text-right font-mono text-xs text-foreground/80 dark:text-foreground font-bold">{d.active.roas.toFixed(2)}x</td>
                                                                <td className="py-2.5 px-4 text-right font-mono text-xs text-muted-foreground dark:text-muted-foreground">{d.prev.roas.toFixed(2)}x</td>
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
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
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
                    <div className="relative bg-white dark:bg-muted border border-border dark:border-border rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowWaModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white cursor-pointer transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl">
                                <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground dark:text-white">Share MTD Report</h3>
                                <p className="text-xs text-muted-foreground dark:text-muted-foreground">Preview the unified square performance graphic (1080x1080)</p>
                            </div>
                        </div>

                        {/* Preview Area */}
                        <div className="mb-6 flex flex-col items-center">
                            {waPreviewLoading ? (
                                <div className="w-full aspect-square max-w-[380px] rounded-xl border border-border dark:border-border bg-muted/20 dark:bg-muted/40 flex flex-col items-center justify-center text-muted-foreground dark:text-muted-foreground gap-3">
                                    <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
                                    <span className="text-xs font-semibold">Generating report preview…</span>
                                </div>
                            ) : waPreviewUrl ? (
                                <div className="w-full max-w-[380px] rounded-xl border border-border dark:border-border bg-muted/5 dark:bg-muted/40 shadow-inner p-1 flex items-center justify-center">
                                    <img 
                                        src={waPreviewUrl} 
                                        className="w-full aspect-square object-contain rounded-lg border border-border/50 dark:border-border/50" 
                                        alt="WhatsApp Report Preview" 
                                    />
                                </div>
                            ) : (
                                <div className="w-full aspect-square max-w-[380px] rounded-xl border border-border dark:border-border bg-muted/20 dark:bg-muted/40 flex flex-col items-center justify-center text-muted-foreground dark:text-muted-foreground gap-2">
                                    <AlertCircle className="h-6 w-6 text-rose-500" />
                                    <span className="text-xs font-semibold">Failed to generate preview</span>
                                </div>
                            )}
                            <p className="text-[10px] text-muted-foreground dark:text-muted-foreground text-center mt-2.5">
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
                                className="px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white border border-border dark:border-border rounded-xl hover:border-border dark:hover:border-border transition-colors cursor-pointer"
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

    const daysInTargetMonth = (() => {
        try {
            const [yearStr, monthStr] = targetMonth.split('-');
            return new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
        } catch { return 30; }
    })();
    const avgDailySales = dayRangeEnd > 0 ? actualSales / dayRangeEnd : 0;
    const estTotalSales = avgDailySales * daysInTargetMonth;
    const estTotalVsTarget = monthlyTarget > 0 ? (estTotalSales / monthlyTarget) * 100 : 0;

    const tkMonthlyTarget = tiktokTargetVal;
    const spMonthlyTarget = Math.max(0, monthlyTarget - tiktokTargetVal);
    const tkEstCumulative = (tkMonthlyTarget / 30) * dayRangeEnd;
    const spEstCumulative = (spMonthlyTarget / 30) * dayRangeEnd;

    const streamLabel = mtdCompany === 'ALL' ? 'ALL STREAMS' : mtdCompany === 'HIMWELLNESS' ? 'HIM WELLNESS' : 'WEROCA';
    
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

    const tkSales = mtdData.currentMonthData?.tiktok?.sales || 0;
    const tkSpend = mtdData.currentMonthData?.tiktok?.spend || 0;
    const tkRoas = mtdData.currentMonthData?.tiktok?.roas || 0;

    const spSales = mtdData.currentMonthData?.shopee?.sales || 0;
    const spSpend = mtdData.currentMonthData?.shopee?.spend || 0;
    const spRoas = mtdData.currentMonthData?.shopee?.roas || 0;

    const tkGap = tkSales - tkEstCumulative;
    const spGap = spSales - spEstCumulative;

    const latestComp = mtdData.comparisons && mtdData.comparisons.length > 0 
        ? mtdData.comparisons[mtdData.comparisons.length - 1] 
        : null;

    const tkDeltaSales = latestComp?.tiktok?.deltaSales ?? 0;
    const tkDeltaSalesPct = latestComp?.tiktok?.deltaSalesPct ?? 0;

    const spDeltaSales = latestComp?.shopee?.deltaSales ?? 0;
    const spDeltaSalesPct = latestComp?.shopee?.deltaSalesPct ?? 0;

    const trendItems = mtdData.monthlyTrend ? mtdData.monthlyTrend.slice(-3).reverse() : [];

    return (
        <div className="light w-[1080px] h-[1080px] p-12 bg-white text-black font-sans flex flex-col justify-between select-none border border-border">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border dark:border-border pb-6">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-black tracking-widest text-indigo-650 dark:text-indigo-400 uppercase">
                        HIM & WEROCA ANALYTICS
                    </span>
                    <h1 className="text-3xl font-black uppercase tracking-wider text-foreground/80 dark:text-white">
                        MTD Performance Report
                    </h1>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-mono font-bold px-3.5 py-1 rounded-lg bg-muted/60 dark:bg-muted text-muted-foreground dark:text-foreground">
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
            <div className="bg-white dark:bg-muted/30 border border-border dark:border-border/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">Target Pacing Analysis</span>
                </div>
                
                <div className="grid grid-cols-4 gap-5">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Target Bulanan</span>
                        <span className="text-2xl font-black font-mono text-foreground/80 dark:text-foreground">RM {monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="text-[10px] font-semibold text-muted-foreground dark:text-muted-foreground font-mono">Est. Daily Target: RM {estDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 border-x border-border dark:border-border/60 px-5">
                        <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Actual MTD Sales</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black font-mono text-foreground/80 dark:text-foreground">RM {actualSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">({progressPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-muted/50 dark:bg-muted h-2.5 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 border-r border-border dark:border-border/60 pr-5">
                        <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Est. Total Month Sales</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black font-mono text-foreground/80 dark:text-foreground">RM {estTotalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className={cn(
                                "text-xs font-extrabold font-mono",
                                estTotalVsTarget >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500 dark:text-amber-400"
                            )}>({estTotalVsTarget.toFixed(1)}%)</span>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground dark:text-muted-foreground font-mono">Avg daily: RM {avgDailySales.toLocaleString(undefined, { maximumFractionDigits: 0 })} × {daysInTargetMonth}d</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 pl-0">
                        <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Gap vs Est. Cumulative</span>
                        <span className={cn(
                            "text-2xl font-black font-mono",
                            gap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                            {gap >= 0 ? '+' : '-'}RM {Math.abs(gap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground dark:text-muted-foreground">
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
                                <span className="text-lg font-black font-mono text-black">RM {tkEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                <span className="text-[9px] font-bold text-gray-500 font-mono mt-0.5">({(tkEstCumulative > 0 ? (tkSales / tkEstCumulative) * 100 : 0).toFixed(0)}% met of RM {tkMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-pink-700 uppercase">Sales (GMV)</span>
                            <span className="text-lg font-black font-mono text-black">RM {tkSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-pink-700 uppercase">Gap</span>
                            <span className={cn(
                                "text-lg font-black font-mono",
                                tkGap >= 0 ? "text-emerald-700" : "text-rose-700"
                            )}>
                                {tkGap >= 0 ? '+' : '-'}RM {Math.abs(tkGap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex flex-col border-t border-pink-500/10 pt-2.5">
                            <span className="text-[10px] font-bold text-pink-700 uppercase">Ad Spend</span>
                            <span className="text-lg font-black font-mono text-black">RM {tkSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex flex-col border-t border-pink-500/10 pt-2.5">
                            <span className="text-[10px] font-bold text-pink-700 uppercase">ROAS</span>
                            <span className="text-lg font-black font-mono text-pink-800">{tkRoas.toFixed(2)}x</span>
                        </div>
                        <div className="flex flex-col border-t border-pink-500/10 pt-2.5">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Est. Total Month</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-black font-mono text-foreground/80 dark:text-foreground">RM {(tkSales / dayRangeEnd * daysInTargetMonth).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                <span className={cn(
                                    "text-[9px] font-extrabold font-mono",
                                    (tkMonthlyTarget > 0 ? (tkSales / dayRangeEnd * daysInTargetMonth) / tkMonthlyTarget * 100 : 0) >= 100
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-500 dark:text-amber-400"
                                )}>({tkMonthlyTarget > 0 ? ((tkSales / dayRangeEnd * daysInTargetMonth) / tkMonthlyTarget * 100).toFixed(0) : 0}%)</span>
                            </div>
                        </div>
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
                                <span className="text-lg font-black font-mono text-foreground/80 dark:text-foreground">RM {spEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                <span className="text-[9px] font-bold text-muted-foreground font-mono mt-0.5">({(spEstCumulative > 0 ? (spSales / spEstCumulative) * 100 : 0).toFixed(0)}% met of RM {spMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Sales (GMV)</span>
                            <span className="text-lg font-black font-mono text-foreground/80 dark:text-foreground">RM {spSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                            <span className="text-lg font-black font-mono text-foreground/80 dark:text-foreground">RM {spSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex flex-col border-t border-orange-500/10 pt-2.5">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">ROAS</span>
                            <span className="text-lg font-black font-mono text-orange-700 dark:text-orange-450">{spRoas.toFixed(2)}x</span>
                        </div>
                        <div className="flex flex-col border-t border-orange-500/10 pt-2.5">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Est. Total Month</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-black font-mono text-foreground/80 dark:text-foreground">RM {(spSales / dayRangeEnd * daysInTargetMonth).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                <span className={cn(
                                    "text-[9px] font-extrabold font-mono",
                                    (spMonthlyTarget > 0 ? (spSales / dayRangeEnd * daysInTargetMonth) / spMonthlyTarget * 100 : 0) >= 100
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-500 dark:text-amber-400"
                                )}>({spMonthlyTarget > 0 ? ((spSales / dayRangeEnd * daysInTargetMonth) / spMonthlyTarget * 100).toFixed(0) : 0}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Ringkasan Bulanan Table */}
            <div className="bg-white dark:bg-muted/30 border border-border dark:border-border/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground font-mono">Ringkasan Bulanan (MTD Day 1 - {dayRangeEnd})</span>
                </div>
                
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border dark:border-border text-[10px] text-muted-foreground dark:text-muted-foreground font-extrabold uppercase tracking-wider">
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
                                        "border-b border-border/50 dark:border-border/50 hover:bg-muted/20 dark:hover:bg-muted/30 text-xs font-semibold",
                                        isCurrent && "bg-indigo-500/5 dark:bg-indigo-950/10 font-bold border-l-2 border-l-indigo-600 dark:border-l-indigo-400"
                                    )}
                                >
                                    <td className="py-2.5 px-4 font-bold text-foreground/70 dark:text-foreground">
                                        {item.monthLabel} {isCurrent && "⭐"}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono text-foreground dark:text-foreground">RM {item.tiktok.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2.5 px-4 text-right font-mono text-foreground dark:text-foreground">RM {item.shopee.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2.5 px-4 text-right font-mono text-foreground dark:text-white font-extrabold">RM {item.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2.5 px-4 text-right font-mono text-foreground dark:text-foreground">RM {item.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2.5 px-4 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">{item.roas.toFixed(2)}x</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border dark:border-border pt-6">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    HIMWELLNESS & WEROCA ECOMMERCE GROUP
                </span>
                <span className="text-[9px] font-mono text-muted-foreground dark:text-muted-foreground">
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

export default MtdReportTab;
