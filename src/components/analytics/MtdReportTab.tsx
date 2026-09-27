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

import MtdCharts from "./MtdCharts";

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
    const [isSavingTarget, setIsSavingTarget] = useState(false);
    const [showWaModal, setShowWaModal] = useState(false);
    const [waPreviewUrl, setWaPreviewUrl] = useState<string | null>(null);
    const [waPreviewLoading, setWaPreviewLoading] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');
    const mtdReportRef = useRef<HTMLDivElement>(null);

    // Reset local uncommitted inputs when month or stream changes
    useEffect(() => {
        setTargetInput(null);
        setTiktokTargetValInput(null);
    }, [targetMonth, mtdCompany]);

    const handleSaveTarget = useCallback(async () => {
        const val = targetInput !== null ? targetInput : monthlyTarget;
        const splitVal = tiktokTargetValInput !== null ? tiktokTargetValInput : tiktokTargetVal;
        
        setIsSavingTarget(true);
        try {
            const res = await fetch('/api/analytics/mtd-target', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetMonth,
                    company: mtdCompany,
                    monthlyTarget: val,
                    tiktokTargetVal: splitVal
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            setMonthlyTarget(data.monthlyTarget);
            setTiktokTargetVal(data.tiktokTargetVal);
            setTargetInput(null);
            setTiktokTargetValInput(null);

            if (typeof window !== 'undefined') {
                localStorage.setItem('mtd_monthly_target', String(data.monthlyTarget));
                localStorage.setItem('mtd_tiktok_target_val', String(data.tiktokTargetVal));
            }

            setTargetSaved(true);
            setTimeout(() => setTargetSaved(false), 2500);
        } catch (err: any) {
            console.error('Failed to save MTD target to database:', err);
            alert(`Error saving target: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSavingTarget(false);
        }
    }, [targetInput, tiktokTargetValInput, monthlyTarget, tiktokTargetVal, targetMonth, mtdCompany, setMonthlyTarget, setTiktokTargetVal]);

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
                            placeholder="Target"
                            title="Total Monthly Target (RM)"
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
                            placeholder="TikTok Target"
                            title="TikTok Shop Target Allocation (RM)"
                        />
                        {/* Auto-computed Shopee Target preview */}
                        <div 
                            className="hidden lg:flex items-center px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[11px] font-mono font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap"
                            title="Shopee split computed automatically (Total Target - TikTok Split)"
                        >
                            Shopee: RM {Math.max(0, (targetInput !== null ? targetInput : monthlyTarget) - (tiktokTargetValInput !== null ? tiktokTargetValInput : tiktokTargetVal)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <button
                            onClick={handleSaveTarget}
                            disabled={isSavingTarget}
                            title={mtdData?.target?.updatedBy ? `Saved in DB. Last updated by ${mtdData.target.updatedBy}` : 'Save target configuration to database for all users'}
                            className={cn(
                                "flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer border",
                                targetSaved
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20",
                                isSavingTarget && "opacity-60 cursor-not-allowed"
                            )}
                        >
                            {isSavingTarget ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : targetSaved ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                                <Save className="h-3.5 w-3.5" />
                            )}
                            {isSavingTarget ? "Saving..." : targetSaved ? "Saved to DB!" : "Save"}
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
                const totalPacingMet = estCumulative > 0 ? (actualSales / estCumulative) * 100 : 0;

                return (
                    <div className="space-y-6" ref={mtdReportRef}>
                        {/* Executive MTD Performance Report Segment (Exact layout from WhatsApp Export) */}
                        <MtdReportGraphic 
                            mtdData={mtdData} 
                            targetMonth={targetMonth} 
                            dayRangeEnd={dayRangeEnd} 
                            mtdCompany={mtdCompany} 
                            monthlyTarget={monthlyTarget} 
                            tiktokTargetVal={tiktokTargetVal}
                            isExport={false}
                        />

                        {/* Sales Visualizer Bar Chart */}
                        <div id="mtd-ringkasan-chart-container">
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
                                                    <div className="overflow-x-auto scrollbar-thin touch-scroll">
                                                        <table className="w-full min-w-[340px] text-left border-collapse">
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
                                                    </div>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowWaModal(false)}>
                    <div className="relative bg-white dark:bg-muted border border-border dark:border-border rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg flex flex-col max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowWaModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white cursor-pointer transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-5 pr-8">
                            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex-shrink-0">
                                <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground dark:text-white leading-tight">Share MTD Report</h3>
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
                            isExport={true}
                        />
                    </div>
                </div>
            )}
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
    isExport?: boolean;
}

function MtdReportGraphic({
    mtdData,
    targetMonth,
    dayRangeEnd,
    mtdCompany,
    monthlyTarget,
    tiktokTargetVal,
    isExport = false
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

    // When exporting, use fixed 1080x1080 canvas for WhatsApp export. When on-screen, use full-width responsive card.
    return (
        <div 
            className={cn(
                "select-none font-sans flex flex-col justify-between transition-colors",
                isExport
                    ? "light w-[1080px] h-[1080px] p-12 bg-white text-black border border-border shrink-0"
                    : "w-full bg-card dark:bg-card/40 border border-border/60 rounded-2xl p-5 sm:p-7 text-foreground shadow-sm backdrop-blur-sm gap-6"
            )}
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/60 pb-5 gap-3">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                        HIM & WEROCA ANALYTICS
                    </span>
                    <h1 className={cn(
                        "font-black uppercase tracking-wider",
                        isExport ? "text-3xl text-foreground/80 dark:text-white" : "text-2xl sm:text-3xl text-foreground"
                    )}>
                        MTD Performance Report
                    </h1>
                </div>
                <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2">
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

            {/* Target Card: Target Pacing Analysis */}
            <div className={cn(
                "rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 border",
                isExport ? "bg-white border-border" : "bg-muted/20 dark:bg-muted/20 border-border/60"
            )}>
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
                        Target Pacing Analysis
                    </span>
                </div>
                
                <div className={cn(
                    "gap-5",
                    isExport ? "grid grid-cols-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                )}>
                    {/* Target Bulanan */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Bulanan</span>
                        <span className={cn("text-2xl font-black font-mono", isExport ? "text-foreground/80 dark:text-foreground" : "text-foreground")}>
                            RM {monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground font-mono">
                            Est. Daily Target: RM {estDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    
                    {/* Actual MTD Sales */}
                    <div className={cn(
                        "flex flex-col gap-1",
                        isExport 
                            ? "border-x border-border dark:border-border/60 px-5" 
                            : "sm:border-l lg:border-x border-border/60 sm:pl-5 lg:px-5"
                    )}>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actual MTD Sales</span>
                        <div className="flex items-baseline gap-2">
                            <span className={cn("text-2xl font-black font-mono", isExport ? "text-foreground/80 dark:text-foreground" : "text-foreground")}>
                                RM {actualSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                ({progressPct.toFixed(1)}%)
                            </span>
                        </div>
                        <div className="w-full bg-muted/60 dark:bg-muted h-2.5 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
                        </div>
                    </div>

                    {/* Est. Total Month Sales */}
                    <div className={cn(
                        "flex flex-col gap-1",
                        isExport 
                            ? "border-r border-border dark:border-border/60 pr-5" 
                            : "lg:border-r border-border/60 lg:pr-5"
                    )}>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Est. Total Month Sales</span>
                        <div className="flex items-baseline gap-2">
                            <span className={cn("text-2xl font-black font-mono", isExport ? "text-foreground/80 dark:text-foreground" : "text-foreground")}>
                                RM {estTotalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span className={cn(
                                "text-xs font-extrabold font-mono",
                                estTotalVsTarget >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500 dark:text-amber-400"
                            )}>
                                ({estTotalVsTarget.toFixed(1)}%)
                            </span>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground font-mono">
                            Avg daily: RM {avgDailySales.toLocaleString(undefined, { maximumFractionDigits: 0 })} × {daysInTargetMonth}d
                        </span>
                    </div>
                    
                    {/* Gap vs Est. Cumulative */}
                    <div className={cn(
                        "flex flex-col gap-1",
                        isExport ? "pl-0" : "sm:border-l lg:border-l-0 border-border/60 sm:pl-5 lg:pl-0"
                    )}>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gap vs Est. Cumulative</span>
                        <span className={cn(
                            "text-2xl font-black font-mono",
                            gap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                            {gap >= 0 ? '+' : '-'}RM {Math.abs(gap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                            {gap >= 0 ? 'Pacing ahead of target' : `Behind pacing by -${estCumulative > 0 ? Math.abs(gap / estCumulative * 100).toFixed(1) : '0.0'}%`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Platform Comparison Split: TikTok Shop & Shopee Shop */}
            <div className={cn("gap-6", isExport ? "grid grid-cols-2" : "grid grid-cols-1 lg:grid-cols-2")}>
                {/* TikTok Shop - ALWAYS FIRST */}
                <div className="bg-pink-500/5 dark:bg-pink-950/15 border border-pink-500/20 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-pink-500/15 pb-3.5 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🛒</span>
                            <span className="text-sm font-black text-pink-700 dark:text-pink-400 tracking-wide">TikTok Shop</span>
                        </div>
                        {latestComp && (
                            <div className={cn(
                                "flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded border font-mono",
                                tkDeltaSales >= 0 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                            )}>
                                {tkDeltaSales >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                                {Math.abs(tkDeltaSalesPct).toFixed(1)}% MoM
                            </div>
                        )}
                    </div>
                    
                    <div className={cn("gap-x-4 gap-y-3.5", isExport ? "grid grid-cols-3" : "grid grid-cols-2 sm:grid-cols-3")}>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Target (MTD Pacing)</span>
                            <div className="flex flex-col">
                                <span className="text-lg font-black font-mono text-foreground">
                                    RM {tkEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-[9px] font-bold text-muted-foreground font-mono mt-0.5">
                                    ({(tkEstCumulative > 0 ? (tkSales / tkEstCumulative) * 100 : 0).toFixed(0)}% met of RM {tkMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Sales (GMV)</span>
                            <span className="text-lg font-black font-mono text-foreground">
                                RM {tkSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Gap</span>
                            <span className={cn(
                                "text-lg font-black font-mono",
                                tkGap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}>
                                {tkGap >= 0 ? '+' : '-'}RM {Math.abs(tkGap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex flex-col border-t border-pink-500/15 pt-2.5">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Ad Spend</span>
                            <span className="text-lg font-black font-mono text-foreground">
                                RM {tkSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex flex-col border-t border-pink-500/15 pt-2.5">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">ROAS</span>
                            <span className="text-lg font-black font-mono text-pink-600 dark:text-pink-400">
                                {tkRoas.toFixed(2)}x
                            </span>
                        </div>
                        <div className="flex flex-col border-t border-pink-500/15 pt-2.5">
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase">Est. Total Month</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-black font-mono text-foreground">
                                    RM {dayRangeEnd > 0 ? (tkSales / dayRangeEnd * daysInTargetMonth).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                                </span>
                                <span className={cn(
                                    "text-[9px] font-extrabold font-mono",
                                    (tkMonthlyTarget > 0 && dayRangeEnd > 0 ? (tkSales / dayRangeEnd * daysInTargetMonth) / tkMonthlyTarget * 100 : 0) >= 100
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-500 dark:text-amber-400"
                                )}>
                                    ({tkMonthlyTarget > 0 && dayRangeEnd > 0 ? ((tkSales / dayRangeEnd * daysInTargetMonth) / tkMonthlyTarget * 100).toFixed(0) : 0}%)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shopee Shop - SECOND */}
                <div className="bg-orange-500/5 dark:bg-orange-950/15 border border-orange-500/20 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-orange-500/15 pb-3.5 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🛍</span>
                            <span className="text-sm font-black text-orange-700 dark:text-orange-400 tracking-wide">Shopee Shop</span>
                        </div>
                        {latestComp && (
                            <div className={cn(
                                "flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded border font-mono",
                                spDeltaSales >= 0 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                            )}>
                                {spDeltaSales >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                                {Math.abs(spDeltaSalesPct).toFixed(1)}% MoM
                            </div>
                        )}
                    </div>
                    
                    <div className={cn("gap-x-4 gap-y-3.5", isExport ? "grid grid-cols-3" : "grid grid-cols-2 sm:grid-cols-3")}>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Target (MTD Pacing)</span>
                            <div className="flex flex-col">
                                <span className="text-lg font-black font-mono text-foreground">
                                    RM {spEstCumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-[9px] font-bold text-muted-foreground font-mono mt-0.5">
                                    ({(spEstCumulative > 0 ? (spSales / spEstCumulative) * 100 : 0).toFixed(0)}% met of RM {spMonthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Sales (GMV)</span>
                            <span className="text-lg font-black font-mono text-foreground">
                                RM {spSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Gap</span>
                            <span className={cn(
                                "text-lg font-black font-mono",
                                spGap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}>
                                {spGap >= 0 ? '+' : '-'}RM {Math.abs(spGap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex flex-col border-t border-orange-500/15 pt-2.5">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Ad Spend</span>
                            <span className="text-lg font-black font-mono text-foreground">
                                RM {spSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex flex-col border-t border-orange-500/15 pt-2.5">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">ROAS</span>
                            <span className="text-lg font-black font-mono text-orange-600 dark:text-orange-400">
                                {spRoas.toFixed(2)}x
                            </span>
                        </div>
                        <div className="flex flex-col border-t border-orange-500/15 pt-2.5">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Est. Total Month</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-black font-mono text-foreground">
                                    RM {dayRangeEnd > 0 ? (spSales / dayRangeEnd * daysInTargetMonth).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                                </span>
                                <span className={cn(
                                    "text-[9px] font-extrabold font-mono",
                                    (spMonthlyTarget > 0 && dayRangeEnd > 0 ? (spSales / dayRangeEnd * daysInTargetMonth) / spMonthlyTarget * 100 : 0) >= 100
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-500 dark:text-amber-400"
                                )}>
                                    ({spMonthlyTarget > 0 && dayRangeEnd > 0 ? ((spSales / dayRangeEnd * daysInTargetMonth) / spMonthlyTarget * 100).toFixed(0) : 0}%)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Ringkasan Bulanan Table */}
            <div className={cn(
                "rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4 border",
                isExport ? "bg-white border-border" : "bg-muted/20 dark:bg-muted/20 border-border/60"
            )}>
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground font-mono">
                        Ringkasan Bulanan (MTD Day 1 - {dayRangeEnd})
                    </span>
                </div>
                
                <div className="overflow-x-auto scrollbar-thin touch-scroll">
                    <table className="w-full min-w-[580px] text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border/60 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">
                                <th className="py-2.5 px-4">Month</th>
                                <th className="py-2.5 px-4 text-right">TikTok Sales</th>
                                <th className="py-2.5 px-4 text-right">Shopee Sales</th>
                                <th className="py-2.5 px-4 text-right">Total Sales</th>
                                <th className="py-2.5 px-4 text-right">Ad Spend</th>
                                <th className="py-2.5 px-4 text-right">Blended ROAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trendItems.map((item: any) => {
                                const isCurrent = item.monthKey === targetMonth;
                                return (
                                    <tr 
                                        key={item.monthKey} 
                                        className={cn(
                                            "border-b border-border/40 hover:bg-muted/20 text-xs font-semibold transition-colors",
                                            isCurrent && "bg-indigo-500/10 dark:bg-indigo-950/20 font-bold border-l-2 border-l-indigo-600 dark:border-l-indigo-400"
                                        )}
                                    >
                                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                                            {item.monthLabel}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-pink-600 dark:text-pink-400 font-bold">
                                            RM {item.tiktok.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-orange-600 dark:text-orange-400 font-bold">
                                            RM {item.shopee.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                                            RM {item.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-foreground/80 dark:text-foreground">
                                            RM {item.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                            {item.roas.toFixed(2)}x
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/60 pt-5 gap-2 text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-widest">
                    HIMWELLNESS & WEROCA ECOMMERCE GROUP
                </span>
                <span className="text-[9px] font-mono">
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
    isExport?: boolean;
}

export default MtdReportTab;
