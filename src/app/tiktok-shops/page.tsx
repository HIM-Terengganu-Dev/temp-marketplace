"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, differenceInDays, parseISO, subDays } from "date-fns";
import { SimpleDatePicker, DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { ShopCard } from "@/components/dashboard/ShopCard";
import { ShopDetailModal } from "@/components/dashboard/ShopDetailModal";
import { PerformanceLineChart, PerformanceDataPoint } from "@/components/dashboard/Charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { ShopData } from "@/lib/mockData";
import { useLiteMode } from "@/context/LiteModeContext";
import { SyncIndicator } from "@/components/dashboard/SyncIndicator";
import { cn } from "@/lib/utils";

const SHOP_NAMES: Record<number, string> = {
    1: 'Him.DrSamhan',
    2: 'HIM CLINIC',
    3: 'Vigomax HQ',
    4: 'VigomaxPlus HQ'
};

const SHOP_DOT_COLORS: Record<number, string> = {
    1: 'bg-blue-400',
    2: 'bg-purple-400',
    3: 'bg-emerald-400',
    4: 'bg-pink-400'
};

function todayKL(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

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
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3" />{abs}%
            </span>
        );
    if (pct < -0.5)
        return (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-600 dark:text-red-400">
                <TrendingDown className="h-3 w-3" />{abs}%
            </span>
        );
    return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500 dark:text-muted-foreground">
            <Minus className="h-3 w-3" />{abs}%
        </span>
    );
}

