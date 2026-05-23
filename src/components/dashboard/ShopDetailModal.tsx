"use client";

import { useEffect, useState, useCallback } from "react";
import { format, subDays, parseISO, differenceInDays } from "date-fns";
import { X, TrendingUp, TrendingDown, Minus, ShoppingBag, DollarSign, BarChart3, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShopData } from "@/lib/mockData";
import { PerformanceLineChart, PerformanceDataPoint } from "@/components/dashboard/Charts";
import { DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { cn } from "@/lib/utils";

interface ShopDetailModalProps {
    shop: ShopData;
    startDate: string;
    endDate: string;
    preset: DatePreset;
    onClose: () => void;
}

interface ModalMetrics {
    gmv: number;
    orders: number;
    spend: number;
    spendAfterTax: number;
    roas: number;
    roasAfterTax: number;
    prevGmv: number;
    prevSpend: number;
    prevRoas: number;
}

function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

function getPreviousRange(startDate: string, endDate: string, preset: DatePreset): { start: string; end: string } {
    const startParsed = parseISO(startDate);
    const end = parseISO(endDate);
    const daySpan = differenceInDays(end, startParsed) + 1;

    switch (preset) {
        case 'today':
        case 'yesterday': {
            const prevDay = subDays(startParsed, 1);
            return { start: format(prevDay, 'yyyy-MM-dd'), end: format(prevDay, 'yyyy-MM-dd') };
        }
        case 'weekly': {
            const prevStart = subDays(startParsed, 7);
            const prevEnd = subDays(startParsed, 1);
            return { start: format(prevStart, 'yyyy-MM-dd'), end: format(prevEnd, 'yyyy-MM-dd') };
        }
        case 'monthly':
        default: {
            const prevStart = subDays(startParsed, daySpan);
            const prevEnd = subDays(startParsed, 1);
            return { start: format(prevStart, 'yyyy-MM-dd'), end: format(prevEnd, 'yyyy-MM-dd') };
        }
    }
}

function TrendBadge({ pct, suffix = "" }: { pct: number; suffix?: string }) {
    const abs = Math.abs(pct);
    const label = `${abs.toFixed(1)}%${suffix}`;
    if (pct > 0.5)
        return (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                {label}
            </span>
        );
    if (pct < -0.5)
        return (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-400">
                <TrendingDown className="h-3 w-3" />
                {label}
            </span>
        );
    return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground">
            <Minus className="h-3 w-3" />
            {label}
        </span>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
    subValue,
    subLabel,
    pct,
    iconColor,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    subValue?: string;
    subLabel?: string;
    pct: number;
    iconColor: string;
}) {
    return (
        <div className="bg-card/40 border border-border/50 rounded-xl p-4 space-y-2 backdrop-blur-sm">
            <div className="flex items-center justify-between">
                <div className={cn("p-1.5 rounded-lg", iconColor)}>
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <TrendBadge pct={pct} />
            </div>
            <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                <p className="text-lg font-bold tabular-nums mt-0.5">{value}</p>
                {subValue && subLabel && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                        <span className="text-purple-400 font-medium">{subLabel}:</span> {subValue}
                    </p>
                )}
            </div>
        </div>
    );
}

