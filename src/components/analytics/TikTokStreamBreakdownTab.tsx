"use client";

import React, { useState, useEffect } from "react";
import {
    Activity,
    AlertCircle,
    ArrowUpRight,
    BarChart3,
    Boxes,
    CheckCircle2,
    Clock,
    DollarSign,
    Layers,
    Loader2,
    Megaphone,
    Percent,
    PieChart as PieChartIcon,
    RefreshCw,
    Share2,
    Sparkles,
    Table as TableIcon,
    TrendingUp,
    Users,
    Video,
    Zap,
    Radio
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleDatePicker, DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { cn } from "@/lib/utils";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from "recharts";

interface StreamSummaryItem {
    gmv: number;
    percentage: number;
}

interface LivehostCategoryData {
    category: string;
    label: string;
    shopeeGmv: number;
    tiktokGmv: number;
    totalGmv: number;
    sessions: number;
}

interface StreamBreakdownResponse {
    success: boolean;
    dateRange: { startDate: string; endDate: string };
    summary: {
        totalGmv: number;
        totalLive: StreamSummaryItem;
        liveInternal: StreamSummaryItem;
        liveExternal: StreamSummaryItem;
        liveReLive: StreamSummaryItem;
        liveDrSamhan: StreamSummaryItem;
        liveAiLive: StreamSummaryItem;
        affiliateExternal: StreamSummaryItem;
        videoInternal: StreamSummaryItem;
        others: StreamSummaryItem;
    };
    livehostSystemData: LivehostCategoryData[];
    dailyTrend: {
        date: string;
        totalGmv: number;
        totalLive: number;
        liveInternal: number;
        liveExternal: number;
        liveReLive: number;
        liveDrSamhan: number;
        liveAiLive: number;
        affiliateExternal: number;
        videoInternal: number;
        others: number;
    }[];
    details: {
        topHosts: {
            name: string;
            category: string;
            platform: string;
            gmv: number;
            sessions: number;
        }[];
        topAffiliates: {
            username: string;
            totalGmv: number;
            videoGmv: number;
            liveGmv: number;
        }[];
        topVideoCreators: {
            name: string;
            gmv: number;
            videoCount: number;
        }[];
    };
}

interface TikTokStreamBreakdownTabProps {
    startDate: string;
    setStartDate: (d: string) => void;
    endDate: string;
    setEndDate: (d: string) => void;
    activePreset: DatePreset;
    setActivePreset: (p: DatePreset) => void;
}

const COLORS = {
    totalLive: "#10b981",       // Emerald
    liveInternal: "#10b981",    // Emerald
    liveExternal: "#0ea5e9",    // Sky
    liveReLive: "#8b5cf6",      // Purple
    liveDrSamhan: "#ec4899",    // Pink
    liveAiLive: "#06b6d4",      // Cyan
    affiliateExternal: "#f59e0b", // Amber
    videoInternal: "#eab308",   // Yellow
    others: "#64748b",          // Slate
};

export default function TikTokStreamBreakdownTab({
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    activePreset,
    setActivePreset,
}: TikTokStreamBreakdownTabProps) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<StreamBreakdownResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeDrilldown, setActiveDrilldown] = useState<"hosts" | "affiliates" | "videos">("hosts");
    const [livehostViewMode, setLivehostViewMode] = useState<"consolidated" | "detailed">("detailed");

    const fetchData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/analytics/tiktok-stream-breakdown?startDate=${startDate}&endDate=${endDate}`,
                { cache: "no-store" }
            );
            const json = await res.json();
            if (json.success) {
                setData(json);
            } else {
                setError(json.error || "Failed to load stream breakdown data");
            }
        } catch (err: any) {
            setError(err.message || "Network error loading breakdown data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const formatCurrency = (val?: number) => {
        if (typeof val !== "number") return "RM 0.00";
        return new Intl.NumberFormat("en-MY", {
            style: "currency",
            currency: "MYR",
            minimumFractionDigits: 2,
        }).format(val);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const row = payload[0].payload;
            return (
                <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl text-xs space-y-2 min-w-64">
                    <div className="font-semibold text-foreground border-b border-border/40 pb-1 flex justify-between">
                        <span>{label}</span>
                        <span className="text-primary font-bold">{formatCurrency(row.totalGmv)}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-400">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Livehost (Internal)
                            </span>
                            <span className="font-mono font-medium">{formatCurrency(row.liveInternal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sky-400">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-sky-500" />
                                Livehost (External)
                            </span>
                            <span className="font-mono font-medium">{formatCurrency(row.liveExternal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-purple-400">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-purple-500" />
                                Livehost (ReLive)
                            </span>
                            <span className="font-mono font-medium">{formatCurrency(row.liveReLive)}</span>
                        </div>
                        <div className="flex items-center justify-between text-pink-400">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-pink-500" />
                                Livehost (DrSamhan)
                            </span>
                            <span className="font-mono font-medium">{formatCurrency(row.liveDrSamhan)}</span>
                        </div>
                        {row.liveAiLive > 0 && (
                            <div className="flex items-center justify-between text-cyan-400">
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                    Livehost (AiLive)
                                </span>
                                <span className="font-mono font-medium">{formatCurrency(row.liveAiLive)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-amber-400 border-t border-border/20 pt-1">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                Affiliate (External)
                            </span>
                            <span className="font-mono font-medium">{formatCurrency(row.affiliateExternal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-yellow-400">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                                Video Beg Kuning
                            </span>
                            <span className="font-mono font-medium">{formatCurrency(row.videoInternal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 border-t border-border/30 pt-1">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-slate-500" />
                                Others (Organic)
                            </span>
                            <span className="font-mono font-medium">{formatCurrency(row.others)}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Toolbar Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/80 dark:bg-muted/30 border border-border dark:border-border/50 p-3.5 rounded-xl backdrop-blur-sm select-none">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1 mr-1">
                        <Share2 className="h-3.5 w-3.5 text-primary" />
                        Sales Stream Breakdown:
                    </span>

                    <SimpleDatePicker
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        activePreset={activePreset}
                        onPresetChange={setActivePreset}
                    />

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchData(true)}
                        disabled={refreshing || loading}
                        className="h-8 gap-1.5 text-xs cursor-pointer shadow-xs ml-auto sm:ml-0"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
                        {refreshing ? "Re-syncing..." : "Sync Streams"}
                    </Button>
                </div>

                <Badge
                    variant="outline"
                    className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5 font-semibold text-xs px-3 py-1 self-end sm:self-auto rounded-md shadow-xs flex items-center gap-1.5"
                >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Multi-System Reconciliation Live
                </Badge>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold">Failed to reconcile stream breakdown</p>
                        <p className="text-xs opacity-90 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {loading && !data ? (
                <div className="h-72 flex flex-col items-center justify-center bg-card/20 backdrop-blur-md rounded-2xl border border-border/30 text-muted-foreground gap-3">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-xs font-semibold uppercase tracking-wider">
                        Reconciling Livehost, Affiliate & Video streams...
                    </p>
                </div>
            ) : data ? (
                <>
                    {/* ── LIVEHOST SYSTEM BREAKDOWN SECTION ── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Radio className="h-4 w-4 text-emerald-400" />
                                <span>Livehost System Breakdown (by Category & Platform)</span>
                            </h2>
                            <span className="text-xs text-muted-foreground">
                                Sourced from hw-livehost-management
                            </span>
                        </div>

                        {/* 5 Category Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {data.livehostSystemData.map((item) => {
                                const isInternal = item.category === "INTERNAL";
                                const isExternal = item.category === "EXTERNAL";
                                const isRelive = item.category === "RELIVE";
                                const isDrSamhan = item.category === "DR_SAMHAN";

                                const borderCol = isInternal ? "border-emerald-500/40"
                                    : isExternal ? "border-sky-500/40"
                                    : isRelive ? "border-purple-500/40"
                                    : isDrSamhan ? "border-pink-500/40"
                                    : "border-cyan-500/40";

                                const badgeBg = isInternal ? "bg-emerald-500/10 text-emerald-400"
                                    : isExternal ? "bg-sky-500/10 text-sky-400"
                                    : isRelive ? "bg-purple-500/10 text-purple-400"
                                    : isDrSamhan ? "bg-pink-500/10 text-pink-400"
                                    : "bg-cyan-500/10 text-cyan-400";

                                return (
                                    <Card key={item.category} className={`bg-card/70 border ${borderCol} shadow-xs relative overflow-hidden`}>
                                        <CardHeader className="p-3.5 pb-1">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeBg}`}>
                                                    {item.label}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {item.sessions} sessions
                                                </span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-3.5 pt-1 space-y-2">
                                            <div className="text-lg font-extrabold text-foreground">
                                                {formatCurrency(item.totalGmv)}
                                            </div>
                                            <div className="border-t border-border/30 pt-1.5 space-y-1 text-[11px]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">TikTok:</span>
                                                    <span className="font-mono font-medium text-foreground">
                                                        {formatCurrency(item.tiktokGmv)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Shopee:</span>
                                                    <span className="font-mono font-medium text-foreground">
                                                        {formatCurrency(item.shopeeGmv)}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── TIKTOK TOTAL & STREAMS RECONCILIATION ── */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-primary" />
                                <span>TikTok Sales Streams & Others Deduction</span>
                            </h2>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span>Livehost View:</span>
                                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md">
                                    <button
                                        onClick={() => setLivehostViewMode("detailed")}
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                                            livehostViewMode === "detailed" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                                        )}
                                    >
                                        5 Categories
                                    </button>
                                    <button
                                        onClick={() => setLivehostViewMode("consolidated")}
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                                            livehostViewMode === "consolidated" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                                        )}
                                    >
                                        Consolidated Live
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* TikTok KPI Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Total TikTok GMV */}
                            <Card className="bg-card/70 border-border/40 shadow-xs relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-500" />
                                <CardHeader className="p-3.5 pb-1">
                                    <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                        <span>Total TikTok Sales</span>
                                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3.5 pt-0">
                                    <div className="text-xl font-bold text-foreground mt-1">
                                        {formatCurrency(data.summary.totalGmv)}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Core marketplace recorded (100%)
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Total Livehost on TikTok */}
                            <Card className="bg-card/70 border-border/40 shadow-xs relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                                <CardHeader className="p-3.5 pb-1">
                                    <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                        <span>Total Livehost (TikTok)</span>
                                        <Video className="h-3.5 w-3.5 text-emerald-500" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3.5 pt-0">
                                    <div className="text-xl font-bold text-emerald-400 mt-1">
                                        {formatCurrency(data.summary.totalLive.gmv)}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold">
                                            {data.summary.totalLive.percentage}%
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">Internal, Ext, ReLive, Samhan, AI</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Affiliate External */}
                            <Card className="bg-card/70 border-border/40 shadow-xs relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                                <CardHeader className="p-3.5 pb-1">
                                    <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                        <span>Affiliate (External)</span>
                                        <Users className="h-3.5 w-3.5 text-amber-500" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3.5 pt-0">
                                    <div className="text-xl font-bold text-amber-400 mt-1">
                                        {formatCurrency(data.summary.affiliateExternal.gmv)}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20 font-semibold">
                                            {data.summary.affiliateExternal.percentage}%
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">From affiliate system</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Video Beg Kuning + Others */}
                            <Card className="bg-card/70 border-border/40 shadow-xs relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-500" />
                                <CardHeader className="p-3.5 pb-1">
                                    <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                        <span>Video Kuning & Others</span>
                                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3.5 pt-0 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-yellow-400 font-medium">Video Beg Kuning:</span>
                                        <span className="font-mono text-xs font-bold text-yellow-400">{formatCurrency(data.summary.videoInternal.gmv)}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-border/30 pt-1">
                                        <span className="text-xs text-slate-300 font-medium">Others (Organic):</span>
                                        <span className="font-mono text-xs font-bold text-slate-300">{formatCurrency(data.summary.others.gmv)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Proportional Contribution Bar */}
                    <Card className="border-border/40 bg-card/60 shadow-xs">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <PieChartIcon className="h-4 w-4 text-primary" />
                                    TikTok Revenue Composition (100% Reconciled)
                                </CardTitle>
                                <span className="text-xs text-muted-foreground">
                                    Total: {formatCurrency(data.summary.totalGmv)}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 space-y-3">
                            {/* Horizontal Multi-Color Stacked Bar */}
                            <div className="h-6 w-full rounded-full overflow-hidden flex bg-muted/40 p-0.5 gap-0.5 shadow-inner">
                                {data.summary.liveInternal.percentage > 0 && (
                                    <div
                                        style={{ width: `${data.summary.liveInternal.percentage}%`, backgroundColor: COLORS.liveInternal }}
                                        className="h-full rounded-l-full transition-all duration-500 relative group cursor-pointer"
                                        title={`Internal Host: ${data.summary.liveInternal.percentage}% (${formatCurrency(data.summary.liveInternal.gmv)})`}
                                    />
                                )}
                                {data.summary.liveExternal.percentage > 0 && (
                                    <div
                                        style={{ width: `${data.summary.liveExternal.percentage}%`, backgroundColor: COLORS.liveExternal }}
                                        className="h-full transition-all duration-500 relative group cursor-pointer"
                                        title={`External Host: ${data.summary.liveExternal.percentage}% (${formatCurrency(data.summary.liveExternal.gmv)})`}
                                    />
                                )}
                                {data.summary.liveReLive.percentage > 0 && (
                                    <div
                                        style={{ width: `${data.summary.liveReLive.percentage}%`, backgroundColor: COLORS.liveReLive }}
                                        className="h-full transition-all duration-500 relative group cursor-pointer"
                                        title={`ReLive: ${data.summary.liveReLive.percentage}% (${formatCurrency(data.summary.liveReLive.gmv)})`}
                                    />
                                )}
                                {data.summary.liveDrSamhan.percentage > 0 && (
                                    <div
                                        style={{ width: `${data.summary.liveDrSamhan.percentage}%`, backgroundColor: COLORS.liveDrSamhan }}
                                        className="h-full transition-all duration-500 relative group cursor-pointer"
                                        title={`DrSamhan: ${data.summary.liveDrSamhan.percentage}% (${formatCurrency(data.summary.liveDrSamhan.gmv)})`}
                                    />
                                )}
                                {data.summary.affiliateExternal.percentage > 0 && (
                                    <div
                                        style={{ width: `${data.summary.affiliateExternal.percentage}%`, backgroundColor: COLORS.affiliateExternal }}
                                        className="h-full transition-all duration-500 relative group cursor-pointer"
                                        title={`Affiliate External: ${data.summary.affiliateExternal.percentage}% (${formatCurrency(data.summary.affiliateExternal.gmv)})`}
                                    />
                                )}
                                {data.summary.videoInternal.percentage > 0 && (
                                    <div
                                        style={{ width: `${data.summary.videoInternal.percentage}%`, backgroundColor: COLORS.videoInternal }}
                                        className="h-full transition-all duration-500 relative group cursor-pointer"
                                        title={`Video Beg Kuning: ${data.summary.videoInternal.percentage}% (${formatCurrency(data.summary.videoInternal.gmv)})`}
                                    />
                                )}
                                {data.summary.others.percentage > 0 && (
                                    <div
                                        style={{ width: `${data.summary.others.percentage}%`, backgroundColor: COLORS.others }}
                                        className="h-full rounded-r-full transition-all duration-500 relative group cursor-pointer"
                                        title={`Others: ${data.summary.others.percentage}% (${formatCurrency(data.summary.others.gmv)})`}
                                    />
                                )}
                            </div>

                            {/* Legend Tags */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.liveInternal }} />
                                    <span className="font-medium text-foreground">Live Internal:</span>
                                    <span className="text-muted-foreground">{data.summary.liveInternal.percentage}%</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.liveExternal }} />
                                    <span className="font-medium text-foreground">Live External:</span>
                                    <span className="text-muted-foreground">{data.summary.liveExternal.percentage}%</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.liveReLive }} />
                                    <span className="font-medium text-foreground">ReLive:</span>
                                    <span className="text-muted-foreground">{data.summary.liveReLive.percentage}%</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.liveDrSamhan }} />
                                    <span className="font-medium text-foreground">DrSamhan:</span>
                                    <span className="text-muted-foreground">{data.summary.liveDrSamhan.percentage}%</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.affiliateExternal }} />
                                    <span className="font-medium text-foreground">Affiliate Ext:</span>
                                    <span className="text-muted-foreground">{data.summary.affiliateExternal.percentage}%</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.videoInternal }} />
                                    <span className="font-medium text-foreground">Video Kuning:</span>
                                    <span className="text-muted-foreground">{data.summary.videoInternal.percentage}%</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.others }} />
                                    <span className="font-medium text-foreground">Others:</span>
                                    <span className="text-muted-foreground">{data.summary.others.percentage}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Daily Trend Stacked Bar Chart */}
                    <Card className="border-border/40 bg-card/60 shadow-xs">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                Daily Sales Stream Trajectory (Stacked GMV)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.dailyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#888888"
                                            fontSize={11}
                                            tickLine={false}
                                            tickFormatter={(val) => {
                                                const parts = val.split("-");
                                                return `${parts[1]}/${parts[2]}`;
                                            }}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={11}
                                            tickLine={false}
                                            tickFormatter={(val) => `RM ${(val / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend
                                            verticalAlign="top"
                                            align="right"
                                            wrapperStyle={{ paddingBottom: "12px", fontSize: "11px" }}
                                        />
                                        <Bar dataKey="liveInternal" name="Live (Internal)" stackId="a" fill={COLORS.liveInternal} />
                                        <Bar dataKey="liveExternal" name="Live (External)" stackId="a" fill={COLORS.liveExternal} />
                                        <Bar dataKey="liveReLive" name="ReLive" stackId="a" fill={COLORS.liveReLive} />
                                        <Bar dataKey="liveDrSamhan" name="DrSamhan" stackId="a" fill={COLORS.liveDrSamhan} />
                                        <Bar dataKey="affiliateExternal" name="Affiliate (Ext)" stackId="a" fill={COLORS.affiliateExternal} />
                                        <Bar dataKey="videoInternal" name="Video Kuning" stackId="a" fill={COLORS.videoInternal} />
                                        <Bar dataKey="others" name="Others" stackId="a" fill={COLORS.others} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Data Table */}
                    <Card className="border-border/40 bg-card/60 shadow-xs">
                        <CardHeader className="p-4 pb-2 border-b border-border/30">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <TableIcon className="h-4 w-4 text-primary" />
                                    Daily Breakdown Log
                                </CardTitle>
                                <span className="text-[11px] text-muted-foreground">
                                    {data.dailyTrend.length} recorded days
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/50 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase">
                                        <tr>
                                            <th className="py-2.5 px-4">Date</th>
                                            <th className="py-2.5 px-4 text-right">Total GMV</th>
                                            <th className="py-2.5 px-4 text-right text-emerald-400">Live (Int)</th>
                                            <th className="py-2.5 px-4 text-right text-sky-400">Live (Ext)</th>
                                            <th className="py-2.5 px-4 text-right text-purple-400">ReLive</th>
                                            <th className="py-2.5 px-4 text-right text-pink-400">DrSamhan</th>
                                            <th className="py-2.5 px-4 text-right text-amber-400">Affiliate (Ext)</th>
                                            <th className="py-2.5 px-4 text-right text-yellow-400">Video Kuning</th>
                                            <th className="py-2.5 px-4 text-right text-slate-300">Others</th>
                                            <th className="py-2.5 px-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20 font-mono">
                                        {data.dailyTrend.map((row) => (
                                            <tr key={row.date} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-2 px-4 font-sans font-medium text-foreground">
                                                    {row.date}
                                                </td>
                                                <td className="py-2 px-4 text-right font-bold text-foreground">
                                                    {formatCurrency(row.totalGmv)}
                                                </td>
                                                <td className="py-2 px-4 text-right text-emerald-400">
                                                    {formatCurrency(row.liveInternal)}
                                                </td>
                                                <td className="py-2 px-4 text-right text-sky-400">
                                                    {formatCurrency(row.liveExternal)}
                                                </td>
                                                <td className="py-2 px-4 text-right text-purple-400">
                                                    {formatCurrency(row.liveReLive)}
                                                </td>
                                                <td className="py-2 px-4 text-right text-pink-400">
                                                    {formatCurrency(row.liveDrSamhan)}
                                                </td>
                                                <td className="py-2 px-4 text-right text-amber-400">
                                                    {formatCurrency(row.affiliateExternal)}
                                                </td>
                                                <td className="py-2 px-4 text-right text-yellow-400">
                                                    {formatCurrency(row.videoInternal)}
                                                </td>
                                                <td className="py-2 px-4 text-right text-slate-300">
                                                    {formatCurrency(row.others)}
                                                </td>
                                                <td className="py-2 px-4 text-center">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-sans text-emerald-400 font-semibold">
                                                        <CheckCircle2 className="h-3 w-3" /> Reconciled
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Channel Drilldown Sub-Panel */}
                    <Card className="border-border/40 bg-card/60 shadow-xs">
                        <CardHeader className="p-4 pb-2 border-b border-border/30">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        Channel Performer Drilldown
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Top individual contributors behind the stream numbers
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg">
                                    <button
                                        onClick={() => setActiveDrilldown("hosts")}
                                        className={cn(
                                            "text-xs px-3 py-1 rounded-md font-medium transition-all",
                                            activeDrilldown === "hosts" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Live Hosts ({data.details.topHosts.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveDrilldown("affiliates")}
                                        className={cn(
                                            "text-xs px-3 py-1 rounded-md font-medium transition-all",
                                            activeDrilldown === "affiliates" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Affiliates ({data.details.topAffiliates.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveDrilldown("videos")}
                                        className={cn(
                                            "text-xs px-3 py-1 rounded-md font-medium transition-all",
                                            activeDrilldown === "videos" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Video Handles ({data.details.topVideoCreators.length})
                                    </button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {activeDrilldown === "hosts" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {data.details.topHosts.map((h, i) => (
                                        <div key={i} className="p-3 rounded-lg border border-border/30 bg-background/50 flex items-center justify-between text-xs">
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                    <span>{h.name}</span>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[9px] px-1 py-0 ${
                                                            h.category === "INTERNAL"
                                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                : h.category === "EXTERNAL"
                                                                ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                                                : h.category === "RELIVE"
                                                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                                : "bg-pink-500/10 text-pink-400 border-pink-500/20"
                                                        }`}
                                                    >
                                                        {h.category} • {h.platform}
                                                    </Badge>
                                                </div>
                                                <div className="text-muted-foreground text-[11px]">
                                                    {h.sessions} live session{h.sessions > 1 ? "s" : ""}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-bold text-foreground">
                                                    {formatCurrency(h.gmv)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeDrilldown === "affiliates" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {data.details.topAffiliates.map((a, i) => (
                                        <div key={i} className="p-3 rounded-lg border border-border/30 bg-background/50 flex items-center justify-between text-xs">
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-foreground truncate max-w-40">
                                                    @{a.username}
                                                </div>
                                                <div className="text-muted-foreground text-[10px] flex items-center gap-2">
                                                    <span>Vid: {formatCurrency(a.videoGmv)}</span>
                                                    <span>Live: {formatCurrency(a.liveGmv)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-bold text-amber-400">
                                                    {formatCurrency(a.totalGmv)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeDrilldown === "videos" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {data.details.topVideoCreators.map((v, i) => (
                                        <div key={i} className="p-3 rounded-lg border border-border/30 bg-background/50 flex items-center justify-between text-xs">
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-foreground truncate max-w-40">
                                                    {v.name}
                                                </div>
                                                <div className="text-muted-foreground text-[11px]">
                                                    {v.videoCount} video record{v.videoCount > 1 ? "s" : ""}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-bold text-yellow-400">
                                                    {formatCurrency(v.gmv)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    );
}