export default function TikTokShopsPage() {
    const { data: session } = useSession();
    const { isLiteMode } = useLiteMode();

    // Default to Today in KL timezone
    const [startDate, setStartDate] = useState(todayKL());
    const [endDate, setEndDate] = useState(todayKL());
    const [activePreset, setActivePreset] = useState<DatePreset>("today");
    const [companyFilter, setCompanyFilter] = useState<"ALL" | "HIMWELLNESS" | "WEROCA">("ALL");

    const [shopData, setShopData] = useState<ShopData[]>([]);
    const [prevTotals, setPrevTotals] = useState({ gmv: 0, spend: 0, spendAfterTax: 0, roas: 0, roasAfterTax: 0, orders: 0 });
    const [selectedShop, setSelectedShop] = useState<ShopData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [dataSource, setDataSource] = useState<string>("");

    // Performance Chart state
    const [chartData, setChartData] = useState<PerformanceDataPoint[]>([]);
    const [chartShopFilter, setChartShopFilter] = useState<string>("ALL");
    const [isChartLoading, setIsChartLoading] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    const allowedShopIndices: number[] = (session?.user as any)?.allowed_tiktok_shops || [1, 2, 3, 4];

    // Fetch Shop Cards data + Totals from unified summary endpoint
    const fetchShopCards = useCallback(async (signal?: AbortSignal) => {
        if (!startDate || !endDate) return;

        setIsLoading(true);
        const prevRange = getPreviousRange(startDate, endDate, activePreset);

        try {
            const res = await fetch(
                `/api/shop-metrics/summary?startDate=${startDate}&endDate=${endDate}&prevStartDate=${prevRange.start}&prevEndDate=${prevRange.end}`,
                { signal }
            );

            if (!res.ok) {
                console.error("Failed to load shop metrics summary:", res.statusText);
                return;
            }

            const data = await res.json();
            const curResults = data?.curResults || [];
            const prevResults = data?.prevResults || [];

            let ds = "live_api";
            if (curResults.some((r: any) => r.dataSource?.includes("database"))) {
                ds = curResults.some((r: any) => r.dataSource?.includes("api")) ? "database+api" : "database";
            }

            const ttsShops: ShopData[] = allowedShopIndices
                .map((num) => {
                    const d = curResults.find((r: any) => r.shopNumber === num);
                    const p = prevResults.find((r: any) => r.shopNumber === num);
                    if (!d) return null;

                    // Filter by company
                    if (companyFilter === "HIMWELLNESS" && num !== 1 && num !== 2) return null;
                    if (companyFilter === "WEROCA" && num !== 3 && num !== 4) return null;

                    const curRoas = d.roasBeforeTax ?? 0;
                    const prevRoas = p && (p.totalAdsSpend ?? 0) > 0
                        ? (p.gmv ?? 0) / (p.totalAdsSpend ?? 1)
                        : 0;

                    const shop: ShopData = {
                        id: `tts_${num}`,
                        name: d.shopName || SHOP_NAMES[num] || `Shop ${num}`,
                        platform: 'TikTok',
                        type: 'shop',
                        shopNumber: num,
                        gmv: d.gmv ?? 0,
                        revenue: d.gmv ?? 0,
                        orders: d.orderCount ?? 0,
                        cancelledOrderCount: d.cancelledOrderCount ?? 0,
                        cancelledGMV: d.cancelledGMV ?? 0,
                        spend: d.totalAdsSpend ?? 0,
                        spendAfterTax: d.totalCostWithTaxes ?? 0,
                        roas: curRoas,
                        roasAfterTax: d.roasAfterTax ?? 0,
                        dataSource: d.dataSource ?? "live_api",
                        status: 'connected',
                        change: {
                            gmv: pctChange(d.gmv ?? 0, p?.gmv ?? 0),
                            spend: pctChange(d.totalAdsSpend ?? 0, p?.totalAdsSpend ?? 0),
                            roas: pctChange(curRoas, prevRoas),
                            orders: pctChange(d.orderCount ?? 0, p?.orderCount ?? 0)
                        }
                    };
                    return shop;
                })
                .filter((s): s is ShopData => s !== null);

            const filteredPrev = prevResults.filter((p: any) => {
                if (!allowedShopIndices.includes(p.shopNumber)) return false;
                if (companyFilter === "HIMWELLNESS" && p.shopNumber !== 1 && p.shopNumber !== 2) return false;
                if (companyFilter === "WEROCA" && p.shopNumber !== 3 && p.shopNumber !== 4) return false;
                return true;
            });

            const prevGmvSum = filteredPrev.reduce((s: number, d: any) => s + (d?.gmv ?? 0), 0);
            const prevSpendSum = filteredPrev.reduce((s: number, d: any) => s + (d?.totalAdsSpend ?? 0), 0);
            const prevSpendAfterTaxSum = filteredPrev.reduce((s: number, d: any) => s + (d?.totalCostWithTaxes ?? 0), 0);
            const prevOrdersSum = filteredPrev.reduce((s: number, d: any) => s + (d?.orderCount ?? 0), 0);

            setDataSource(ds);
            setShopData(ttsShops);
            setPrevTotals({
                gmv: prevGmvSum,
                spend: prevSpendSum,
                spendAfterTax: prevSpendAfterTaxSum,
                roas: prevSpendSum > 0 ? prevGmvSum / prevSpendSum : 0,
                roasAfterTax: prevSpendAfterTaxSum > 0 ? prevGmvSum / prevSpendAfterTaxSum : 0,
                orders: prevOrdersSum
            });
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Error fetching shop data:", error);
            }
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, activePreset, allowedShopIndices, companyFilter]);

    // Fetch Performance Over Time chart data
    const fetchChartData = useCallback(async (signal?: AbortSignal) => {
        if (!startDate || !endDate) return;

        setIsChartLoading(true);
        try {
            const isSingleDay = differenceInDays(parseISO(endDate), parseISO(startDate)) === 0;

            if (isSingleDay) {
                // Hourly breakdown for single day
                const hourlyBuckets: Record<string, { gmv: number; orders: number; spend: number }> = {};
                for (let i = 0; i < 24; i++) {
                    const label = `${String(i).padStart(2, '0')}:00`;
                    hourlyBuckets[label] = { gmv: 0, orders: 0, spend: 0 };
                }

                let targetShops = chartShopFilter === "ALL"
                    ? allowedShopIndices
                    : [parseInt(chartShopFilter, 10)];

                if (companyFilter === "HIMWELLNESS") {
                    targetShops = targetShops.filter(n => n === 1 || n === 2);
                } else if (companyFilter === "WEROCA") {
                    targetShops = targetShops.filter(n => n === 3 || n === 4);
                }

                await Promise.all(
                    targetShops.map(async (num) => {
                        try {
                            const res = await fetch(
                                `/api/tiktok/shop-metrics/hourly?date=${startDate}&shopNumber=${num}`,
                                { signal }
                            );
                            if (!res.ok) return;
                            const data = await res.json();
                            (data.hourly as { hour: string; gmv: number; orders: number; spend?: number }[] || []).forEach((h) => {
                                if (hourlyBuckets[h.hour]) {
                                    hourlyBuckets[h.hour].gmv += h.gmv || 0;
                                    hourlyBuckets[h.hour].orders += h.orders || 0;
                                    hourlyBuckets[h.hour].spend += h.spend || 0;
                                }
                            });
                        } catch (e: any) {
                            if (e.name === 'AbortError' || signal?.aborted) return;
                        }
                    })
                );

                if (signal?.aborted) return;

                const points: PerformanceDataPoint[] = Object.entries(hourlyBuckets).map(([hour, b]) => ({
                    label: hour,
                    gmv: b.gmv,
                    spend: b.spend,
                    roas: b.spend > 0 ? b.gmv / b.spend : 0,
                    orders: b.orders,
                }));

                setChartData(points);
            } else {
                // Multi-day trend from daily-trend API
                const url = `/api/shop-metrics/daily-trend?startDate=${startDate}&endDate=${endDate}&company=${companyFilter}&platform=TIKTOK${chartShopFilter !== 'ALL' ? `&shopNumber=${chartShopFilter}` : ''}`;
                const res = await fetch(url, { signal });
                if (signal?.aborted) return;
                if (res.ok) {
                    const data = await res.json();
                    setChartData(data);
                } else {
                    console.error("Failed to load daily trend metrics:", res.statusText);
                }
            }
        } catch (error: any) {
            if (error.name !== 'AbortError' && !signal?.aborted) {
                console.error("Error fetching chart data:", error);
            }
        } finally {
            setIsChartLoading(false);
        }
    }, [startDate, endDate, chartShopFilter, companyFilter, allowedShopIndices]);

    const handleRefreshAll = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        fetchShopCards(controller.signal);
        fetchChartData(controller.signal);
    };

    useEffect(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        fetchShopCards(controller.signal);
        fetchChartData(controller.signal);

        return () => {
            controller.abort();
        };
    }, [startDate, endDate, activePreset, companyFilter, session, chartShopFilter, fetchShopCards, fetchChartData]);

    const isSingleDay = differenceInDays(parseISO(endDate), parseISO(startDate)) === 0;
    const activeShopLabel = chartShopFilter === "ALL" 
        ? "All TikTok Shops" 
        : SHOP_NAMES[Number(chartShopFilter)] || `Shop ${chartShopFilter}`;

    // Aggregates for Top KPI Cards
    const totalGMV = shopData.reduce((sum, s) => sum + (s.revenue ?? 0), 0);
    const totalSpend = shopData.reduce((sum, s) => sum + (s.spend ?? 0), 0);
    const totalSpendAfterTax = shopData.reduce((sum, s) => sum + (s.spendAfterTax ?? 0), 0);
    const totalOrders = shopData.reduce((sum, s) => sum + (s.orders ?? 0), 0);
    const totalRoas = totalSpend > 0 ? totalGMV / totalSpend : 0;
    const totalRoasAfterTax = totalSpendAfterTax > 0 ? totalGMV / totalSpendAfterTax : 0;

    const gmvPct = pctChange(totalGMV, prevTotals.gmv);
    const spendPct = pctChange(totalSpend, prevTotals.spend);
    const roasPct = pctChange(totalRoas, prevTotals.roas);
    const cmpLabel = comparisonLabel(activePreset);

    const availableShops = allowedShopIndices.filter(num => {
        if (companyFilter === "HIMWELLNESS") return num === 1 || num === 2;
        if (companyFilter === "WEROCA") return num === 3 || num === 4;
        return true;
    });

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">TikTok Shops</h1>
                        <p className="text-sm text-muted-foreground">Manage and track your connected TikTok Seller accounts</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Company Filter Pills */}
                    <div className="flex items-center gap-0.5 bg-muted/20 dark:bg-muted/40 border border-border rounded-xl p-1 backdrop-blur-sm select-none">
                        {(["ALL", "HIMWELLNESS", "WEROCA"] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => {
                                    setCompanyFilter(filter);
                                    setChartShopFilter("ALL");
                                }}
                                className={cn(
                                    "text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap",
                                    companyFilter === filter
                                        ? filter === "ALL"
                                            ? "bg-primary text-white shadow-md shadow-primary/25"
                                            : filter === "HIMWELLNESS"
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                            : "bg-purple-650 text-white shadow-md shadow-purple-500/25"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted/50"
                                )}
                            >
                                {filter === "ALL" ? "All" : filter === "HIMWELLNESS" ? "HIM" : "WEROCA"}
                            </button>
                        ))}
                    </div>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRefreshAll} 
                        disabled={isLoading || isChartLoading}
                        className="h-9 gap-2 text-xs font-semibold rounded-xl"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", (isLoading || isChartLoading) && "animate-spin")} />
                        Refresh
                    </Button>
                    <div className="w-full sm:w-auto flex-1 sm:flex-none">
                        <SimpleDatePicker
                            startDate={startDate}
                            setStartDate={setStartDate}
                            endDate={endDate}
                            setEndDate={setEndDate}
                            activePreset={activePreset}
                            onPresetChange={setActivePreset}
                        />
                    </div>
                </div>
            </div>

            {/* ── Summary Overview KPI Cards (GMV, Ad Spend, ROAS) ── */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                {/* 1. GMV Hero Card */}
                <Card className="col-span-2 lg:col-span-2 bg-gradient-to-br from-primary/15 to-purple-900/10 border-primary/25 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-primary">Total TikTok GMV</CardTitle>
                            <SyncIndicator isLoading={isLoading} dataSource={dataSource} />
                        </div>
                        {!isLoading && <TrendBadge pct={gmvPct} />}
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums leading-none pt-2">
                            RM {totalGMV.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                            {totalOrders.toLocaleString()} orders · {cmpLabel}
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Ad Spend */}
                <Card className="col-span-2 sm:col-span-1 border-border/40 bg-card/70 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ad Spend</CardTitle>
                            <SyncIndicator isLoading={isLoading} dataSource={dataSource} />
                        </div>
                        {!isLoading && <TrendBadge pct={spendPct} />}
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                        <div>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Before Tax</p>
                            <div className="text-xl font-extrabold tabular-nums">
                                RM {totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="pt-1.5 border-t border-border/30">
                            <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">After Tax</p>
                            <div className="text-xl font-extrabold text-purple-400 tabular-nums">
                                RM {totalSpendAfterTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground">{cmpLabel}</p>
                    </CardContent>
                </Card>

                {/* 3. ROAS */}
                <Card className="col-span-2 sm:col-span-1 border-border/40 bg-card/70 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ROAS</CardTitle>
                            <SyncIndicator isLoading={isLoading} dataSource={dataSource} />
                        </div>
                        {!isLoading && <TrendBadge pct={roasPct} />}
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                        <div>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Before Tax</p>
                            <div className="text-xl font-extrabold tabular-nums">
                                {totalRoas.toFixed(2)}x
                            </div>
                        </div>
                        <div className="pt-1.5 border-t border-border/30">
                            <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">After Tax</p>
                            <div className="text-xl font-extrabold text-purple-400 tabular-nums">
                                {totalRoasAfterTax.toFixed(2)}x
                            </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground">{cmpLabel}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Over Time Chart (hidden in Lite Mode) */}
            {!isLiteMode && (
                <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3">
                        <div>
                            <CardTitle className="text-sm font-medium">Performance Over Time</CardTitle>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {isSingleDay
                                    ? `Hourly GMV, Ad Spend & ROAS breakdown (${activeShopLabel}, GMT+8)`
                                    : `Daily GMV, Ad Spend & ROAS (${activeShopLabel})`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {isChartLoading && (
                                <span className="text-[11px] text-muted-foreground animate-pulse mr-1">Loading...</span>
                            )}
                            <div className="flex items-center bg-muted/60 dark:bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs flex-wrap gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => setChartShopFilter("ALL")}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                                        chartShopFilter === "ALL"
                                            ? "bg-background text-foreground shadow-sm font-semibold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    All Shops
                                </button>
                                {availableShops.map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setChartShopFilter(num.toString())}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5",
                                            chartShopFilter === num.toString()
                                                ? "bg-background text-foreground shadow-sm font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <span className={cn("h-1.5 w-1.5 rounded-full", SHOP_DOT_COLORS[num] || "bg-cyan-400")} />
                                        {SHOP_NAMES[num] || `Shop ${num}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4">
                        {chartData.length > 0 ? (
                            <PerformanceLineChart data={chartData} height={260} />
                        ) : (
                            <div className={cn(
                                "flex items-center justify-center h-48 text-muted-foreground text-sm rounded-lg border border-dashed border-border/50",
                                isChartLoading && "animate-pulse"
                            )}>
                                {isChartLoading ? "Fetching chart data..." : "No data available for this period"}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Shop Cards Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                {shopData.map((shop) => (
                    <ShopCard 
                        key={shop.id} 
                        data={shop} 
                        onClick={() => setSelectedShop(shop)}
                        isLoading={isLoading}
                    />
                ))}
            </div>

            {shopData.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-xl border border-dashed border-border">
                    <p className="text-muted-foreground">No shops connected yet.</p>
                </div>
            )}

            {/* Detail Modal */}
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