export function ShopDetailModal({ shop, startDate, endDate, preset, onClose }: ShopDetailModalProps) {
    const [metrics, setMetrics] = useState<ModalMetrics | null>(null);
    const [chartData, setChartData] = useState<PerformanceDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartMode, setChartMode] = useState<'hourly' | 'daily'>('daily');

    const shopNum = shop.shopNumber;
    const shopId = shop.shopId;
    const isTikTok = shop.platform === 'TikTok';

    const fetchMetrics = useCallback(async () => {
        if (isTikTok && !shopNum) return;
        if (!isTikTok && !shopId) return;
        setLoading(true);
        try {
            const prevRange = getPreviousRange(startDate, endDate, preset);

            const curUrl = isTikTok 
                ? `/api/tiktok/shop-metrics?startDate=${startDate}&endDate=${endDate}&shopNumber=${shopNum}`
                : `/api/shopee/shop-metrics?startDate=${startDate}&endDate=${endDate}&shopId=${shopId}`;
            
            const prevUrl = isTikTok
                ? `/api/tiktok/shop-metrics?startDate=${prevRange.start}&endDate=${prevRange.end}&shopNumber=${shopNum}`
                : `/api/shopee/shop-metrics?startDate=${prevRange.start}&endDate=${prevRange.end}&shopId=${shopId}`;

            // Fetch current + previous period in parallel
            const [curRes, prevRes] = await Promise.all([
                fetch(curUrl),
                fetch(prevUrl),
            ]);

            const [cur, prev] = await Promise.all([curRes.json(), prevRes.json()]);

            setMetrics({
                gmv: cur.gmv || 0,
                orders: cur.orderCount || 0,
                spend: cur.totalAdsSpend || 0,
                spendAfterTax: cur.totalCostWithTaxes || 0,
                roas: cur.roasBeforeTax || 0,
                roasAfterTax: cur.roasAfterTax || 0,
                prevGmv: prev.gmv || 0,
                prevSpend: prev.totalAdsSpend || 0,
                prevRoas: prev.roasBeforeTax || 0,
            });

            // Determine chart granularity: hourly for single-day, daily otherwise
            const daySpan = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
            const isOneDay = daySpan === 1;
            setChartMode(isOneDay ? 'hourly' : 'daily');

            if (isOneDay) {
                // Fetch hourly breakdown for the single day
                const hourlyUrl = isTikTok
                    ? `/api/tiktok/shop-metrics/hourly?date=${startDate}&shopNumber=${shopNum}`
                    : `/api/shopee/shop-metrics/hourly?date=${startDate}&shopId=${shopId}`;
                const hourlyRes = await fetch(hourlyUrl);
                if (hourlyRes.ok) {
                    const hourlyData = await hourlyRes.json();
                    const points: PerformanceDataPoint[] = (hourlyData.hourly || []).map((h: { hour: string; gmv: number; orders: number; spend?: number; roas?: number }) => ({
                        label: h.hour,
                        gmv: h.gmv,
                        spend: h.spend || 0,
                        roas: h.roas || 0,
                        orders: h.orders,
                    }));
                    setChartData(points);
                }
            } else {
                // Build a daily chart: fetch each individual day in the range
                const days: string[] = [];
                for (let i = 0; i < daySpan; i++) {
                    days.push(format(subDays(parseISO(endDate), daySpan - 1 - i), 'yyyy-MM-dd'));
                }

                const dailyPoints: PerformanceDataPoint[] = [];
                // Batch fetch: up to 30 days, fetch day-by-day metrics
                const dayResults = await Promise.all(
                    days.map(day => {
                        const dayUrl = isTikTok
                            ? `/api/tiktok/shop-metrics?startDate=${day}&endDate=${day}&shopNumber=${shopNum}`
                            : `/api/shopee/shop-metrics?startDate=${day}&endDate=${day}&shopId=${shopId}`;
                        return fetch(dayUrl)
                            .then(r => r.ok ? r.json() : null)
                            .catch(() => null);
                    })
                );

                dayResults.forEach((d, idx) => {
                    if (!d) return;
                    dailyPoints.push({
                        label: format(parseISO(days[idx]), 'MMM d'),
                        gmv: d.gmv || 0,
                        spend: d.totalAdsSpend || 0,
                        roas: d.roasBeforeTax || 0,
                        orders: d.orderCount || 0,
                    });
                });

                setChartData(dailyPoints);
            }
        } catch (e) {
            console.error('[ShopDetailModal] Error fetching metrics:', e);
        } finally {
            setLoading(false);
        }
    }, [shopNum, shopId, isTikTok, startDate, endDate, preset]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const fmtRM = (v: number) =>
        `RM ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Slide-in panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-[520px] z-50 flex flex-col bg-background border-l border-border/60 shadow-2xl overflow-y-auto animate-slide-in-right">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <h2 className="text-lg font-bold tracking-tight">{shop.name}</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {shop.platform} • {startDate === endDate ? startDate : `${startDate} → ${endDate}`}
                        </p>
                        <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0.5 h-5 border-emerald-500/30 text-emerald-500 mt-1"
                        >
                            Active
                        </Badge>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Close panel"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-5 space-y-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading shop data...</p>
                        </div>
                    ) : metrics ? (
                        <>
                            {/* Metric Cards Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard
                                    icon={ShoppingBag}
                                    label="Sales (GMV)"
                                    value={fmtRM(metrics.gmv)}
                                    pct={pctChange(metrics.gmv, metrics.prevGmv)}
                                    iconColor="bg-indigo-500/15 text-indigo-400"
                                />
                                <MetricCard
                                    icon={Package}
                                    label="Orders"
                                    value={metrics.orders.toLocaleString()}
                                    pct={pctChange(metrics.orders, 0)}
                                    iconColor="bg-blue-500/15 text-blue-400"
                                />
                                <MetricCard
                                    icon={DollarSign}
                                    label="Ad Spend"
                                    value={fmtRM(metrics.spend)}
                                    subValue={fmtRM(metrics.spendAfterTax)}
                                    subLabel="After Tax"
                                    pct={pctChange(metrics.spend, metrics.prevSpend)}
                                    iconColor="bg-purple-500/15 text-purple-400"
                                />
                                <MetricCard
                                    icon={BarChart3}
                                    label="ROAS"
                                    value={`${metrics.roas.toFixed(2)}x`}
                                    subValue={`${metrics.roasAfterTax.toFixed(2)}x`}
                                    subLabel="After Tax"
                                    pct={pctChange(metrics.roas, metrics.prevRoas)}
                                    iconColor="bg-emerald-500/15 text-emerald-400"
                                />
                            </div>

                            {/* Chart */}
                            <div className="bg-card/40 border border-border/50 rounded-xl p-4 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-sm font-semibold">Performance Trend</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {chartMode === 'hourly' ? 'Hourly GMV breakdown (GMT+8)' : 'Daily GMV, Spend & ROAS'}
                                        </p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] border-border/50 text-muted-foreground"
                                    >
                                        {chartMode === 'hourly' ? '⏰ Hourly' : '📅 Daily'}
                                    </Badge>
                                </div>
                                {chartData.length > 0 ? (
                                    <PerformanceLineChart data={chartData} height={220} />
                                ) : (
                                    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                                        No chart data available
                                    </div>
                                )}
                            </div>

                            {/* Comparison note */}
                            <p className="text-[11px] text-muted-foreground text-center pb-2">
                                Trend arrows compare against {preset === 'today' ? 'yesterday' :
                                    preset === 'yesterday' ? '2 days ago' :
                                    preset === 'weekly' ? 'prior 7 days' :
                                    preset === 'monthly' ? 'prior month' : 'previous equivalent period'}
                            </p>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                            Failed to load shop data
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.25s ease-out forwards;
                }
            `}</style>
        </>
    );
}
