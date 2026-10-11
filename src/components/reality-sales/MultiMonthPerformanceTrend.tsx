"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from "recharts";
import {
    TrendingUp,
    Target,
    Layers,
    Calendar,
    Megaphone,
    Radio,
    Share2,
    Globe,
    CheckCircle2,
    AlertCircle,
    Edit3,
    Lock,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type TrendCategory = "overall" | "creative" | "livehost" | "affiliate";

interface MultiMonthPerformanceTrendProps {
    year: number;
    canEditTarget: boolean;
    onEditTarget: (department: "overall" | "marketing" | "livehost" | "affiliate", label: string, month: string, currentTarget: number) => void;
}

interface TrendMonthItem {
    monthKey: string;
    monthNum: number;
    monthLabel: string;
    overall: { target: number; actual: number; attainmentRate: number; variance: number };
    creative: { target: number; actual: number; attainmentRate: number; variance: number };
    livehost: { target: number; actual: number; attainmentRate: number; variance: number };
    affiliate: { target: number; actual: number; attainmentRate: number; variance: number };
}

interface TrendResponse {
    success: boolean;
    year: number;
    currentMonth: number;
    maxMonth: number;
    trends: TrendMonthItem[];
    ytdSummary: Record<TrendCategory, { totalTarget: number; totalActual: number; attainmentRate: number; variance: number }>;
}

const CATEGORY_CONFIG: Record<
    TrendCategory,
    {
        label: string;
        dbKey: "overall" | "marketing" | "livehost" | "affiliate";
        icon: any;
        color: string;
        lineColor: string;
        bgColor: string;
        badgeColor: string;
        desc: string;
    }
> = {
    overall: {
        label: "Overall Sales",
        dbKey: "overall",
        icon: Globe,
        color: "#6366f1", // indigo
        lineColor: "#10b981", // emerald
        bgColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
        badgeColor: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
        desc: "Total Company Marketplace & Ecommerce GMV (TikTok Shop + Shopee)",
    },
    creative: {
        label: "Creative Sales",
        dbKey: "marketing",
        icon: Megaphone,
        color: "#a855f7", // purple
        lineColor: "#eab308", // amber
        bgColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        badgeColor: "border-purple-500/30 text-purple-400 bg-purple-500/10",
        desc: "Marketing Video Creation GMV (Direct & Attributed Video Tracking)",
    },
    livehost: {
        label: "Live Host Sales",
        dbKey: "livehost",
        icon: Radio,
        color: "#3b82f6", // blue
        lineColor: "#14b8a6", // teal
        bgColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        badgeColor: "border-blue-500/30 text-blue-400 bg-blue-500/10",
        desc: "Live Host Session Stream GMV (Internal, ReLive & External Hosts)",
    },
    affiliate: {
        label: "Affiliate Sales",
        dbKey: "affiliate",
        icon: Share2,
        color: "#10b981", // emerald
        lineColor: "#f97316", // orange
        bgColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        badgeColor: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
        desc: "External Creator Recruitment & Affiliate Sales Records",
    },
};

export default function MultiMonthPerformanceTrend({
    year,
    canEditTarget,
    onEditTarget,
}: MultiMonthPerformanceTrendProps) {
    const [selectedCategory, setSelectedCategory] = useState<TrendCategory>("overall");
    const [data, setData] = useState<TrendResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTrends = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/reality-sales?action=trends&year=${year}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            const json: TrendResponse = await res.json();
            setData(json);
        } catch (err: any) {
            console.error("[MultiMonthPerformanceTrend] Error loading trends:", err);
            setError(err.message || "Failed to load trend data");
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => {
        fetchTrends();
    }, [fetchTrends]);

    const activeConfig = CATEGORY_CONFIG[selectedCategory];

    // Format chart dataset based on selected category
    const chartData = useMemo(() => {
        if (!data?.trends) return [];
        return data.trends.map((m) => {
            const catData = m[selectedCategory];
            return {
                monthLabel: m.monthLabel,
                monthKey: m.monthKey,
                monthNum: m.monthNum,
                target: catData?.target || 0,
                actual: catData?.actual || 0,
                attainmentRate: catData?.attainmentRate || 0,
                variance: catData?.variance || 0,
            };
        });
    }, [data, selectedCategory]);

    const activeYtd = data?.ytdSummary?.[selectedCategory] || {
        totalTarget: 0,
        totalActual: 0,
        attainmentRate: 0,
        variance: 0,
    };

    return (
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-md">
            <CardHeader className="border-b border-border/40 pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <span>Target vs Actual Sales Pattern</span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                        Bulan 1 &rarr; {data?.maxMonth || "Latest"} ({year})
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                    Historical multi-month performance tracking across centralized departments.
                                </CardDescription>
                            </div>
                        </div>
                    </div>

                    {/* Category Selector Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50 self-start lg:self-auto">
                        {(Object.keys(CATEGORY_CONFIG) as TrendCategory[]).map((catKey) => {
                            const cfg = CATEGORY_CONFIG[catKey];
                            const Icon = cfg.icon;
                            const isSelected = selectedCategory === catKey;
                            return (
                                <button
                                    key={catKey}
                                    type="button"
                                    onClick={() => setSelectedCategory(catKey)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                        isSelected
                                            ? "bg-primary text-primary-foreground shadow-xs font-bold"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    <span>{cfg.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-6">
                {/* YTD Performance Summary Ribbon */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Target className="h-3 w-3 text-primary" /> Target YTD
                        </span>
                        <div className="text-lg sm:text-xl font-mono font-bold text-foreground mt-1">
                            RM {activeYtd.totalTarget.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Sum of monthly targets in DB</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Actual Sales YTD
                        </span>
                        <div className="text-lg sm:text-xl font-mono font-bold text-foreground mt-1">
                            RM {activeYtd.totalActual.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Cumulative realized revenue</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Attainment Rate YTD
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg sm:text-xl font-mono font-bold text-foreground">
                                {activeYtd.attainmentRate.toFixed(1)}%
                            </span>
                            <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold uppercase ${
                                    activeYtd.attainmentRate >= 100
                                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                                        : activeYtd.attainmentRate >= 85
                                        ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                        : "border-rose-500/40 text-rose-400 bg-rose-500/10"
                                }`}
                            >
                                {activeYtd.attainmentRate >= 100 ? "On Target" : "Pacing Behind"}
                            </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Actual vs Target Pace</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Net Variance YTD
                        </span>
                        <div
                            className={`text-lg sm:text-xl font-mono font-bold mt-1 ${
                                activeYtd.variance >= 0 ? "text-emerald-500" : "text-rose-500"
                            }`}
                        >
                            {activeYtd.variance >= 0 ? "+" : ""}
                            RM {activeYtd.variance.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                            {activeYtd.variance >= 0 ? "Surplus above target" : "Deficit below target"}
                        </span>
                    </div>
                </div>

                {/* Graph Card */}
                <div className="p-4 rounded-xl border border-border/60 bg-card/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span>{activeConfig.label} Trend Graph</span>
                                <Badge variant="outline" className={`text-[10px] ${activeConfig.badgeColor}`}>
                                    {activeConfig.desc}
                                </Badge>
                            </h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-block w-3 h-3 rounded-xs" style={{ backgroundColor: activeConfig.color }} />
                            <span>Actual Sales</span>
                            <span className="inline-block w-3 h-1 rounded-xs ml-2" style={{ backgroundColor: activeConfig.lineColor }} />
                            <span>Target (DB)</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin text-primary" /> Loading trend pattern...
                        </div>
                    ) : error ? (
                        <div className="h-[280px] flex flex-col items-center justify-center text-xs text-rose-500 space-y-2">
                            <AlertCircle className="h-6 w-6" />
                            <span>{error}</span>
                            <Button size="sm" variant="outline" onClick={fetchTrends} className="h-7 text-xs">
                                Try Again
                            </Button>
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
                            No monthly sales records found for {year}
                        </div>
                    ) : (
                        <div className="w-full h-[280px]">
                            <ResponsiveContainer width="100%" height={280}>
                                <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} vertical={false} />
                                    <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={10}
                                        tickLine={false}
                                        tickFormatter={(val: number) => `RM ${(val / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#0f172a",
                                            borderColor: "#334155",
                                            borderRadius: "8px",
                                            color: "#f8fafc",
                                            fontSize: "12px",
                                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
                                        }}
                                        formatter={(val: any, name: any) => {
                                            const num = Number(val || 0);
                                            const formatted = `RM ${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                                            if (name === "actual") return [formatted, "📊 Actual Sales"];
                                            if (name === "target") return [formatted, "🎯 Monthly Target"];
                                            return [formatted, name];
                                        }}
                                    />
                                    <Bar
                                        dataKey="actual"
                                        name="actual"
                                        fill={activeConfig.color}
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={45}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="target"
                                        name="target"
                                        stroke={activeConfig.lineColor}
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: activeConfig.lineColor }}
                                        activeDot={{ r: 6 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Month-by-Month Detail Matrix */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" /> Month-by-Month Breakdown (Bulan 1 &rarr; Latest)
                        </h4>
                        {!canEditTarget && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border flex items-center gap-1">
                                <Lock className="h-2.5 w-2.5" /> View Only (PIC Can Edit)
                            </Badge>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {chartData.map((m) => {
                            const isMet = m.attainmentRate >= 100;
                            return (
                                <div
                                    key={m.monthKey}
                                    className="p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/40 transition-all space-y-2 relative group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-foreground">{m.monthLabel}</span>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-mono ${
                                                isMet
                                                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                                                    : m.attainmentRate >= 80
                                                    ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                                    : "border-rose-500/40 text-rose-400 bg-rose-500/10"
                                            }`}
                                        >
                                            {m.attainmentRate.toFixed(1)}%
                                        </Badge>
                                    </div>

                                    <div className="space-y-1 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-[11px]">Actual:</span>
                                            <span className="font-mono font-bold text-foreground">
                                                RM {m.actual.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-[11px]">Target:</span>
                                            <span className="font-mono text-muted-foreground">
                                                RM {m.target.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px]">
                                            <span className="text-muted-foreground">Variance:</span>
                                            <span
                                                className={`font-mono font-semibold ${
                                                    m.variance >= 0 ? "text-emerald-500" : "text-rose-500"
                                                }`}
                                            >
                                                {m.variance >= 0 ? "+" : ""}RM {m.variance.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action: Edit Target if authorized PIC / Admin */}
                                    {canEditTarget && (
                                        <div className="pt-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onEditTarget(activeConfig.dbKey, activeConfig.label, m.monthKey, m.target)}
                                                className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground hover:bg-primary/10 gap-1 border border-border/40"
                                            >
                                                <Edit3 className="h-3 w-3" />
                                                <span>Set Target for {m.monthLabel}</span>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
