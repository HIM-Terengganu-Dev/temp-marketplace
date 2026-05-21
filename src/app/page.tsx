"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subDays, parseISO, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShopCard } from "@/components/dashboard/ShopCard";
import { SimpleDatePicker, DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { PerformanceLineChart, PerformanceDataPoint } from "@/components/dashboard/Charts";
import { ShopDetailModal } from "@/components/dashboard/ShopDetailModal";
import { ShopData } from "@/lib/mockData";
import { useSession } from "next-auth/react";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── helpers ────────────────────────────────────────────────────────────── */

function pctChange(cur: number, prev: number) {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
}

function getPreviousRange(
    startDate: string,
    endDate: string,
    preset: DatePreset
): { start: string; end: string } {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const daySpan = differenceInDays(end, start) + 1;

    switch (preset) {
        case "today":
        case "yesterday": {
            const d = subDays(start, 1);
            return { start: format(d, "yyyy-MM-dd"), end: format(d, "yyyy-MM-dd") };
        }
        case "weekly":
            return {
                start: format(subDays(start, 7), "yyyy-MM-dd"),
                end: format(subDays(start, 1), "yyyy-MM-dd"),
            };
        case "monthly":
        default: {
            const prevStart = subDays(start, daySpan);
            return {
                start: format(prevStart, "yyyy-MM-dd"),
                end: format(subDays(start, 1), "yyyy-MM-dd"),
            };
        }
    }
}

function comparisonLabel(preset: DatePreset) {
    switch (preset) {
        case "today": return "vs yesterday";
        case "yesterday": return "vs 2 days ago";
        case "weekly": return "vs prior 7 days";
        case "monthly": return "vs prior month";
        default: return "vs previous period";
    }
}

function TrendBadge({ pct }: { pct: number }) {
    const abs = Math.abs(pct).toFixed(1);
    if (pct > 0.5)
        return (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-400">
                <TrendingUp className="h-3 w-3" />{abs}%
            </span>
        );
    if (pct < -0.5)
        return (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-400">
                <TrendingDown className="h-3 w-3" />{abs}%
            </span>
        );
    return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
            <Minus className="h-3 w-3" />{abs}%
        </span>
    );
}

/* ── component ──────────────────────────────────────────────────────────── */

