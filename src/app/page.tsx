"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, subDays, parseISO, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShopCard } from "@/components/dashboard/ShopCard";
import { SimpleDatePicker, DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { PerformanceLineChart, PerformanceDataPoint } from "@/components/dashboard/Charts";
import { ShopDetailModal } from "@/components/dashboard/ShopDetailModal";
import { ShopData } from "@/lib/mockData";
import { useSession } from "next-auth/react";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Trophy, Tv, Users, ShoppingBag, DollarSign, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SyncIndicator } from "@/components/dashboard/SyncIndicator";

/* ── helpers ────────────────────────────────────────────────────────────── */

const SHOP_NAMES: Record<number, string> = {
    1: 'Him.DrSamhan',
    2: 'HIM CLINIC',
    3: 'Vigomax HQ',
    4: 'VigomaxPlus HQ'
};

const SHOP_THEME_COLORS: Record<number, string> = {
    1: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    2: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    3: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    4: 'border-pink-500/30 text-pink-400 bg-pink-500/10'
};

/** Returns today's date string YYYY-MM-DD in Asia/Kuala_Lumpur timezone */
function todayKL(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

/** Subtracts N days from a KL date string, returns YYYY-MM-DD */
function subDaysKL(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - n));
    return dt.toISOString().split('T')[0];
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

    // Use KL timezone for all date state — prevents SSR/client mismatch
    const [activePreset, setActivePreset] = useState<DatePreset>("today");
    const [startDate, setStartDate] = useState(todayKL());
    const [endDate, setEndDate] = useState(todayKL());

    const [companyFilter, setCompanyFilter] = useState<"ALL" | "HIMWELLNESS" | "WEROCA">("ALL");
    const [shopData, setShopData] = useState<ShopData[]>([]);
    const [livestreams, setLivestreams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dataSource, setDataSource] = useState<string>("");

    // COGS data from dynamic SKU catalog (or 28% fallback)
    const [cogsData, setCogsData] = useState<{ totalCogs: number; source: 'dynamic' | 'fallback'; mappedSkuCount: number }>({ totalCogs: 0, source: 'fallback', mappedSkuCount: 0 });

    // Comparison (previous period) totals
    const [prevTotals, setPrevTotals] = useState({ gmv: 0, spend: 0, roas: 0 });

    // Chart data (daily/hourly breakdown for the aggregate performance chart)
    const [chartData, setChartData] = useState<PerformanceDataPoint[]>([]);

    // Selected shop for the detail modal
    const [selectedShop, setSelectedShop] = useState<ShopData | null>(null);

    // Live Auto-Refresh controls
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [secondsLeft, setSecondsLeft] = useState(30);

    // Track the active fetch request to prevent race conditions
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        if (!startDate || !endDate) return;

        // Cancel previous request if still in flight
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        setIsLoading(true);
        try {
            const shopIndices =
                (session?.user as { allowed_tiktok_shops?: number[] } | undefined)
                    ?.allowed_tiktok_shops ?? [1, 2, 3, 4];

            // 1. Fetch connected Shopee shops dynamically
            let shopeeShops: { id: number; shop_id: string; shop_name: string }[] = [];
            try {
                const shopeeShopsRes = await fetch('/api/shopee/shops', { signal });
                if (shopeeShopsRes.ok) {
                    const allShopeeShops = await shopeeShopsRes.json();
                    const allowedShopeeShops = (session?.user as any)?.allowed_shopee_shops || [];
                    const hasRealIds = allowedShopeeShops.some((id: number) => id > 1000);
                    shopeeShops = allShopeeShops.filter((s: any) => {
                        if (!hasRealIds) return true;
                        return allowedShopeeShops.includes(parseInt(s.shop_id, 10));
                    });
                }
            } catch (e: any) {
                if (e.name === 'AbortError') throw e;
                console.error("Failed to load Shopee shops", e);
            }

            const prevRange = getPreviousRange(startDate, endDate, activePreset);

            // 2. Fetch current and previous metrics for TikTok and Shopee shops in parallel
            let curResults: any[] = [];
            let prevResults: any[] = [];
            let shopeeCurResults: any[] = [];
            let shopeePrevResults: any[] = [];

            try {
                const summaryRes = await fetch(
                    `/api/shop-metrics/summary?startDate=${startDate}&endDate=${endDate}&prevStartDate=${prevRange.start}&prevEndDate=${prevRange.end}`,
                    { signal }
                );
                if (summaryRes.ok) {
                    const data = await summaryRes.json();
                    curResults = data.curResults || [];
                    prevResults = data.prevResults || [];
                    shopeeCurResults = data.shopeeCurResults || [];
                    shopeePrevResults = data.shopeePrevResults || [];
                } else {
                    console.error("Failed to load metrics summary:", summaryRes.statusText);
                }
            } catch (e: any) {
                if (e.name === 'AbortError') throw e;
                console.error("Error fetching metrics summary:", e);
            }

            // 3. Build previous period aggregate totals across all channels (filtered by company)
            const filteredPrevResults = prevResults.filter((_, idx) => {
                const num = shopIndices[idx];
                if (companyFilter === "ALL") return true;
                if (companyFilter === "HIMWELLNESS") return num === 1 || num === 2;
                return num === 3 || num === 4;
            });
            const filteredShopeePrevResults = shopeePrevResults.filter((item: any) => {
                if (companyFilter === "ALL") return true;
                const shop = shopeeShops.find((s: any) => String(s.shop_id) === String(item.shopId));
                const name = (shop?.shop_name || item.shopName || '').toLowerCase();
                const isHim = name.includes("him.drsamhan") || name.includes("himclinic");
                if (companyFilter === "HIMWELLNESS") return isHim;
                return !isHim;
            });

            const prevGmv = filteredPrevResults.reduce((s, d) => s + (d?.gmv ?? 0), 0) +
                            filteredShopeePrevResults.reduce((s, d) => s + (d?.gmv ?? 0), 0);
            const prevSpend = filteredPrevResults.reduce((s, d) => s + (d?.totalAdsSpend ?? 0), 0) +
                              filteredShopeePrevResults.reduce((s, d) => s + (d?.totalAdsSpend ?? 0), 0);
            const prevTotalRoas = prevSpend > 0 ? prevGmv / prevSpend : 0;
            setPrevTotals({ gmv: prevGmv, spend: prevSpend, roas: prevTotalRoas });

            // 4. Build TikTok shop cards
            const ttsShops: ShopData[] = shopIndices
                .map((num, idx) => {
                    const d = curResults[idx];
                    const p = prevResults[idx];
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

            // 5. Build Shopee shop cards
            const shpShops: ShopData[] = shopeeShops
                .map((shop) => {
                    const d = shopeeCurResults.find((r: any) => String(r.shopId) === String(shop.shop_id));
                    const p = shopeePrevResults.find((r: any) => String(r.shopId) === String(shop.shop_id));
                    if (!d) {
                        return {
                            id: `shp_${shop.shop_id}`,
                            name: shop.shop_name,
                            platform: "Shopee" as const,
                            type: "shop" as const,
                            shopId: parseInt(shop.shop_id, 10),
                            status: "under_development" as const,
                        };
                    }

                    const name = (shop.shop_name || d?.shopName || '').toLowerCase();
                    const isHim = name.includes("him.drsamhan") || name.includes("himclinic");
                    if (companyFilter === "HIMWELLNESS" && !isHim) return null;
                    if (companyFilter === "WEROCA" && isHim) return null;

                    const curRoas = d.roasBeforeTax ?? 0;
                    const prevRoas = p && (p.totalAdsSpend ?? 0) > 0
                        ? (p.gmv ?? 0) / (p.totalAdsSpend ?? 1)
                        : 0;

                    const shopItem: ShopData = {
                        id: `shp_${shop.shop_id}`,
                        name: shop.shop_name || d.shopName,
                        platform: "Shopee",
                        type: "shop",
                        shopId: parseInt(shop.shop_id, 10),
                        gmv: d.gmv ?? 0,
                        revenue: d.gmv ?? 0,
                        orders: d.orderCount ?? 0,
                        spend: d.totalAdsSpend ?? 0,
                        spendAfterTax: d.totalCostWithTaxes ?? 0,
                        cpasSpend: d.cpasSpend ?? 0,
                        shopeeCpcSpend: d.shopeeCpcSpend ?? 0,
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
                    return shopItem;
                })
                .filter((s): s is ShopData => s !== null);

            const shops = [...ttsShops, ...shpShops];
            setShopData(shops);

            const sources = [...new Set(shops.map((s) => s.dataSource || "live_api"))];
            setDataSource(sources.join("+"));

            // ── Fetch COGS total for selected date range ────────────────────
            const totalGMVForCogs = shops.reduce((s, d) => s + (d.revenue ?? 0), 0);
            try {
                const cogsRes = await fetch(
                    `/api/cogs/total?startDate=${startDate}&endDate=${endDate}&gmv=${totalGMVForCogs}`,
                    { signal }
                );
                if (cogsRes.ok) {
                    const cogsJson = await cogsRes.json();
                    setCogsData({
                        totalCogs: cogsJson.totalCogs || 0,
                        source: cogsJson.source || 'fallback',
                        mappedSkuCount: cogsJson.mappedSkuCount || 0,
                    });
                }
            } catch (e: any) {
                if (e.name === 'AbortError') throw e;
                // Fallback silently
                setCogsData({ totalCogs: totalGMVForCogs * 0.28, source: 'fallback', mappedSkuCount: 0 });
            }

            // ── Build aggregate chart data ──────────────────────────────────
            const daySpan = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
            const isOneDay = daySpan === 1;

            if (isOneDay) {
                // Single day → hourly chart (summed across all shops)
                const hourlyBuckets: { [h: string]: { gmv: number; orders: number; spend: number } } = {};
                for (let i = 0; i < 24; i++) {
                    hourlyBuckets[`${String(i).padStart(2, "0")}:00`] = { gmv: 0, orders: 0, spend: 0 };
                }

                // Filter shops by company for hourly fetching
                const hourlyShopIndices = shopIndices.filter(num => {
                    if (companyFilter === "ALL") return true;
                    if (companyFilter === "HIMWELLNESS") return num === 1 || num === 2;
                    return num === 3 || num === 4;
                });
                const hourlyShopeeShops = shopeeShops.filter(shop => {
                    if (companyFilter === "ALL") return true;
                    const name = shop.shop_name?.toLowerCase() || '';
                    const isHim = name.includes("him.drsamhan") || name.includes("himclinic");
                    if (companyFilter === "HIMWELLNESS") return isHim;
                    return !isHim;
                });

                // Fetch TikTok hourly and Shopee hourly in parallel
                await Promise.all([
                    Promise.all(
                        hourlyShopIndices.map(async (num) => {
                            try {
                                const res = await fetch(
                                    `/api/tiktok/shop-metrics/hourly?date=${startDate}&shopNumber=${num}`,
                                    { signal }
                                );
                                if (!res.ok) return;
                                const data = await res.json();
                                (data.hourly as { hour: string; gmv: number; orders: number }[]).forEach((h) => {
                                    if (hourlyBuckets[h.hour]) {
                                        hourlyBuckets[h.hour].gmv += h.gmv;
                                        hourlyBuckets[h.hour].orders += h.orders;
                                    }
                                });
                            } catch (e: any) {
                                if (e.name === 'AbortError') throw e;
                                /* ignore other errors */
                            }
                        })
                    ),
                    Promise.all(
                        hourlyShopeeShops.map(async (shop) => {
                            try {
                                const res = await fetch(
                                    `/api/shopee/shop-metrics/hourly?date=${startDate}&shopId=${shop.shop_id}`,
                                    { signal }
                                );
                                if (!res.ok) return;
                                const data = await res.json();
                                (data.hourly as { hour: string; gmv: number; orders: number; spend: number }[]).forEach((h) => {
                                    if (hourlyBuckets[h.hour]) {
                                        hourlyBuckets[h.hour].gmv += h.gmv;
                                        hourlyBuckets[h.hour].orders += h.orders;
                                        hourlyBuckets[h.hour].spend += h.spend || 0;
                                    }
                                });
                            } catch (e: any) {
                                if (e.name === 'AbortError') throw e;
                                /* ignore other errors */
                            }
                        })
                    )
                ]);

                const points: PerformanceDataPoint[] = Object.entries(hourlyBuckets).map(([hour, b]) => ({
                    label: hour,
                    gmv: b.gmv,
                    spend: b.spend,
                    roas: b.spend > 0 ? b.gmv / b.spend : 0,
                    orders: b.orders,
                }));

                setChartData(points);
            } else {
                // Multi-day → daily chart (using single consolidated endpoint)
                try {
                    const res = await fetch(`/api/shop-metrics/daily-trend?startDate=${startDate}&endDate=${endDate}&company=${companyFilter}`, { signal });
                    if (res.ok) {
                        const data = await res.json();
                        setChartData(data);
                    } else {
                        console.error("Failed to load daily trend metrics:", res.statusText);
                    }
                } catch (e: any) {
                    if (e.name === 'AbortError') throw e;
                    console.error("Error fetching daily trend metrics:", e);
                }
            }

            // ── Fetch livestream leaderboard ──────────────────────────────
            try {
                const liveRes = await fetch(`/api/tiktok/livestream-performance?startDate=${startDate}&endDate=${endDate}&company=${companyFilter}`, { signal });
                if (liveRes.ok) {
                    const liveJson = await liveRes.json();
                    setLivestreams(liveJson.leaderboard || []);
                }
            } catch (e: any) {
                if (e.name === 'AbortError') throw e;
                console.error("Failed to load livestream performance", e);
            }


        } catch (error: any) {
            if (error.name === 'AbortError') {
                // Silent catch abort
                return;
            }
            console.error("Error fetching shop data:", error);
        } finally {
            if (abortControllerRef.current === controller) {
                setIsLoading(false);
            }
        }
    }, [startDate, endDate, activePreset, session, companyFilter]);

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

    // TikTok Shop segment breakdown calculations
    const ttsShopsOnly = shopData.filter(s => s.platform === "TikTok");
    const ttsRevenue = ttsShopsOnly.reduce((s, d) => s + (d.revenue ?? 0), 0);
    const ttsSpend = ttsShopsOnly.reduce((s, d) => s + (d.spend ?? 0), 0);
    const ttsSpendAfterTax = ttsShopsOnly.reduce((s, d) => s + (d.spendAfterTax ?? 0), 0);
    const ttsRoas = ttsSpend > 0 ? ttsRevenue / ttsSpend : 0;
    const ttsRoasAfterTax = ttsSpendAfterTax > 0 ? ttsRevenue / ttsSpendAfterTax : 0;

    // Shopee segment breakdown calculations
    const shpShopsOnly = shopData.filter(s => s.platform === "Shopee");
    const shpRevenue = shpShopsOnly.reduce((s, d) => s + (d.revenue ?? 0), 0);
    const shpSpend = shpShopsOnly.reduce((s, d) => s + (d.spend ?? 0), 0);
    const shpSpendAfterTax = shpShopsOnly.reduce((s, d) => s + (d.spendAfterTax ?? 0), 0);
    const shpRoas = shpSpend > 0 ? shpRevenue / shpSpend : 0;
    const shpRoasAfterTax = shpSpendAfterTax > 0 ? shpRevenue / shpSpendAfterTax : 0;

    // ── Profit metrics ──────────────────────────────────────────────────────
    const totalCogs = cogsData.totalCogs;
    const platformCost = totalRevenue * 0.25;   // 25% platform fee on total GMV
    const nettProfit = totalRevenue - totalCogs - platformCost - totalSpendAfterTax;
    const nettMarginPct = totalRevenue > 0 ? (nettProfit / totalRevenue) * 100 : 0;
    const cogsPct = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;
    const platformCostPct = 25;  // always 25% by definition
    const adSpendPct = totalRevenue > 0 ? (totalSpendAfterTax / totalRevenue) * 100 : 0;

    // ── Platform contribution % ─────────────────────────────────────────────
    const ttsContrib = totalRevenue > 0 ? (ttsRevenue / totalRevenue) * 100 : 0;
    const shpContrib = totalRevenue > 0 ? (shpRevenue / totalRevenue) * 100 : 0;

    const gmvPct = pctChange(totalRevenue, prevTotals.gmv);
    const spendPct = pctChange(totalSpend, prevTotals.spend);
    const roasPct = pctChange(totalRoas, prevTotals.roas);

    const cmpLabel = comparisonLabel(activePreset);

    /* ── render ─────────────────────────────────────────────────────────── */
    return (
        <div className="space-y-4 md:space-y-6">

            {/* ── Toolbar ────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">

                {/* Row 1: Company filter + live status + refresh */}
                <div className="flex flex-wrap items-center gap-2">

                    {/* Company filter pills */}
                    <div className="flex items-center gap-0.5 bg-slate-900/70 border border-slate-700/50 rounded-xl p-1 backdrop-blur-sm select-none">
                        {(["ALL", "HIMWELLNESS", "WEROCA"] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setCompanyFilter(filter)}
                                className={cn(
                                    "text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap",
                                    companyFilter === filter
                                        ? filter === "ALL"
                                            ? "bg-primary text-white shadow-md shadow-primary/25"
                                            : filter === "HIMWELLNESS"
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                            : "bg-purple-600 text-white shadow-md shadow-purple-500/25"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                )}
                            >
                                {filter === "ALL" ? "All" : filter === "HIMWELLNESS" ? "HIM" : "WEROCA"}
                            </button>
                        ))}
                    </div>

                    {/* Live countdown (today only) */}
                    {activePreset === "today" && (
                        <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700/50 rounded-xl px-3 py-1.5 backdrop-blur-sm select-none">
                            <span className={cn(
                                "h-2 w-2 rounded-full flex-shrink-0",
                                autoRefresh ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-amber-500"
                            )} />
                            <span className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">
                                {autoRefresh ? `Live · ${secondsLeft}s` : "Paused"}
                            </span>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700/50"
                            >
                                {autoRefresh ? "Pause" : "Resume"}
                            </button>
                        </div>
                    )}

                    {/* Refresh button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={isLoading}
                        className="h-9 px-3 rounded-xl border-slate-700/60 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[11px] gap-1.5"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                        Refresh
                    </Button>

                    {/* Data source badge */}
                    {!isLoading && dataSource && (
                        <span className={cn(
                            "inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-semibold border select-none",
                            dataSource.includes("database") && !dataSource.includes("api")
                                ? "border-blue-500/30 text-blue-400 bg-blue-500/8"
                                : dataSource.includes("database") && dataSource.includes("api")
                                ? "border-purple-500/30 text-purple-400 bg-purple-500/8"
                                : "border-emerald-500/30 text-emerald-400 bg-emerald-500/8"
                        )}>
                            <span className={cn(
                                "h-1.5 w-1.5 rounded-full flex-shrink-0",
                                dataSource.includes("database") && !dataSource.includes("api") ? "bg-blue-400"
                                : dataSource.includes("database") ? "bg-purple-400"
                                : "bg-emerald-400 animate-pulse"
                            )} />
                            {dataSource.includes("database") && !dataSource.includes("api") ? "DB Cache"
                             : dataSource.includes("database") ? "Mixed"
                             : "Live"}
                        </span>
                    )}
                </div>

                {/* Row 2: Date picker — full width on mobile */}
                <div className="w-full">
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

            {/* ── Row 1: Summary Cards — Total GMV (Highlighted), Ad Spend, ROAS ────────── */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                {/* 1. GMV Hero Card */}
                <Card className="col-span-2 lg:col-span-2 bg-gradient-to-br from-primary/15 to-purple-900/10 border-primary/25 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">Total GMV</CardTitle>
                            <SyncIndicator isLoading={isLoading} dataSource={dataSource} />
                        </div>
                        {!isLoading && <TrendBadge pct={gmvPct} />}
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums leading-none pt-2">
                            RM {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {/* ── Row 2: Platform-Specific Performance Breakdown ────────── */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* 1. TikTok Shop Card */}
                <Card className="border-slate-800/80 bg-slate-900/20 hover:border-slate-700/60 transition-all duration-300 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/30">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🎵</span>
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-100">TikTok Shop</CardTitle>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Performance across TikTok shops</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <SyncIndicator isLoading={isLoading} dataSource={dataSource} />
                            <Badge className="bg-primary/20 text-primary border border-primary/30">TikTok</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1 bg-slate-950/50 p-3 rounded-lg border border-border/30 sm:border-none sm:bg-transparent sm:p-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total Sales</span>
                            <div className="text-base sm:text-lg font-extrabold text-foreground">
                                RM {ttsRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="space-y-1 bg-slate-950/50 p-3 rounded-lg border border-border/30 sm:border-none sm:bg-transparent sm:p-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total Cost</span>
                            <div className="text-base sm:text-lg font-extrabold text-foreground">
                                RM {ttsSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[9px] text-purple-400 font-medium">
                                RM {ttsSpendAfterTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Net)
                            </div>
                        </div>
                        <div className="space-y-1 bg-slate-950/50 p-3 rounded-lg border border-border/30 sm:border-none sm:bg-transparent sm:p-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400">ROAS</span>
                            <div className="text-base sm:text-lg font-extrabold text-green-400">
                                {ttsRoas.toFixed(2)}x
                            </div>
                            <div className="text-[9px] text-emerald-400 font-medium">
                                {ttsRoasAfterTax.toFixed(2)}x (Net)
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Shopee Card */}
                <Card className="border-slate-800/80 bg-slate-900/20 hover:border-slate-700/60 transition-all duration-300 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/30">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🛍️</span>
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-100">Shopee Shop</CardTitle>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Performance across Shopee shops</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <SyncIndicator isLoading={isLoading} dataSource={dataSource} />
                            <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30">Shopee</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1 bg-slate-950/50 p-3 rounded-lg border border-border/30 sm:border-none sm:bg-transparent sm:p-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total Sales</span>
                            <div className="text-base sm:text-lg font-extrabold text-foreground">
                                RM {shpRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="space-y-1 bg-slate-950/50 p-3 rounded-lg border border-border/30 sm:border-none sm:bg-transparent sm:p-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total Cost</span>
                            <div className="text-base sm:text-lg font-extrabold text-foreground">
                                RM {shpSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[9px] text-purple-400 font-medium">
                                RM {shpSpendAfterTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Net)
                            </div>
                        </div>
                        <div className="space-y-1 bg-slate-950/50 p-3 rounded-lg border border-border/30 sm:border-none sm:bg-transparent sm:p-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400">ROAS</span>
                            <div className="text-base sm:text-lg font-extrabold text-green-400">
                                {shpRoas.toFixed(2)}x
                            </div>
                            <div className="text-[9px] text-emerald-400 font-medium">
                                {shpRoasAfterTax.toFixed(2)}x (Net)
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Row 3: % Contribution by Platform & Store ────────────────────── */}
            {totalRevenue > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Platform Contribution */}
                    <Card className="border-slate-800/60 bg-slate-900/30 backdrop-blur-sm">
                        <CardHeader className="pb-3 border-b border-slate-800/40">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Percent className="h-4 w-4 text-primary" />
                                Platform Contribution
                            </CardTitle>
                            <p className="text-[10px] text-muted-foreground">% of total GMV by marketplace</p>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            {/* TikTok */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                                        <span className="text-sm">🎵</span> TikTok Shop
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 font-mono text-[10px]">RM {ttsRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <span className="font-bold text-primary">{ttsContrib.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-purple-400 transition-all duration-700" style={{ width: `${ttsContrib}%` }} />
                                </div>
                            </div>
                            {/* Shopee */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                                        <span className="text-sm">🛍️</span> Shopee
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 font-mono text-[10px]">RM {shpRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <span className="font-bold text-orange-400">{shpContrib.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700" style={{ width: `${shpContrib}%` }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Per-Store Contribution */}
                    <Card className="border-slate-800/60 bg-slate-900/30 backdrop-blur-sm">
                        <CardHeader className="pb-3 border-b border-slate-800/40">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Percent className="h-4 w-4 text-amber-400" />
                                Store Contribution
                            </CardTitle>
                            <p className="text-[10px] text-muted-foreground">% of total GMV by individual store</p>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
                            {[...shopData]
                                .filter(s => (s.revenue ?? 0) > 0)
                                .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
                                .map((shop, idx) => {
                                    const contrib = totalRevenue > 0 ? ((shop.revenue ?? 0) / totalRevenue) * 100 : 0;
                                    const isTikTok = shop.platform === 'TikTok';
                                    return (
                                        <div key={shop.id} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1.5 font-medium text-slate-300 truncate max-w-[55%]">
                                                    <span className="text-[10px]">{isTikTok ? '🎵' : '🛍️'}</span>
                                                    <span className="truncate">{shop.name}</span>
                                                </span>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-slate-500 font-mono text-[9px]">RM {(shop.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                    <span className={cn("font-bold text-xs", isTikTok ? "text-primary" : "text-orange-400")}>{contrib.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-700", isTikTok ? "bg-gradient-to-r from-primary/80 to-purple-400/80" : "bg-gradient-to-r from-orange-500/80 to-amber-400/80")}
                                                    style={{ width: `${contrib}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Profit & Cost Breakdown ────────────────────────────────── */}
            {totalRevenue > 0 && (
                <Card className="border-slate-800/60 bg-gradient-to-br from-slate-900/60 to-slate-950/80 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-800/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-emerald-400" />
                                    Profit & Cost Breakdown
                                </CardTitle>
                                <p className="text-[10px] text-muted-foreground mt-0.5">GMV waterfall — COGS · Platform Fee · Ad Spend → Nett Profit</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                    cogsData.source === 'dynamic'
                                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                        : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                                )}>
                                    {cogsData.source === 'dynamic' ? `✓ Dynamic COGS (${cogsData.mappedSkuCount} SKUs)` : '⚠ COGS Estimate (28%)'}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                        {/* Waterfall row */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {/* GMV */}
                            <div className="col-span-1 space-y-1.5 p-3 rounded-lg bg-blue-500/8 border border-blue-500/20">
                                <p className="text-[9px] uppercase font-bold text-blue-400 tracking-wider">Total GMV</p>
                                <div className="text-base font-extrabold text-blue-300">
                                    RM {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-[9px] text-muted-foreground">100% Revenue</p>
                            </div>

                            {/* COGS */}
                            <div className="col-span-1 space-y-1.5 p-3 rounded-lg bg-orange-500/8 border border-orange-500/20">
                                <p className="text-[9px] uppercase font-bold text-orange-400 tracking-wider">COGS</p>
                                <div className="text-base font-extrabold text-orange-300">
                                    − RM {totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-[9px] text-muted-foreground">{cogsPct.toFixed(1)}% of GMV</p>
                            </div>

                            {/* Platform Cost */}
                            <div className="col-span-1 space-y-1.5 p-3 rounded-lg bg-yellow-500/8 border border-yellow-500/20">
                                <p className="text-[9px] uppercase font-bold text-yellow-400 tracking-wider">Platform Fee</p>
                                <div className="text-base font-extrabold text-yellow-300">
                                    − RM {platformCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-[9px] text-muted-foreground">25% of GMV (fixed)</p>
                            </div>

                            {/* Ad Spend */}
                            <div className="col-span-1 space-y-1.5 p-3 rounded-lg bg-purple-500/8 border border-purple-500/20">
                                <p className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">Ad Spend (Net)</p>
                                <div className="text-base font-extrabold text-purple-300">
                                    − RM {totalSpendAfterTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-[9px] text-muted-foreground">{adSpendPct.toFixed(1)}% of GMV (incl. SST+WHT)</p>
                            </div>

                            {/* Nett Profit */}
                            <div className={cn(
                                "col-span-2 sm:col-span-1 space-y-1.5 p-3 rounded-lg border",
                                nettProfit >= 0
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : "bg-red-500/10 border-red-500/30"
                            )}>
                                <p className={cn(
                                    "text-[9px] uppercase font-bold tracking-wider",
                                    nettProfit >= 0 ? "text-emerald-400" : "text-red-400"
                                )}>Nett Profit</p>
                                <div className={cn(
                                    "text-base font-extrabold",
                                    nettProfit >= 0 ? "text-emerald-300" : "text-red-400"
                                )}>
                                    RM {nettProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className={cn(
                                    "text-[9px] font-semibold",
                                    nettProfit >= 0 ? "text-emerald-400" : "text-red-400"
                                )}>
                                    {nettMarginPct.toFixed(1)}% margin
                                </p>
                            </div>
                        </div>

                        {/* Visual % bar */}
                        <div className="mt-4 space-y-1.5">
                            <div className="flex h-3 rounded-full overflow-hidden gap-px">
                                <div className="bg-orange-500/70" style={{ width: `${Math.min(cogsPct, 100)}%` }} title={`COGS ${cogsPct.toFixed(1)}%`} />
                                <div className="bg-yellow-400/70" style={{ width: `${Math.min(platformCostPct, 100)}%` }} title="Platform Fee 25%" />
                                <div className="bg-purple-500/70" style={{ width: `${Math.min(adSpendPct, 100)}%` }} title={`Ad Spend ${adSpendPct.toFixed(1)}%`} />
                                <div className={cn(
                                    "flex-1 min-w-0",
                                    nettProfit >= 0 ? "bg-emerald-500/70" : "bg-red-500/70"
                                )} title={`Nett Profit ${nettMarginPct.toFixed(1)}%`} />
                            </div>
                            <div className="flex items-center gap-4 flex-wrap text-[9px] text-muted-foreground">
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-orange-500/70" />COGS {cogsPct.toFixed(1)}%</span>
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-yellow-400/70" />Platform Fee 25%</span>
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-purple-500/70" />Ad Spend (Net) {adSpendPct.toFixed(1)}%</span>
                                <span className="flex items-center gap-1"><span className={cn("h-2 w-2 rounded-sm", nettProfit >= 0 ? "bg-emerald-500/70" : "bg-red-500/70")} />Nett Profit {nettMarginPct.toFixed(1)}%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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

            {/* Livestream Performance Leaderboard Section */}
            <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-blue-500/30 transition-colors">
                <CardHeader className="border-b border-border/30 pb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-400" />
                                TikTok Shop Livestream Leaderboard
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Rankings based on sales volume and total order counts generated from active live sessions</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-300">
                            <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20"><Tv className="h-3 w-5" /> {livestreams.length} Sessions</span>
                            <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20"><Users className="h-3.5 w-3.5" /> {livestreams.reduce((sum, s) => sum + parseInt(s.viewer_count || 0, 10), 0).toLocaleString()} Peak Viewers</span>
                            <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20"><ShoppingBag className="h-3.5 w-3.5" /> {livestreams.reduce((sum, s) => sum + parseInt(s.order_count || 0, 10), 0).toLocaleString()} Total Orders</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {livestreams.length > 0 ? (
                        <div className="overflow-x-auto overflow-y-auto max-h-[520px] scrollbar-thin -webkit-overflow-scrolling-touch">
                            <table className="w-full min-w-[720px] text-left text-sm border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm shadow-[0_1px_0_rgba(255,255,255,0.05)]">
                                    <tr className="border-b border-border/30 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        <th className="py-3 px-3 text-center w-14">Rank</th>
                                        <th className="py-3 px-3">Account</th>
                                        <th className="py-3 px-3 text-center">Date</th>
                                        <th className="py-3 px-3 text-center">Dur.</th>
                                        <th className="py-3 px-3 min-w-[200px]">Title</th>
                                        <th className="py-3 px-3 text-center">Viewers</th>
                                        <th className="py-3 px-3 text-center">Orders</th>
                                        <th className="py-3 px-3 text-right">GMV</th>
                                        <th className="py-3 px-3 text-center">Start</th>
                                        <th className="py-3 px-3 text-center">End</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {livestreams.map((stream, idx) => {
                                        const rankSymbol = idx === 0 ? "🏆" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
                                        const rankClass = idx === 0 ? "text-lg font-bold" : idx === 1 || idx === 2 ? "text-base font-bold" : "text-slate-400 font-medium";
                                        
                                        const shopName = SHOP_NAMES[stream.shop_number] || `Shop ${stream.shop_number}`;
                                        const themeColor = SHOP_THEME_COLORS[stream.shop_number] || "border-slate-500/30 text-slate-400 bg-slate-500/10";
                                        
                                        const ordersCount = parseInt(stream.order_count || 0, 10);
                                        const gmvAmount = parseFloat(stream.gmv || 0);

                                        // All times are stored as KL local time in DB.
                                        // Always format in KL timezone explicitly — never rely on browser locale.
                                        const start = stream.start_time ? new Date(stream.start_time) : null;
                                        const end = stream.end_time ? new Date(stream.end_time) : null;

                                        const KL = 'Asia/Kuala_Lumpur';

                                        const dateStr = start
                                            ? start.toLocaleDateString('en-MY', { timeZone: KL, day: '2-digit', month: 'short', year: 'numeric' })
                                            : '-';

                                        const startTimeStr = start
                                            ? start.toLocaleTimeString('en-MY', { timeZone: KL, hour: '2-digit', minute: '2-digit', hour12: false })
                                            : '-';

                                        const endTimeStr = end
                                            ? end.toLocaleTimeString('en-MY', { timeZone: KL, hour: '2-digit', minute: '2-digit', hour12: false })
                                            : '-';

                                        let durationStr = '-';
                                        if (start && end) {
                                            const diffMs = end.getTime() - start.getTime();
                                            if (diffMs > 0) {
                                                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                                durationStr = `${hours}h ${mins}m`;
                                            }
                                        }

                                        return (
                                            <tr key={`${stream.shop_number}-${stream.live_id}`} className="border-b border-border/10 hover:bg-muted/10 transition-colors group">
                                                <td className="py-3 px-3 text-center font-semibold">
                                                    <span className={rankClass}>{rankSymbol}</span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <Badge variant="outline" className={`font-semibold border text-[10px] px-2 py-0.5 rounded-full ${themeColor}`}>
                                                        {shopName}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3 text-center text-slate-300 text-xs font-medium whitespace-nowrap">
                                                    {dateStr}
                                                </td>
                                                <td className="py-3 px-3 text-center text-slate-400 text-xs whitespace-nowrap">
                                                    {durationStr}
                                                </td>
                                                <td className="py-3 px-3 font-medium text-slate-300 group-hover:text-blue-400 transition-colors max-w-[240px] truncate" title={stream.live_title}>
                                                    {stream.live_title}
                                                </td>
                                                <td className="py-3 px-3 text-center text-slate-300 text-xs">
                                                    {parseInt(stream.viewer_count || 0, 10).toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-center font-bold text-slate-200">
                                                    {ordersCount.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                                                    RM {gmvAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-3 text-center text-slate-300 text-xs font-mono">
                                                    {startTimeStr}
                                                </td>
                                                <td className="py-3 px-3 text-center text-slate-300 text-xs font-mono">
                                                    {endTimeStr}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                            No livestream performance records found in this date range.
                        </div>
                    )}
                </CardContent>
            </Card>



            {/* ── Connected Accounts ───────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">Connected Accounts</h2>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Tap any shop to view detailed analytics</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isLoading && (
                            <span className="text-[10px] text-muted-foreground animate-pulse hidden sm:block">
                                Fetching data...
                            </span>
                        )}
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            {shopData.length} Sources
                        </Badge>
                    </div>
                </div>

                {/* 1-col mobile → 2-col sm → 3-col lg → 4-col xl */}
                <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {shopData.map((shop) => (
                        <ShopCard
                            key={shop.id}
                            data={shop}
                            onClick={() => setSelectedShop(shop)}
                            isLoading={isLoading}
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
