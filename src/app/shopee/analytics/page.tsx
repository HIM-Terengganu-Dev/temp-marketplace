"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import {
    ShoppingBag,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Percent,
    Layers,
    Store,
    ArrowRight,
    ArrowDown,
    Download,
    Search,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Eye,
    MousePointerClick,
    PlayCircle,
    SlidersHorizontal,
    BarChart3,
    Table as TableIcon,
    Sparkles,
    ExternalLink,
    Filter,
    ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleDatePicker, DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { SteppedFunnelPipeline, FunnelStage, FunnelTransition } from "@/components/analytics/SteppedFunnelPipeline";
import { cn } from "@/lib/utils";

// Dynamic Recharts to prevent SSR hydration errors
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const ComposedChart = dynamic(() => import("recharts").then(m => m.ComposedChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });

type ActiveTabMode = "ALL" | "COMBINED" | "SHOPEE" | "META";

interface ShopItem {
    id: number;
    shop_id: string;
    shop_name: string;
}

export default function ShopeeAnalyticsPage() {
    const { data: session } = useSession();

    // Filters
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [activePreset, setActivePreset] = useState<DatePreset>("weekly");
    const [selectedShopId, setSelectedShopId] = useState<string>("ALL");
    const [activeTab, setActiveTab] = useState<ActiveTabMode>("ALL");

    // Data states
    const [shops, setShops] = useState<ShopItem[]>([]);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Initial date setup (last 7 days in Asia/Kuala_Lumpur)
    useEffect(() => {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
        const past = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
        setStartDate(past);
        setEndDate(today);
    }, []);

    // Fetch available connected shops
    useEffect(() => {
        async function loadShops() {
            try {
                const res = await fetch("/api/shopee/shops");
                if (res.ok) {
                    const shopList = await res.json();
                    setShops(shopList || []);
                }
            } catch (err) {
                console.error("Failed to load Shopee shops:", err);
            }
        }
        loadShops();
    }, []);

    // Fetch analytics data
    const fetchAnalytics = useCallback(async (isRefresh = false) => {
        if (!startDate || !endDate) return;

        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                shopId: selectedShopId
            });

            const res = await fetch(`/api/shopee/analytics?${params.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${res.status}: Failed to load analytics`);
            }

            const json = await res.json();
            setData(json);
        } catch (err: any) {
            console.error("Shopee analytics fetch error:", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [startDate, endDate, selectedShopId]);

    useEffect(() => {
        if (startDate && endDate) {
            fetchAnalytics();
        }
    }, [startDate, endDate, selectedShopId, fetchAnalytics]);

    // Derived funnels
    const combined = data?.funnelCombined || { impressions: 0, thruplay: 0, thruplayRate: 0, clicks: 0, clickRate: 0, ctr: 0, totalOrders: 0, cvr: 0, overallCvr: 0 };
    const shopee = data?.funnelShopee || { impressions: 0, clicks: 0, ctr: 0, totalOrders: 0, adOrders: 0, cvr: 0, adCvr: 0, gmv: 0, spend: 0 };
    const meta = data?.funnelMeta || { impressions: 0, thruplay: 0, thruplayRate: 0, linkClicks: 0, clickRate: 0, ctr: 0, spend: 0 };
    const metaStatus = data?.metaStatus;

    // Funnel 1 Pipeline Configuration (Combined Shopee & Meta)
    const combinedYield = combined.impressions > 0 
        ? `${((combined.totalOrders / combined.impressions) * 100).toFixed(2)}%` 
        : "0.00%";

    const combinedStages: FunnelStage[] = useMemo(() => [
        {
            stepNumber: 1,
            name: "Impressions (Top of Funnel)",
            icon: <Eye className="h-3.5 w-3.5" />,
            value: combined.impressions,
            unitLabel: "views",
            badgeLabel: "100%",
            barLabel: `${combined.impressions.toLocaleString()} Impressions (100%)`,
            color: "blue",
            badgeStyle: "text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
        },
        ...(combined.thruplay > 0 ? [{
            stepNumber: 2,
            name: "Thruplay (6s Engaged Plays)",
            icon: <span>▶️</span>,
            value: combined.thruplay,
            unitLabel: "plays",
            badgeLabel: `${combined.thruplayRate}%`,
            barLabel: `${combined.thruplay.toLocaleString()} Plays (${combined.thruplayRate}%)`,
            color: "purple" as const,
            widthPercent: Math.max(30, Math.min(100, (combined.thruplay / Math.max(combined.impressions, 1)) * 100))
        }] : []),
        {
            stepNumber: combined.thruplay > 0 ? 3 : 2,
            name: "Anchor & Product Clicks",
            icon: <MousePointerClick className="h-3.5 w-3.5" />,
            value: combined.clicks,
            unitLabel: "clicks",
            badgeLabel: `${combined.thruplay > 0 ? combined.clickRate : combined.ctr}%`,
            barLabel: `${combined.clicks.toLocaleString()} Clicks (${combined.thruplay > 0 ? combined.clickRate : combined.ctr}%)`,
            color: "pink",
            widthPercent: Math.max(24, Math.min(100, (combined.clicks / Math.max(combined.impressions, 1)) * 100))
        },
        {
            stepNumber: combined.thruplay > 0 ? 4 : 3,
            name: "Total Completed Orders",
            icon: <ShoppingBag className="h-3.5 w-3.5" />,
            value: combined.totalOrders,
            unitLabel: "orders",
            badgeLabel: `CVR: ${combined.cvr}%`,
            barLabel: `${combined.totalOrders.toLocaleString()} Orders (${combined.cvr}%)`,
            color: "emerald",
            widthPercent: Math.max(20, Math.min(100, (combined.totalOrders / Math.max(combined.impressions, 1)) * 100))
        }
    ], [combined]);

    const combinedTransitions: FunnelTransition[] = useMemo(() => combined.thruplay > 0 ? [
        {
            label: "Retention",
            rate: combined.thruplayRate,
            dropOff: (100 - parseFloat(String(combined.thruplayRate || 0))).toFixed(2),
            color: "purple"
        },
        {
            label: "Retention",
            rate: combined.clickRate,
            dropOff: (100 - parseFloat(String(combined.clickRate || 0))).toFixed(2),
            color: "pink"
        },
        {
            label: "Conversion CVR",
            rate: combined.cvr,
            dropOff: (100 - parseFloat(String(combined.cvr || 0))).toFixed(2),
            color: "emerald"
        }
    ] : [
        {
            label: "Click-Through Rate (CTR)",
            rate: combined.ctr,
            dropOff: (100 - parseFloat(String(combined.ctr || 0))).toFixed(2),
            color: "pink"
        },
        {
            label: "Conversion CVR",
            rate: combined.cvr,
            dropOff: (100 - parseFloat(String(combined.cvr || 0))).toFixed(2),
            color: "emerald"
        }
    ], [combined]);

    // Funnel 2 Pipeline Configuration (Shopee Only)
    const shopeeYield = shopee.impressions > 0 
        ? `${((shopee.totalOrders / shopee.impressions) * 100).toFixed(2)}%` 
        : "0.00%";

    const shopeeStages: FunnelStage[] = useMemo(() => [
        {
            stepNumber: 1,
            name: "Impressions (Top of Funnel - Shopee CPC)",
            icon: <Eye className="h-3.5 w-3.5" />,
            value: shopee.impressions,
            unitLabel: "views",
            badgeLabel: "100%",
            barLabel: `${shopee.impressions.toLocaleString()} Impressions (100%)`,
            color: "blue",
            badgeStyle: "text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
        },
        {
            stepNumber: 2,
            name: "Product & Search Ad Clicks",
            icon: <MousePointerClick className="h-3.5 w-3.5" />,
            value: shopee.clicks,
            unitLabel: "clicks",
            badgeLabel: `${shopee.ctr}%`,
            barLabel: `${shopee.clicks.toLocaleString()} Clicks (${shopee.ctr}%)`,
            color: "pink",
            widthPercent: Math.max(25, Math.min(100, (shopee.clicks / Math.max(shopee.impressions, 1)) * 100))
        },
        {
            stepNumber: 3,
            name: "Total Completed Orders",
            icon: <ShoppingBag className="h-3.5 w-3.5" />,
            value: shopee.totalOrders,
            unitLabel: "orders",
            badgeLabel: `CVR: ${shopee.cvr}%`,
            barLabel: `${shopee.totalOrders.toLocaleString()} Orders (${shopee.cvr}%)`,
            color: "emerald",
            widthPercent: Math.max(20, Math.min(100, (shopee.totalOrders / Math.max(shopee.impressions, 1)) * 100)),
            extraNote: (
                <span className="text-[11px] text-muted-foreground">
                    Direct Ad Orders: <strong className="text-foreground">{shopee.adOrders?.toLocaleString() || 0}</strong> ({shopee.adCvr || 0}%) • GMV: <strong className="text-foreground">RM {shopee.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</strong>
                </span>
            )
        }
    ], [shopee]);

    const shopeeTransitions: FunnelTransition[] = useMemo(() => [
        {
            label: "Click-Through Rate (CTR)",
            rate: shopee.ctr,
            dropOff: (100 - parseFloat(String(shopee.ctr || 0))).toFixed(2),
            color: "pink"
        },
        {
            label: "Conversion CVR",
            rate: shopee.cvr,
            dropOff: (100 - parseFloat(String(shopee.cvr || 0))).toFixed(2),
            color: "emerald"
        }
    ], [shopee]);

    // Funnel 3 Pipeline Configuration (Meta Ads Only)
    const metaYield = meta.impressions > 0 
        ? `${((meta.linkClicks / meta.impressions) * 100).toFixed(2)}%` 
        : "0.00%";

    const metaStages: FunnelStage[] = useMemo(() => [
        {
            stepNumber: 1,
            name: "Impressions (Top of Funnel - Meta CPAS)",
            icon: <Eye className="h-3.5 w-3.5" />,
            value: meta.impressions,
            unitLabel: "views",
            badgeLabel: "100%",
            barLabel: `${meta.impressions.toLocaleString()} Impressions (100%)`,
            color: "purple",
            badgeStyle: "text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
        },
        {
            stepNumber: 2,
            name: "Thruplay (6s Engaged Plays)",
            icon: <span>▶️</span>,
            value: meta.thruplay,
            unitLabel: "plays",
            badgeLabel: `${meta.thruplayRate}%`,
            barLabel: `${meta.thruplay.toLocaleString()} Plays (${meta.thruplayRate}%)`,
            color: "pink",
            widthPercent: Math.max(30, Math.min(100, (meta.thruplay / Math.max(meta.impressions, 1)) * 100))
        },
        {
            stepNumber: 3,
            name: "Outbound Store Link Clicks",
            icon: <MousePointerClick className="h-3.5 w-3.5" />,
            value: meta.linkClicks,
            unitLabel: "clicks",
            badgeLabel: `CTR: ${meta.ctr}%`,
            barLabel: `${meta.linkClicks.toLocaleString()} Clicks (${meta.clickRate}%)`,
            color: "cyan",
            widthPercent: Math.max(22, Math.min(100, (meta.linkClicks / Math.max(meta.impressions, 1)) * 100))
        }
    ], [meta]);

    const metaTransitions: FunnelTransition[] = useMemo(() => [
        {
            label: "Retention (Watch Rate)",
            rate: meta.thruplayRate,
            dropOff: (100 - parseFloat(String(meta.thruplayRate || 0))).toFixed(2),
            color: "pink"
        },
        {
            label: "Retention (Click Rate)",
            rate: meta.clickRate,
            dropOff: (100 - parseFloat(String(meta.clickRate || 0))).toFixed(2),
            color: "cyan"
        }
    ], [meta]);

    // Export daily data to CSV
    const exportCSV = () => {
        if (!data?.dailyTrends || data.dailyTrends.length === 0) return;
        const headers = [
            "Date",
            "Combined Impressions",
            "Combined Clicks",
            "Combined CTR %",
            "Combined Orders",
            "Shopee Impressions",
            "Shopee Clicks",
            "Shopee CTR %",
            "Shopee Orders",
            "Meta Impressions",
            "Meta Thruplay",
            "Meta Link Clicks",
            "Meta Spend"
        ];
        const rows = data.dailyTrends.map((d: any) => [
            d.date,
            d.combinedImpressions,
            d.combinedClicks,
            d.combinedCtr,
            d.combinedOrders,
            d.shopeeImpressions,
            d.shopeeClicks,
            d.shopeeCtr,
            d.shopeeOrders,
            d.metaImpressions,
            d.metaThruplay,
            d.metaLinkClicks,
            d.metaSpend
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `shopee_analytics_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6 min-h-screen bg-background">
            {/* Header Area */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Shopee Analytics
                        </h1>
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30 px-2 py-0.5 font-semibold">
                            Shopee Only
                        </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Comprehensive funnel analytics for Shopee Store, Shopee CPC Ads & Meta CPAS Ads.
                    </p>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Shop Filter */}
                    <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-1.5 shadow-sm">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={selectedShopId}
                            onChange={(e) => setSelectedShopId(e.target.value)}
                            className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer text-foreground"
                            aria-label="Filter by Shopee Shop"
                        >
                            <option value="ALL" className="bg-popover text-popover-foreground">
                                All Connected Shops ({shops.length})
                            </option>
                            {shops.map((shop) => (
                                <option key={shop.shop_id} value={shop.shop_id} className="bg-popover text-popover-foreground">
                                    {shop.shop_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Picker */}
                    <SimpleDatePicker
                        startDate={startDate}
                        endDate={endDate}
                        setStartDate={setStartDate}
                        setEndDate={setEndDate}
                        activePreset={activePreset}
                        onPresetChange={setActivePreset}
                    />

                    {/* Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAnalytics(true)}
                        disabled={loading || refreshing}
                        className="h-9 px-3 gap-1.5 text-xs font-medium border-border/60 hover:bg-muted/60 rounded-xl shadow-sm"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", (loading || refreshing) && "animate-spin text-primary")} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>

                    {/* Export CSV */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportCSV}
                        disabled={loading || !data?.dailyTrends?.length}
                        className="h-9 px-3 gap-1.5 text-xs font-medium border-border/60 hover:bg-muted/60 rounded-xl shadow-sm"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                </div>
            </div>

            {/* Meta Token Alert (Non-blocking notification) */}
            {metaStatus && metaStatus.status === "token_expired" && (
                <div className="flex items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-500 text-xs shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
                        <span>
                            <strong>Meta Ads Token Status:</strong> Access token expired. Displaying cached metrics from database. Update <code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded text-[11px]">FB_ACCESS_TOKEN</code> to resume live Meta API queries.
                        </span>
                    </div>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px] uppercase font-bold shrink-0">
                        Cached Mode
                    </Badge>
                </div>
            )}

            {/* View Mode Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/30">
                <button
                    onClick={() => setActiveTab("ALL")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap",
                        activeTab === "ALL"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <Layers className="h-3.5 w-3.5" />
                    Overview (All 3 Funnels)
                </button>

                <button
                    onClick={() => setActiveTab("COMBINED")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap",
                        activeTab === "COMBINED"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    1. Shopee & Meta Ads
                </button>

                <button
                    onClick={() => setActiveTab("SHOPEE")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap",
                        activeTab === "SHOPEE"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    2. Shopee Only
                </button>

                <button
                    onClick={() => setActiveTab("META")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap",
                        activeTab === "META"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <PlayCircle className="h-3.5 w-3.5" />
                    3. Meta Ads Only
                </button>
            </div>

            {/* Main Content Loading State */}
            {loading ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
                        ))}
                    </div>
                    <div className="h-80 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
                </div>
            ) : error ? (
                <Card className="border-rose-500/30 bg-rose-500/5 p-8 text-center">
                    <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-foreground">Failed to Load Analytics</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{error}</p>
                    <Button size="sm" onClick={() => fetchAnalytics()} className="mt-4 gap-1.5 text-xs">
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                    </Button>
                </Card>
            ) : (
                <div className="space-y-8">
                    {/* ========================================================================= */}
                    {/* FUNNEL 1: TOTAL FUNNEL VIEW SHOPEE & META ADS                            */}
                    {/* ========================================================================= */}
                    {(activeTab === "ALL" || activeTab === "COMBINED") && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 text-[10px] font-bold px-2 py-0.5">
                                            FUNNEL 1
                                        </Badge>
                                        <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                                            Total Funnel View: Shopee & Meta Ads
                                        </h2>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Combined acquisition funnel aggregating Shopee CPC Ads and Meta CPAS Ads to Total Shopee Orders.
                                    </p>
                                </div>
                            </div>

                            {/* Funnel 1 Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Impressions */}
                                <Card className="border-border/50 bg-card/60 backdrop-blur shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-1 w-full bg-blue-500" />
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                1. Impressions
                                            </span>
                                            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                                <Eye className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                                                {combined.impressions.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    Shopee: <strong className="text-foreground">{combined.shopeeShare}%</strong>
                                                </span>
                                                <span>•</span>
                                                <span className="inline-flex items-center gap-1">
                                                    Meta: <strong className="text-foreground">{combined.metaShare}%</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CTR */}
                                <Card className="border-border/50 bg-card/60 backdrop-blur shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-1 w-full bg-indigo-500" />
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                2. CTR (Click-Through Rate)
                                            </span>
                                            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                                <MousePointerClick className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                                                {combined.ctr}%
                                            </div>
                                            <div className="mt-2 text-[11px] text-muted-foreground">
                                                Total Clicks: <strong className="text-foreground font-mono">{combined.clicks.toLocaleString()}</strong>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Total Order */}
                                <Card className="border-border/50 bg-card/60 backdrop-blur shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                3. Total Order
                                            </span>
                                            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                <ShoppingBag className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono text-emerald-500">
                                                {combined.totalOrders.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                                                <span>Click-to-Order: <strong className="text-foreground font-mono">{combined.cvr}%</strong></span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Stepped Funnel Pipeline */}
                            <SteppedFunnelPipeline
                                title="Omnichannel Conversion Funnel Pipeline"
                                subtitle="Visual customer journey from top-of-funnel impression to bottom-of-funnel completed order."
                                overallYield={combinedYield}
                                stages={combinedStages}
                                transitions={combinedTransitions}
                            />
                        </section>
                    )}

                    {/* ========================================================================= */}
                    {/* FUNNEL 2: TOTAL FUNNEL VIEW SHOPEE (SHOPEE ONLY)                          */}
                    {/* ========================================================================= */}
                    {(activeTab === "ALL" || activeTab === "SHOPEE") && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0 text-[10px] font-bold px-2 py-0.5">
                                            FUNNEL 2
                                        </Badge>
                                        <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                                            Total Funnel View: Shopee Only
                                        </h2>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Shopee internal acquisition funnel: Shopee CPC Ad impressions, CTR, and Total Store Orders.
                                    </p>
                                </div>
                            </div>

                            {/* Funnel 2 Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Impressions */}
                                <Card className="border-border/50 bg-card/60 backdrop-blur shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-1 w-full bg-orange-500" />
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                1. Impressions
                                            </span>
                                            <div className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                                <Eye className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                                                {shopee.impressions.toLocaleString()}
                                            </div>
                                            <div className="mt-2 text-[11px] text-muted-foreground">
                                                Shopee CPC Ads Impressions
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CTR */}
                                <Card className="border-border/50 bg-card/60 backdrop-blur shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-1 w-full bg-amber-500" />
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                2. CTR (Shopee CPC)
                                            </span>
                                            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                                <MousePointerClick className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                                                {shopee.ctr}%
                                            </div>
                                            <div className="mt-2 text-[11px] text-muted-foreground">
                                                Ad Clicks: <strong className="text-foreground font-mono">{shopee.clicks.toLocaleString()}</strong>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Total Order */}
                                <Card className="border-border/50 bg-card/60 backdrop-blur shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                3. Total Order
                                            </span>
                                            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                <ShoppingBag className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-500 tracking-tight font-mono">
                                                {shopee.totalOrders.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                                                <span>Direct Ad Orders: <strong className="text-foreground font-mono">{shopee.adOrders.toLocaleString()}</strong></span>
                                                <span>•</span>
                                                <span>CVR: <strong className="text-foreground font-mono">{shopee.cvr}%</strong></span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Stepped Funnel Pipeline */}
                            <SteppedFunnelPipeline
                                title="Shopee Internal Conversion Funnel Pipeline"
                                subtitle="Customer acquisition journey from Shopee CPC ad impressions to ad clicks and completed store orders."
                                overallYield={shopeeYield}
                                stages={shopeeStages}
                                transitions={shopeeTransitions}
                                icon={<Store className="h-4 w-4 text-orange-500" />}
                            />

                            {/* Shopee Shop Breakdown Table */}
                            {data?.shopsBreakdown && data.shopsBreakdown.length > 0 && (
                                <Card className="border-border/50 bg-card/40 backdrop-blur overflow-hidden shadow-sm">
                                    <div className="p-4 border-b border-border/40 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-orange-500" />
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                                Shop Performance Breakdown
                                            </h3>
                                        </div>
                                        <Badge variant="outline" className="text-[11px]">
                                            {data.shopsBreakdown.length} Shops
                                        </Badge>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider border-b border-border/40">
                                                <tr>
                                                    <th className="py-3 px-4 font-semibold">Shop Name</th>
                                                    <th className="py-3 px-4 font-semibold text-right">Ad Impressions</th>
                                                    <th className="py-3 px-4 font-semibold text-right">Ad Clicks</th>
                                                    <th className="py-3 px-4 font-semibold text-right">CTR</th>
                                                    <th className="py-3 px-4 font-semibold text-right">Total Orders</th>
                                                    <th className="py-3 px-4 font-semibold text-right">Ad Orders</th>
                                                    <th className="py-3 px-4 font-semibold text-right">CVR</th>
                                                    <th className="py-3 px-4 font-semibold text-right">GMV</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {data.shopsBreakdown.map((row: any) => (
                                                    <tr key={row.shopId} className="hover:bg-muted/20 transition-colors">
                                                        <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                                                            {row.shopName}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                            {row.impressions.toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                            {row.clicks.toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-500">
                                                            {row.ctr}%
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono font-extrabold text-foreground">
                                                            {row.orders.toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                            {row.adOrders.toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-500">
                                                            {row.cvr}%
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                                                            RM {row.gmv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )}
                        </section>
                    )}

                    {/* ========================================================================= */}
                    {/* FUNNEL 3: TOTAL FUNNEL UNTUK META ADS                                    */}
                    {/* ========================================================================= */}
                    {(activeTab === "ALL" || activeTab === "META") && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-[10px] font-bold px-2 py-0.5">
                                            FUNNEL 3
                                        </Badge>
                                        <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                                            Total Funnel untuk Meta Ads
                                        </h2>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Video & traffic funnel for Meta CPAS: Impression ➔ Thruplay (6s/15s) ➔ Link Click.
                                    </p>
                                </div>
                            </div>

                            {/* Funnel 3 Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Impression */}
                                <Card className="border-border/50 bg-card/60 backdrop-blur shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-1 w-full bg-purple-500" />
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                1. Impression
                                            </span>
                                            <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                                <Eye className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                                                {meta.impressions.toLocaleString()}
                                            </div>
                                            <div className="mt-2 text-[11px] text-muted-foreground">
                                                Meta CPAS Ad Impressions
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Thruplay */}
                                <Card className="border-border/50 bg-card/60 backdrop-blur shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-1 w-full bg-pink-500" />
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                2. Thruplay
                                            </span>
                                            <div className="h-7 w-7 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                                                <PlayCircle className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                                                {meta.thruplay.toLocaleString()}
                                            </div>
                                            <div className="mt-2 text-[11px] text-muted-foreground">
                                                Thruplay Rate: <strong className="text-pink-400 font-mono">{meta.thruplayRate}%</strong>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Link Click */}
                                <Card className="border-border/50 bg-card/60 backdrop-blur shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-1 w-full bg-cyan-500" />
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                3. Link Click
                                            </span>
                                            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                                                <MousePointerClick className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 tracking-tight font-mono">
                                                {meta.linkClicks.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                                                <span>Click Rate (from Thruplay): <strong className="text-foreground font-mono">{meta.clickRate}%</strong></span>
                                                <span>•</span>
                                                <span>CTR: <strong className="text-foreground font-mono">{meta.ctr}%</strong></span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Stepped Funnel Pipeline */}
                            <SteppedFunnelPipeline
                                title="Meta CPAS Video & Traffic Funnel Pipeline"
                                subtitle="Visual customer journey from Meta ad impressions to video thruplays and outbound store link clicks."
                                overallYield={metaYield}
                                stages={metaStages}
                                transitions={metaTransitions}
                                icon={<PlayCircle className="h-4 w-4 text-purple-500" />}
                            />

                            {/* Meta Campaigns Breakdown */}
                            {data?.metaCampaigns && data.metaCampaigns.length > 0 && (
                                <Card className="border-border/50 bg-card/40 backdrop-blur overflow-hidden shadow-sm">
                                    <div className="p-4 border-b border-border/40 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <PlayCircle className="h-4 w-4 text-purple-500" />
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                                Meta CPAS Campaigns Breakdown
                                            </h3>
                                        </div>
                                        <Badge variant="outline" className="text-[11px]">
                                            {data.metaCampaigns.length} Campaigns
                                        </Badge>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider border-b border-border/40">
                                                <tr>
                                                    <th className="py-3 px-4 font-semibold">Campaign Name</th>
                                                    <th className="py-3 px-4 font-semibold text-right">Impressions</th>
                                                    <th className="py-3 px-4 font-semibold text-right">Thruplay</th>
                                                    <th className="py-3 px-4 font-semibold text-right">Thruplay %</th>
                                                    <th className="py-3 px-4 font-semibold text-right">Link Clicks</th>
                                                    <th className="py-3 px-4 font-semibold text-right">Spend</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {data.metaCampaigns.map((c: any) => {
                                                    const tpRate = c.impressions > 0 ? ((c.thruplay / c.impressions) * 100).toFixed(2) : "0.00";
                                                    return (
                                                        <tr key={c.campaignId} className="hover:bg-muted/20 transition-colors">
                                                            <td className="py-3 px-4 font-semibold text-foreground">
                                                                {c.campaignName}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                                {c.impressions.toLocaleString()}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                                {c.thruplay.toLocaleString()}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-mono font-bold text-pink-400">
                                                                {tpRate}%
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-mono font-extrabold text-cyan-400">
                                                                {c.linkClicks.toLocaleString()}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                                RM {c.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )}
                        </section>
                    )}

                    {/* ========================================================================= */}
                    {/* DAILY TREND CHART & TIMELINE                                              */}
                    {/* ========================================================================= */}
                    <Card className="border-border/50 bg-card/40 backdrop-blur p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                            <div>
                                <h3 className="text-sm font-bold text-foreground tracking-tight">
                                    Funnel Performance Over Time
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Daily tracking of Impressions and Total Orders throughout selected date range
                                </p>
                            </div>
                        </div>

                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data?.dailyTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                    <XAxis dataKey="displayDate" tickLine={false} tick={{ fontSize: 11, fill: "currentColor" }} opacity={0.7} />
                                    <YAxis yAxisId="left" tickLine={false} tick={{ fontSize: 11, fill: "currentColor" }} opacity={0.7} />
                                    <YAxis yAxisId="right" orientation="right" tickLine={false} tick={{ fontSize: 11, fill: "currentColor" }} opacity={0.7} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                                            borderColor: "rgba(255, 255, 255, 0.1)",
                                            borderRadius: "12px",
                                            fontSize: "12px",
                                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                                    <Bar yAxisId="left" dataKey="shopeeImpressions" name="Shopee Impressions" fill="#f97316" radius={[4, 4, 0, 0]} opacity={0.8} />
                                    <Bar yAxisId="left" dataKey="metaImpressions" name="Meta Impressions" fill="#a855f7" radius={[4, 4, 0, 0]} opacity={0.8} />
                                    <Line yAxisId="right" type="monotone" dataKey="combinedOrders" name="Total Orders" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