export default function Home() {
    const { data: session } = useSession();

    // Default preset: today
    const [activePreset, setActivePreset] = useState<DatePreset>("today");
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

    const [shopData, setShopData] = useState<ShopData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dataSource, setDataSource] = useState<string>("");

    // Comparison (previous period) totals
    const [prevTotals, setPrevTotals] = useState({ gmv: 0, spend: 0, roas: 0 });

    // Chart data (daily/hourly breakdown for the aggregate performance chart)
    const [chartData, setChartData] = useState<PerformanceDataPoint[]>([]);

    // Selected shop for the detail modal
    const [selectedShop, setSelectedShop] = useState<ShopData | null>(null);

    // Live Auto-Refresh controls
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [secondsLeft, setSecondsLeft] = useState(30);

    const fetchData = useCallback(async () => {
        if (!startDate || !endDate) return;

        setIsLoading(true);
        try {
            const shopIndices =
                (session?.user as { allowed_tiktok_shops?: number[] } | undefined)
                    ?.allowed_tiktok_shops ?? [1, 2, 3, 4];

            const prevRange = getPreviousRange(startDate, endDate, activePreset);

            // Fetch current period for all shops + previous period in parallel
            const [curResults, prevResults] = await Promise.all([
                Promise.all(
                    shopIndices.map(async (num) => {
                        try {
                            const res = await fetch(
                                `/api/tiktok/shop-metrics?startDate=${startDate}&endDate=${endDate}&shopNumber=${num}`
                            );
                            return res.ok ? res.json() : null;
                        } catch {
                            return null;
                        }
                    })
                ),
                Promise.all(
                    shopIndices.map(async (num) => {
                        try {
                            const res = await fetch(
                                `/api/tiktok/shop-metrics?startDate=${prevRange.start}&endDate=${prevRange.end}&shopNumber=${num}`
                            );
                            return res.ok ? res.json() : null;
                        } catch {
                            return null;
                        }
                    })
                ),
            ]);

            // Build previous period aggregate totals
            const prevGmv = prevResults.reduce((s, d) => s + (d?.gmv ?? 0), 0);
            const prevSpend = prevResults.reduce((s, d) => s + (d?.totalAdsSpend ?? 0), 0);
            const prevTotalRoas = prevSpend > 0 ? prevGmv / prevSpend : 0;
            setPrevTotals({ gmv: prevGmv, spend: prevSpend, roas: prevTotalRoas });

            // Build shop cards with per-shop change data
            const shops: ShopData[] = shopIndices
                .map((num, idx) => {
                    const d = curResults[idx];
                    const p = prevResults[idx];
                    if (!d) return null;

                    const curRoas = d.roasBeforeTax ?? 0;
                    const prevRoas = p && (p.totalAdsSpend ?? 0) > 0
                        ? (p.gmv ?? 0) / (p.totalAdsSpend ?? 1)
                        : 0;

                    const shop: ShopData = {
                        id: `tts_${num}`,
                        name: d.shopName || `Shop ${num}`,
                        platform: "TikTok",
                        type: "shop",
                        shopNumber: num,
                        gmv: d.gmv ?? 0,
                        revenue: d.gmv ?? 0,
                        orders: d.orderCount ?? 0,
                        spend: d.totalAdsSpend ?? 0,
                        spendAfterTax: d.totalCostWithTaxes ?? 0,
                        roas: curRoas,
                        roasAfterTax: d.roasAfterTax ?? 0,
                        dataSource: d.dataSource ?? "live_api",
                        status: "connected",
                        change: {
                            gmv: pctChange(d.gmv ?? 0, p?.gmv ?? 0),
                            spend: pctChange(d.totalAdsSpend ?? 0, p?.totalAdsSpend ?? 0),
                            roas: pctChange(curRoas, prevRoas),
                            orders: pctChange(d.orderCount ?? 0, p?.orderCount ?? 0),
                        },
                    };
                    return shop;
                })
                .filter((s): s is ShopData => s !== null);

            setShopData(shops);

            const sources = [...new Set(shops.map((s) => s.dataSource))];
            setDataSource(sources.join("+"));

            // ── Build aggregate chart data ──────────────────────────────────
            const daySpan = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
            const isOneDay = daySpan === 1;

            if (isOneDay) {
                // Single day → hourly chart (summed across all shops)
                const hourlyBuckets: { [h: string]: { gmv: number; orders: number } } = {};
                for (let i = 0; i < 24; i++) {
                    hourlyBuckets[`${String(i).padStart(2, "0")}:00`] = { gmv: 0, orders: 0 };
                }

                await Promise.all(
                    shopIndices.map(async (num) => {
                        try {
                            const res = await fetch(
                                `/api/tiktok/shop-metrics/hourly?date=${startDate}&shopNumber=${num}`
                            );
                            if (!res.ok) return;
                            const data = await res.json();
                            (data.hourly as { hour: string; gmv: number; orders: number }[]).forEach((h) => {
                                if (hourlyBuckets[h.hour]) {
                                    hourlyBuckets[h.hour].gmv += h.gmv;
                                    hourlyBuckets[h.hour].orders += h.orders;
                                }
                            });
                        } catch { /* ignore */ }
                    })
                );

                const points: PerformanceDataPoint[] = Object.entries(hourlyBuckets).map(([hour, b]) => ({
                    label: hour,
                    gmv: b.gmv,
                    spend: 0, // hourly spend unavailable — hidden in chart
                    roas: 0,  // hourly roas unavailable — hidden in chart
                    orders: b.orders,
                }));

                setChartData(points);
            } else {
                // Multi-day → daily chart
                const days: string[] = [];
                for (let i = 0; i < daySpan; i++) {
                    days.push(format(subDays(parseISO(endDate), daySpan - 1 - i), "yyyy-MM-dd"));
                }

                // For each day, aggregate all shops
                const dayResults = await Promise.all(
                    days.map(async (day) => {
                        const dayShopResults = await Promise.all(
                            shopIndices.map(async (num) => {
                                try {
                                    const res = await fetch(
                                        `/api/tiktok/shop-metrics?startDate=${day}&endDate=${day}&shopNumber=${num}`
                                    );
                                    return res.ok ? res.json() : null;
                                } catch {
                                    return null;
                                }
                            })
                        );
                        const gmv = dayShopResults.reduce((s, d) => s + (d?.gmv ?? 0), 0);
                        const spend = dayShopResults.reduce((s, d) => s + (d?.totalAdsSpend ?? 0), 0);
                        const roas = spend > 0 ? gmv / spend : 0;
                        const orders = dayShopResults.reduce((s, d) => s + (d?.orderCount ?? 0), 0);
                        return { gmv, spend, roas, orders };
                    })
                );

                setChartData(
                    days.map((day, i) => ({
                        label: format(parseISO(day), "MMM d"),
                        gmv: dayResults[i].gmv,
                        spend: dayResults[i].spend,
                        roas: dayResults[i].roas,
                        orders: dayResults[i].orders,
                    }))
                );
            }
        } catch (error) {
            console.error("Error fetching shop data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, activePreset, session]);

    const handleManualRefresh = useCallback(() => {
        fetchData();
        if (activePreset === "today") {
            setSecondsLeft(30);
        }
    }, [fetchData, activePreset]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (activePreset !== "today" || !autoRefresh) {
            setSecondsLeft(30);
            return;
        }

        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    fetchData();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [autoRefresh, activePreset, fetchData]);

    /* ── totals ─────────────────────────────────────────────────────────── */
    const totalRevenue = shopData.reduce((s, d) => s + (d.revenue ?? 0), 0);
    const totalSpend = shopData.reduce((s, d) => s + (d.spend ?? 0), 0);
    const totalSpendAfterTax = shopData.reduce((s, d) => s + (d.spendAfterTax ?? 0), 0);
    const totalOrders = shopData.reduce((s, d) => s + (d.orders ?? 0), 0);
    const totalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalRoasAfterTax = totalSpendAfterTax > 0 ? totalRevenue / totalSpendAfterTax : 0;

    const gmvPct = pctChange(totalRevenue, prevTotals.gmv);
    const spendPct = pctChange(totalSpend, prevTotals.spend);
    const roasPct = pctChange(totalRoas, prevTotals.roas);

    const cmpLabel = comparisonLabel(activePreset);

    /* ── render ─────────────────────────────────────────────────────────── */
    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Live/Paused auto-refresh controls (Only visible for Today) */}
                    {activePreset === "today" && (
                        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 rounded-full px-3.5 py-1.5 backdrop-blur-sm shadow-sm select-none">
                            <span className={cn(
                                "h-2 w-2 rounded-full shadow-lg",
                                autoRefresh ? "bg-emerald-500 animate-pulse shadow-emerald-500/50" : "bg-amber-500 shadow-amber-500/50"
                            )} />
                            <span className="text-xs font-semibold text-slate-300 min-w-[130px]">
                                {autoRefresh ? `Live updates in ${secondsLeft}s` : "Live updates paused"}
                            </span>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className="text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-white transition-colors ml-1 px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/50"
                            >
                                {autoRefresh ? "Pause" : "Resume"}
                            </button>
                        </div>
                    )}
                    
                    {/* Force Manual Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={isLoading}
                        className="h-9 px-3 border-slate-700/60 bg-[#1e293b]/20 hover:bg-slate-800 text-slate-300 hover:text-white font-medium"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-2 text-slate-400", isLoading && "animate-spin")} />
                        <span>Refresh</span>
                    </Button>
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

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 1. GMV */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
                        {!isLoading && <TrendBadge pct={gmvPct} />}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            RM {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {totalOrders.toLocaleString()} orders • {cmpLabel}
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Ad Spend */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Ad Spend</CardTitle>
                        {!isLoading && <TrendBadge pct={spendPct} />}
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Before Tax</p>
                            <div className="text-xl font-bold">
                                RM {totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="pt-2 border-t border-border/30">
                            <p className="text-xs text-purple-400 font-semibold">After Tax (SST + WHT)</p>
                            <div className="text-xl font-bold text-purple-500">
                                RM {totalSpendAfterTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{cmpLabel}</p>
                    </CardContent>
                </Card>

                {/* 3. ROAS Hero Card */}
                <Card className="col-span-2 bg-gradient-to-br from-primary/20 to-purple-900/10 border-primary/20 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-primary">
                            Return on Ad Spend (ROAS)
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {!isLoading && <TrendBadge pct={roasPct} />}
                            <Badge
                                variant="outline"
                                className={
                                    isLoading
                                        ? "border-yellow-500/50 text-yellow-400"
                                        : dataSource.includes("database")
                                        ? "border-blue-500/50 text-blue-400"
                                        : "border-primary/50 text-primary"
                                }
                            >
                                {isLoading
                                    ? "Updating..."
                                    : dataSource.includes("database") && !dataSource.includes("api")
                                    ? "📦 Database"
                                    : dataSource.includes("database") && dataSource.includes("api")
                                    ? "📦+🔴 Mixed"
                                    : "🔴 Live"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">ROAS (Before Tax)</p>
                                <div className="text-3xl font-bold text-foreground tracking-tight">
                                    {totalRoas.toFixed(2)}x
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-purple-400 font-semibold">ACTUAL ROAS (After Tax)</p>
                                <div className="text-3xl font-bold text-purple-500 tracking-tight">
                                    {totalRoasAfterTax.toFixed(2)}x
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Calculated dynamically including SST (8%) and Withholding Tax (8%) • {cmpLabel}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Chart */}
            <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-sm font-medium">Performance Over Time</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {differenceInDays(parseISO(endDate), parseISO(startDate)) === 0
                                ? "Hourly GMV breakdown for today (GMT+8)"
                                : "Daily GMV, Ad Spend & ROAS across all shops"}
                        </p>
                    </div>
                    {isLoading && (
                        <span className="text-[11px] text-muted-foreground animate-pulse">Loading chart...</span>
                    )}
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                    {chartData.length > 0 ? (
                        <PerformanceLineChart data={chartData} height={260} />
                    ) : (
                        <div className={cn(
                            "flex items-center justify-center h-48 text-muted-foreground text-sm rounded-lg border border-dashed border-border/50",
                            isLoading && "animate-pulse"
                        )}>
                            {isLoading ? "Fetching data..." : "No data available for this period"}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Shop Cards */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">Connected Accounts</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Click any shop to view detailed analytics</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isLoading && (
                            <span className="text-xs text-muted-foreground animate-pulse">
                                Fetching latest data...
                            </span>
                        )}
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            {shopData.length} Sources
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {shopData.map((shop) => (
                        <ShopCard
                            key={shop.id}
                            data={shop}
                            onClick={() => setSelectedShop(shop)}
                        />
                    ))}
                </div>
            </div>

            {/* Shop Detail Modal */}
            {selectedShop && (
                <ShopDetailModal
                    shop={selectedShop}
                    startDate={startDate}
                    endDate={endDate}
                    preset={activePreset}
                    onClose={() => setSelectedShop(null)}
                />
            )}
        </div>
    );
}
