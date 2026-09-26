"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { 
    ShoppingBag, 
    TrendingUp, 
    TrendingDown, 
    Minus, 
    RefreshCw, 
    DollarSign, 
    Percent, 
    Receipt, 
    Layers, 
    Store, 
    ArrowUpRight, 
    Download, 
    Search, 
    Info, 
    AlertCircle, 
    CheckCircle2, 
    SlidersHorizontal,
    Share2,
    Calendar,
    ArrowDownRight,
    HelpCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleDatePicker, DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { cn } from "@/lib/utils";

// Dynamic Recharts components to prevent SSR hydration mismatches
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const ComposedChart = dynamic(() => import("recharts").then(m => m.ComposedChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });
const PieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });

type TaxViewMode = "withoutTax" | "withTax" | "dual";

interface ShopeeShop {
    id: number;
    shop_id: string;
    shop_name: string;
}

interface SummaryData {
    gmv: number;
    orders: number;
    aov: number;
    shopeeSpend: number;
    shopeeSpendWithTax: number;
    metaSpend: number;
    metaSpendWithTax: number;
    totalSpend: number;
    totalSpendWithTax: number;
    sst: number;
    wht: number;
    totalTax: number;
    shopeeRoas: number;
    shopeeRoasWithTax: number;
    metaRoas: number;
    metaRoasWithTax: number;
    totalRoas: number;
    totalRoasWithTax: number;
    adImpressions: number;
    adClicks: number;
    adOrders: number;
    adSales: number;
}

interface ShopBreakdownItem {
    shopId: number;
    shopName: string;
    gmv: number;
    orders: number;
    aov: number;
    shopeeSpend: number;
    shopeeSpendWithTax: number;
    metaSpend: number;
    metaSpendWithTax: number;
    totalSpend: number;
    totalSpendWithTax: number;
    shopeeRoas: number;
    shopeeRoasWithTax: number;
    metaRoas: number;
    metaRoasWithTax: number;
    totalRoas: number;
    totalRoasWithTax: number;
    adImpressions: number;
    adClicks: number;
    adOrders: number;
    adSales: number;
}

interface TrendPoint {
    label: string;
    date?: string;
    gmv: number;
    orders: number;
    shopeeSpend: number;
    shopeeSpendWithTax: number;
    metaSpend: number;
    metaSpendWithTax: number;
    totalSpend: number;
    totalSpendWithTax: number;
    shopeeRoas?: number;
    metaRoas?: number;
    totalRoas: number;
    totalRoasWithTax: number;
}

function todayKL(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function formatRM(val: number): string {
    return `RM ${val.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompactRM(val: number): string {
    if (val >= 1000000) return `RM ${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `RM ${(val / 1000).toFixed(1)}k`;
    return `RM ${val.toFixed(0)}`;
}

function TrendBadge({ pct }: { pct: number }) {
    const abs = Math.abs(pct).toFixed(1);
    if (pct > 0.5) {
        return (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <TrendingUp className="h-3 w-3" />+{abs}%
            </span>
        );
    }
    if (pct < -0.5) {
        return (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                <TrendingDown className="h-3 w-3" />-{abs}%
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full border border-border/40">
            <Minus className="h-3 w-3" />{abs}%
        </span>
    );
}

function ShopeeDashboardContent() {
    const { data: session } = useSession();
    const [startDate, setStartDate] = useState(todayKL());
    const [endDate, setEndDate] = useState(todayKL());
    const [activePreset, setActivePreset] = useState<DatePreset>("today");

    const [taxMode, setTaxMode] = useState<TaxViewMode>("withoutTax");
    const [selectedShopId, setSelectedShopId] = useState<string>("all");
    const [searchShopQuery, setSearchShopQuery] = useState("");

    const [shops, setShops] = useState<ShopeeShop[]>([]);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [changes, setChanges] = useState<{ gmv: number; spend: number; roas: number; orders: number }>({
        gmv: 0,
        spend: 0,
        roas: 0,
        orders: 0
    });
    const [shopsBreakdown, setShopsBreakdown] = useState<ShopBreakdownItem[]>([]);
    const [trends, setTrends] = useState<TrendPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch shop list
    const fetchShops = useCallback(async () => {
        try {
            const res = await fetch('/api/shopee/shops');
            if (res.ok) {
                const data = await res.json();
                const allowedShopeeShops = (session?.user as any)?.allowed_shopee_shops || [];
                const hasRealIds = allowedShopeeShops.some((id: number) => id > 1000);
                const filtered = data.filter((s: any) => {
                    if (!hasRealIds) return true;
                    return allowedShopeeShops.includes(parseInt(s.shop_id, 10));
                });
                setShops(filtered);
            }
        } catch (e) {
            console.error("Failed to load Shopee shops", e);
        }
    }, [session]);

    // Fetch dashboard data
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = `/api/shopee/dashboard?startDate=${startDate}&endDate=${endDate}&shopId=${selectedShopId}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to load data (${res.status})`);
            }
            const data = await res.json();
            setSummary(data.summary);
            setChanges(data.changes || { gmv: 0, spend: 0, roas: 0, orders: 0 });
            setShopsBreakdown(data.shopsBreakdown || []);
            setTrends(data.trends || []);
        } catch (e: any) {
            console.error("Shopee dashboard fetch error:", e);
            setError(e.message || "Failed to load dashboard metrics");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedShopId]);

    useEffect(() => {
        fetchShops();
    }, [fetchShops]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Filtered shops for the breakdown table
    const filteredShops = useMemo(() => {
        if (!searchShopQuery.trim()) return shopsBreakdown;
        const q = searchShopQuery.toLowerCase();
        return shopsBreakdown.filter(s => 
            s.shopName.toLowerCase().includes(q) || 
            s.shopId.toString().includes(q)
        );
    }, [shopsBreakdown, searchShopQuery]);

    // Channel split chart data
    const channelPieData = useMemo(() => {
        if (!summary) return [];
        const shopeeVal = taxMode === "withTax" ? summary.shopeeSpendWithTax : summary.shopeeSpend;
        const metaVal = taxMode === "withTax" ? summary.metaSpendWithTax : summary.metaSpend;
        return [
            { name: "Shopee Ads (CPC)", value: shopeeVal, color: "#f97316" },
            { name: "Meta Ads (CPAS)", value: metaVal, color: "#3b82f6" }
        ].filter(item => item.value > 0);
    }, [summary, taxMode]);

    // Export breakdown to CSV
    const exportCsv = () => {
        if (!shopsBreakdown.length) return;
        const headers = [
            "Shop ID",
            "Shop Name",
            "Sales (GMV RM)",
            "Orders",
            "AOV (RM)",
            "Shopee Ads Spend (w/o tax)",
            "Shopee Ads Spend (w/ tax)",
            "Meta Ads Spend (w/o tax)",
            "Meta Ads Spend (w/ tax)",
            "Total Ads Spend (w/o tax)",
            "Total Ads Spend (w/ tax)",
            "Shopee ROAS (w/o tax)",
            "Shopee ROAS (w/ tax)",
            "Meta ROAS (w/o tax)",
            "Meta ROAS (w/ tax)",
            "Total ROAS (w/o tax)",
            "Total ROAS (w/ tax)"
        ];

        const rows = shopsBreakdown.map(s => [
            s.shopId,
            `"${s.shopName.replace(/"/g, '""')}"`,
            s.gmv.toFixed(2),
            s.orders,
            s.aov.toFixed(2),
            s.shopeeSpend.toFixed(2),
            s.shopeeSpendWithTax.toFixed(2),
            s.metaSpend.toFixed(2),
            s.metaSpendWithTax.toFixed(2),
            s.totalSpend.toFixed(2),
            s.totalSpendWithTax.toFixed(2),
            s.shopeeRoas.toFixed(2),
            s.shopeeRoasWithTax.toFixed(2),
            s.metaRoas.toFixed(2),
            s.metaRoasWithTax.toFixed(2),
            s.totalRoas.toFixed(2),
            s.totalRoasWithTax.toFixed(2)
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `shopee_dashboard_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                            <ShoppingBag className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">Shopee Dashboard</h1>
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-[11px] font-semibold">
                                    Live Performance
                                </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Total sales, advertising spend (Shopee CPC & Meta CPAS), and tax-adjusted ROAS
                            </p>
                        </div>
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Shop Selector */}
                    <div className="relative">
                        <select
                            value={selectedShopId}
                            onChange={(e) => setSelectedShopId(e.target.value)}
                            className="h-9 px-3 py-1.5 rounded-lg bg-card/60 border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50 appearance-none pr-8 cursor-pointer"
                        >
                            <option value="all">All Shopee Shops ({shops.length})</option>
                            {shops.map(s => (
                                <option key={s.shop_id} value={s.shop_id}>
                                    {s.shop_name} ({s.shop_id})
                                </option>
                            ))}
                        </select>
                        <Store className="h-3.5 w-3.5 text-muted-foreground absolute right-2.5 top-3 pointer-events-none" />
                    </div>

                    {/* Date Picker */}
                    <SimpleDatePicker
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        activePreset={activePreset}
                        onPresetChange={setActivePreset}
                    />

                    {/* Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchDashboardData}
                        disabled={loading}
                        className="h-9 gap-1.5 text-xs font-medium border-border/60 hover:border-orange-500/40 hover:text-orange-400"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-orange-400")} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>

                    {/* Export CSV */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportCsv}
                        disabled={loading || !shopsBreakdown.length}
                        className="h-9 gap-1.5 text-xs font-medium border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                </div>
            </div>

            {/* Tax Mode Selector Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card/40 border border-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-orange-400" />
                    <span className="text-xs font-semibold text-foreground">Tax Calculation Mode:</span>
                    <span className="text-[11px] text-muted-foreground hidden md:inline">
                        (Malaysian ad tax: 8% SST + 8% WHT = 16% total tax load)
                    </span>
                </div>

                <div className="inline-flex rounded-lg bg-muted/20 p-0.5 border border-border/40">
                    <button
                        onClick={() => setTaxMode("withoutTax")}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                            taxMode === "withoutTax"
                                ? "bg-orange-500 text-white shadow-sm font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Without Tax (Net)
                    </button>
                    <button
                        onClick={() => setTaxMode("withTax")}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                            taxMode === "withTax"
                                ? "bg-orange-500 text-white shadow-sm font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        With Tax (+16% SST+WHT)
                    </button>
                    <button
                        onClick={() => setTaxMode("dual")}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                            taxMode === "dual"
                                ? "bg-orange-500 text-white shadow-sm font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Dual View (Both)
                    </button>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Top 5 KPI Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {/* 1. Total Shopee Sales */}
                <Card className="border-border/40 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                    <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shopee Sales</span>
                            <div className="p-1.5 bg-orange-500/10 rounded-md text-orange-400">
                                <DollarSign className="h-4 w-4" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            {loading ? (
                                <div className="h-8 w-28 bg-muted/30 rounded animate-pulse" />
                            ) : (
                                formatRM(summary?.gmv || 0)
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>vs Previous Period:</span>
                            <TrendBadge pct={changes.gmv} />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[11px] text-muted-foreground">
                            <span>Orders: <strong className="text-foreground">{(summary?.orders || 0).toLocaleString()}</strong></span>
                            <span>AOV: <strong className="text-foreground">{formatRM(summary?.aov || 0)}</strong></span>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Total Combined Ads Spend */}
                <Card className="border-border/40 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                    <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Ads Spend</span>
                            <div className="p-1.5 bg-purple-500/10 rounded-md text-purple-400">
                                <Receipt className="h-4 w-4" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            {loading ? (
                                <div className="h-8 w-28 bg-muted/30 rounded animate-pulse" />
                            ) : taxMode === "withTax" ? (
                                formatRM(summary?.totalSpendWithTax || 0)
                            ) : (
                                formatRM(summary?.totalSpend || 0)
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>{taxMode === "withTax" ? "Before Tax:" : "With 16% Tax:"}</span>
                            <strong className="text-foreground font-semibold">
                                {taxMode === "withTax" 
                                    ? formatRM(summary?.totalSpend || 0)
                                    : formatRM(summary?.totalSpendWithTax || 0)
                                }
                            </strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[11px] text-muted-foreground">
                            <span>SST (8%): <strong className="text-foreground">RM {(summary?.sst || 0).toFixed(2)}</strong></span>
                            <span>WHT (8%): <strong className="text-foreground">RM {(summary?.wht || 0).toFixed(2)}</strong></span>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Total Combined ROAS */}
                <Card className="border-border/40 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                    <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Combined ROAS</span>
                            <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
                            {loading ? (
                                <div className="h-8 w-20 bg-muted/30 rounded animate-pulse" />
                            ) : (
                                <>
                                    <span>
                                        {taxMode === "withTax" 
                                            ? `${(summary?.totalRoasWithTax || 0).toFixed(2)}x`
                                            : `${(summary?.totalRoas || 0).toFixed(2)}x`
                                        }
                                    </span>
                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                        Shopee + Meta
                                    </Badge>
                                </>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>{taxMode === "withTax" ? "ROAS w/o Tax:" : "ROAS w/ Tax:"}</span>
                            <strong className="text-foreground font-semibold">
                                {taxMode === "withTax" 
                                    ? `${(summary?.totalRoas || 0).toFixed(2)}x`
                                    : `${(summary?.totalRoasWithTax || 0).toFixed(2)}x`
                                }
                            </strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[11px] text-muted-foreground">
                            <span>Tax Drag:</span>
                            <span className="text-amber-400 font-medium">
                                -{(((summary?.totalRoas || 0) - (summary?.totalRoasWithTax || 0))).toFixed(2)}x
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Shopee Native Ads (CPC) */}
                <Card className="border-border/40 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
                    <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-orange-400 uppercase tracking-wider flex items-center gap-1">
                                <ShoppingBag className="h-3 w-3" /> Shopee Ads (CPC)
                            </span>
                            <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-400">
                                Native
                            </Badge>
                        </div>
                        <CardTitle className="text-lg font-bold tracking-tight">
                            {loading ? (
                                <div className="h-6 w-24 bg-muted/30 rounded animate-pulse" />
                            ) : (
                                taxMode === "withTax"
                                    ? formatRM(summary?.shopeeSpendWithTax || 0)
                                    : formatRM(summary?.shopeeSpend || 0)
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>Shopee ROAS:</span>
                            <strong className="text-orange-400 font-bold">
                                {taxMode === "withTax"
                                    ? `${(summary?.shopeeRoasWithTax || 0).toFixed(2)}x`
                                    : `${(summary?.shopeeRoas || 0).toFixed(2)}x`
                                }
                            </strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[11px] text-muted-foreground">
                            <span>{taxMode === "withTax" ? "Net Spend:" : "Gross Spend:"}</span>
                            <span className="text-foreground">
                                {taxMode === "withTax"
                                    ? formatRM(summary?.shopeeSpend || 0)
                                    : formatRM(summary?.shopeeSpendWithTax || 0)
                                }
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* 5. Meta Ads (CPAS) */}
                <Card className="border-border/40 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                    <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                <Share2 className="h-3 w-3" /> Meta Ads (CPAS)
                            </span>
                            <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                                External
                            </Badge>
                        </div>
                        <CardTitle className="text-lg font-bold tracking-tight">
                            {loading ? (
                                <div className="h-6 w-24 bg-muted/30 rounded animate-pulse" />
                            ) : (
                                taxMode === "withTax"
                                    ? formatRM(summary?.metaSpendWithTax || 0)
                                    : formatRM(summary?.metaSpend || 0)
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>Meta ROAS:</span>
                            <strong className="text-blue-400 font-bold">
                                {taxMode === "withTax"
                                    ? `${(summary?.metaRoasWithTax || 0).toFixed(2)}x`
                                    : `${(summary?.metaRoas || 0).toFixed(2)}x`
                                }
                            </strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[11px] text-muted-foreground">
                            <span>{taxMode === "withTax" ? "Net Spend:" : "Gross Spend:"}</span>
                            <span className="text-foreground">
                                {taxMode === "withTax"
                                    ? formatRM(summary?.metaSpend || 0)
                                    : formatRM(summary?.metaSpendWithTax || 0)
                                }
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dual View Side-by-Side Comparison (shown when "dual" selected or as detailed tax matrix) */}
            {(taxMode === "dual" || true) && (
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Tax Matrix Card */}
                    <Card className="border-border/40 bg-card/30 backdrop-blur-sm md:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-orange-400" />
                                    Shopee & Meta Ads Tax Impact Breakdown (8% SST + 8% WHT)
                                </span>
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    Total Tax: 16%
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Side-by-side comparison of advertising expenditures before tax vs net after Malaysian taxes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-border/40 text-muted-foreground">
                                            <th className="text-left py-2 font-medium">Channel</th>
                                            <th className="text-right py-2 font-medium">Spend (Without Tax)</th>
                                            <th className="text-right py-2 font-medium">SST (8%)</th>
                                            <th className="text-right py-2 font-medium">WHT (8%)</th>
                                            <th className="text-right py-2 font-medium">Total Spend (With Tax)</th>
                                            <th className="text-right py-2 font-medium">ROAS (w/o tax)</th>
                                            <th className="text-right py-2 font-medium">ROAS (w/ tax)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        <tr>
                                            <td className="py-2.5 font-semibold flex items-center gap-1.5 text-orange-400">
                                                <span className="h-2 w-2 rounded-full bg-orange-500" /> Shopee Ads (CPC)
                                            </td>
                                            <td className="text-right py-2.5">{formatRM(summary?.shopeeSpend || 0)}</td>
                                            <td className="text-right py-2.5 text-muted-foreground">RM {((summary?.shopeeSpend || 0) * 0.08).toFixed(2)}</td>
                                            <td className="text-right py-2.5 text-muted-foreground">RM {((summary?.shopeeSpend || 0) * 0.08).toFixed(2)}</td>
                                            <td className="text-right py-2.5 font-medium">{formatRM(summary?.shopeeSpendWithTax || 0)}</td>
                                            <td className="text-right py-2.5 text-orange-400 font-semibold">{(summary?.shopeeRoas || 0).toFixed(2)}x</td>
                                            <td className="text-right py-2.5 text-orange-400 font-semibold">{(summary?.shopeeRoasWithTax || 0).toFixed(2)}x</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2.5 font-semibold flex items-center gap-1.5 text-blue-400">
                                                <span className="h-2 w-2 rounded-full bg-blue-500" /> Meta Ads (CPAS)
                                            </td>
                                            <td className="text-right py-2.5">{formatRM(summary?.metaSpend || 0)}</td>
                                            <td className="text-right py-2.5 text-muted-foreground">RM {((summary?.metaSpend || 0) * 0.08).toFixed(2)}</td>
                                            <td className="text-right py-2.5 text-muted-foreground">RM {((summary?.metaSpend || 0) * 0.08).toFixed(2)}</td>
                                            <td className="text-right py-2.5 font-medium">{formatRM(summary?.metaSpendWithTax || 0)}</td>
                                            <td className="text-right py-2.5 text-blue-400 font-semibold">{(summary?.metaRoas || 0).toFixed(2)}x</td>
                                            <td className="text-right py-2.5 text-blue-400 font-semibold">{(summary?.metaRoasWithTax || 0).toFixed(2)}x</td>
                                        </tr>
                                        <tr className="bg-muted/10 font-bold border-t border-border/40">
                                            <td className="py-2.5 text-foreground">Total Combined</td>
                                            <td className="text-right py-2.5 text-foreground">{formatRM(summary?.totalSpend || 0)}</td>
                                            <td className="text-right py-2.5 text-muted-foreground">RM {(summary?.sst || 0).toFixed(2)}</td>
                                            <td className="text-right py-2.5 text-muted-foreground">RM {(summary?.wht || 0).toFixed(2)}</td>
                                            <td className="text-right py-2.5 text-emerald-400">{formatRM(summary?.totalSpendWithTax || 0)}</td>
                                            <td className="text-right py-2.5 text-emerald-400 font-bold">{(summary?.totalRoas || 0).toFixed(2)}x</td>
                                            <td className="text-right py-2.5 text-emerald-400 font-bold">{(summary?.totalRoasWithTax || 0).toFixed(2)}x</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Spend Distribution Card */}
                    <Card className="border-border/40 bg-card/30 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Layers className="h-4 w-4 text-purple-400" />
                                Ad Channel Spend Split
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Distribution of budget between Shopee CPC and Meta CPAS
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[180px] w-full flex items-center justify-center">
                                {channelPieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={channelPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={70}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {channelPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#111827',
                                                    borderColor: '#374151',
                                                    borderRadius: '8px',
                                                    color: '#f9fafb',
                                                    fontSize: 12
                                                }}
                                                formatter={(val: any) => [`RM ${Number(val).toFixed(2)}`, 'Spend']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-xs text-muted-foreground">No ad spend in period</div>
                                )}
                            </div>
                            <div className="flex items-center justify-center gap-6 pt-2 border-t border-border/20 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                    <span className="text-muted-foreground">Shopee:</span>
                                    <strong className="text-foreground">
                                        {summary?.totalSpend ? (((summary.shopeeSpend / summary.totalSpend) * 100).toFixed(0)) : 0}%
                                    </strong>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                    <span className="text-muted-foreground">Meta CPAS:</span>
                                    <strong className="text-foreground">
                                        {summary?.totalSpend ? (((summary.metaSpend / summary.totalSpend) * 100).toFixed(0)) : 0}%
                                    </strong>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Performance Trends Chart */}
            <Card className="border-border/40 bg-card/30 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-orange-400" />
                                Sales, Ads Spend & ROAS Trend
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {trends.length <= 24 && trends[0]?.label?.includes(":") 
                                    ? `Hourly breakdown for ${startDate} · GMT+8`
                                    : `Daily trend from ${startDate} to ${endDate}`
                                }
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-orange-500/80" />
                                <span>Shopee Sales (GMV)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                                <span>Total Ads Spend</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                <span>ROAS (Right Axis)</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px] w-full min-w-0 pt-2">
                        {loading ? (
                            <div className="h-full w-full flex items-center justify-center">
                                <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
                            </div>
                        ) : trends.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={trends} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
                                    <XAxis
                                        dataKey="label"
                                        stroke="#6b7280"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    {/* Left Y Axis: Currency */}
                                    <YAxis
                                        yAxisId="left"
                                        stroke="#6b7280"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={formatCompactRM}
                                        width={58}
                                    />
                                    {/* Right Y Axis: ROAS */}
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="#10b981"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `${Number(v).toFixed(1)}x`}
                                        width={42}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#111827',
                                            borderColor: '#374151',
                                            borderRadius: '8px',
                                            color: '#f9fafb',
                                            fontSize: 12,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                        }}
                                        formatter={(value: any, name: any) => {
                                            const v = Number(value) || 0;
                                            if (name === "ROAS") return [`${v.toFixed(2)}x`, name];
                                            return [`RM ${v.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                                        }}
                                    />
                                    {/* GMV Bar */}
                                    <Bar
                                        yAxisId="left"
                                        dataKey="gmv"
                                        name="Shopee Sales"
                                        fill="#f97316"
                                        opacity={0.85}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={32}
                                    />
                                    {/* Total Spend Line */}
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey={taxMode === "withTax" ? "totalSpendWithTax" : "totalSpend"}
                                        name={taxMode === "withTax" ? "Ads Spend (With Tax)" : "Ads Spend (Without Tax)"}
                                        stroke="#c084fc"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 5 }}
                                    />
                                    {/* ROAS Line */}
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey={taxMode === "withTax" ? "totalRoasWithTax" : "totalRoas"}
                                        name="ROAS"
                                        stroke="#34d399"
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{ r: 5 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                                No trend data available for selected range
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Per-Shop Detailed Breakdown Table */}
            <Card className="border-border/40 bg-card/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Store className="h-4 w-4 text-orange-400" />
                                Connected Shopee Stores Performance Breakdown
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Individual store metrics including GMV, orders, advertising channels spend, and tax-adjusted ROAS
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search store name..."
                                value={searchShopQuery}
                                onChange={(e) => setSearchShopQuery(e.target.value)}
                                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-card/60 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/10 text-muted-foreground">
                                    <th className="text-left py-3 px-4 font-semibold">Store</th>
                                    <th className="text-right py-3 px-4 font-semibold">Shopee Sales</th>
                                    <th className="text-right py-3 px-4 font-semibold">Orders</th>
                                    <th className="text-right py-3 px-4 font-semibold">AOV</th>
                                    <th className="text-right py-3 px-4 font-semibold">
                                        Shopee Spend {taxMode === "withTax" ? "(w/ Tax)" : "(w/o Tax)"}
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold">
                                        Meta Spend {taxMode === "withTax" ? "(w/ Tax)" : "(w/o Tax)"}
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold">
                                        Total Spend {taxMode === "withTax" ? "(w/ Tax)" : "(w/o Tax)"}
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold">Shopee ROAS</th>
                                    <th className="text-right py-3 px-4 font-semibold">Meta ROAS</th>
                                    <th className="text-right py-3 px-4 font-semibold">Total ROAS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-muted-foreground">
                                            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-orange-400 mb-2" />
                                            Loading store metrics...
                                        </td>
                                    </tr>
                                ) : filteredShops.length > 0 ? (
                                    filteredShops.map((shop) => {
                                        const curShopeeSpend = taxMode === "withTax" ? shop.shopeeSpendWithTax : shop.shopeeSpend;
                                        const curMetaSpend = taxMode === "withTax" ? shop.metaSpendWithTax : shop.metaSpend;
                                        const curTotalSpend = taxMode === "withTax" ? shop.totalSpendWithTax : shop.totalSpend;
                                        const curShopeeRoas = taxMode === "withTax" ? shop.shopeeRoasWithTax : shop.shopeeRoas;
                                        const curMetaRoas = taxMode === "withTax" ? shop.metaRoasWithTax : shop.metaRoas;
                                        const curTotalRoas = taxMode === "withTax" ? shop.totalRoasWithTax : shop.totalRoas;

                                        return (
                                            <tr key={shop.shopId} className="hover:bg-muted/10 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                                        <Store className="h-3.5 w-3.5 text-orange-400" />
                                                        {shop.shopName}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">ID: {shop.shopId}</div>
                                                </td>
                                                <td className="text-right py-3 px-4 font-bold text-foreground">
                                                    {formatRM(shop.gmv)}
                                                </td>
                                                <td className="text-right py-3 px-4 text-muted-foreground">
                                                    {shop.orders.toLocaleString()}
                                                </td>
                                                <td className="text-right py-3 px-4 text-muted-foreground">
                                                    {formatRM(shop.aov)}
                                                </td>
                                                <td className="text-right py-3 px-4">
                                                    <div className="font-medium text-orange-400">{formatRM(curShopeeSpend)}</div>
                                                    {taxMode !== "dual" && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {taxMode === "withTax" ? `w/o: ${formatRM(shop.shopeeSpend)}` : `w/: ${formatRM(shop.shopeeSpendWithTax)}`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-right py-3 px-4">
                                                    <div className="font-medium text-blue-400">{formatRM(curMetaSpend)}</div>
                                                    {taxMode !== "dual" && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {taxMode === "withTax" ? `w/o: ${formatRM(shop.metaSpend)}` : `w/: ${formatRM(shop.metaSpendWithTax)}`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-right py-3 px-4 font-semibold text-foreground">
                                                    <div>{formatRM(curTotalSpend)}</div>
                                                    {taxMode !== "dual" && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {taxMode === "withTax" ? `w/o: ${formatRM(shop.totalSpend)}` : `w/: ${formatRM(shop.totalSpendWithTax)}`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-right py-3 px-4 font-semibold text-orange-400">
                                                    <div>{curShopeeRoas.toFixed(2)}x</div>
                                                    {taxMode !== "dual" && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {taxMode === "withTax" ? `w/o: ${shop.shopeeRoas.toFixed(2)}x` : `w/: ${shop.shopeeRoasWithTax.toFixed(2)}x`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-right py-3 px-4 font-semibold text-blue-400">
                                                    <div>{curMetaRoas.toFixed(2)}x</div>
                                                    {taxMode !== "dual" && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {taxMode === "withTax" ? `w/o: ${shop.metaRoas.toFixed(2)}x` : `w/: ${shop.metaRoasWithTax.toFixed(2)}x`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-right py-3 px-4 font-bold text-emerald-400">
                                                    <div>{curTotalRoas.toFixed(2)}x</div>
                                                    {taxMode !== "dual" && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {taxMode === "withTax" ? `w/o: ${shop.totalRoas.toFixed(2)}x` : `w/: ${shop.totalRoasWithTax.toFixed(2)}x`}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-muted-foreground">
                                            No store performance records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ShopeeDashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        }>
            <ShopeeDashboardContent />
        </Suspense>
    );
}
