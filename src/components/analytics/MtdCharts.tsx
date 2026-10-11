"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw, Target, Layers } from "lucide-react";

interface MtdChartsProps {
    monthlyTrend: any[];
    dayRangeEnd: number;
}

export function MtdCharts({ monthlyTrend, dayRangeEnd }: MtdChartsProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [chartMode, setChartMode] = useState<"targetVsActual" | "platformSplit">("targetVsActual");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Flatten nested tiktok.sales, shopee.sales, and targets for reliable Recharts rendering
    const chartData = useMemo(() => {
        if (!Array.isArray(monthlyTrend)) return [];
        return monthlyTrend.map((item: any) => {
            const tiktok = Number(item.tiktok?.sales || item.tiktokSales || 0);
            const shopee = Number(item.shopee?.sales || item.shopeeSales || 0);
            const totalSales = Number(item.totalSales || (tiktok + shopee));
            const targetSales = Number(item.targetSales || 0);
            const attainmentRate = targetSales > 0 ? (totalSales / targetSales) * 100 : 0;
            const variance = totalSales - targetSales;

            return {
                monthLabel: item.monthLabel || item.label || '',
                monthKey: item.monthKey || '',
                tiktok,
                shopee,
                totalSales,
                targetSales,
                attainmentRate,
                variance
            };
        });
    }, [monthlyTrend]);

    if (!isMounted) {
        return (
            <Card id="mtd-ringkasan-chart" className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm">
                <CardHeader className="border-b border-border/30 pb-4">
                    <CardTitle className="text-base font-bold text-foreground">Sales Visualizer (MTD)</CardTitle>
                    <CardDescription>Visual comparison of total MTD sales up to Day {dayRangeEnd}.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[280px] flex items-center justify-center text-muted-foreground text-xs">
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin text-primary" /> Loading sales visualizer...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card id="mtd-ringkasan-chart" className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm">
            <CardHeader className="border-b border-border/30 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <span>Historical Trend (Bulan 1 &rarr; Latest)</span>
                            <span className="text-xs font-normal text-muted-foreground">Up to Day {dayRangeEnd}</span>
                        </CardTitle>
                        <CardDescription>
                            {chartMode === "targetVsActual" 
                                ? "Pattern graph of Target vs Actual Sales for every month stored in database."
                                : "Cumulative stacked platform GMV (TikTok + Shopee) across historical months."}
                        </CardDescription>
                    </div>

                    {/* View Switcher Toggle */}
                    <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setChartMode("targetVsActual")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                chartMode === "targetVsActual"
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Target className="h-3.5 w-3.5" />
                            <span>Target vs Actual</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartMode("platformSplit")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                chartMode === "platformSplit"
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Platforms Split</span>
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 pb-4">
                {chartData.length === 0 ? (
                    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-xs">
                        No trend data available to visualize
                    </div>
                ) : (
                    <div className="w-full h-[300px] min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
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
                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)"
                                    }}
                                    formatter={(val: any, name: any) => {
                                        const num = Number(val || 0);
                                        const formatted = `RM ${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                                        if (name === 'targetSales') return [formatted, '🎯 Target Sales'];
                                        if (name === 'totalSales') return [formatted, '📊 Total Actual Sales'];
                                        if (name === 'tiktok') return [formatted, '🛒 TikTok Shop'];
                                        if (name === 'shopee') return [formatted, '🛍️ Shopee Shop'];
                                        return [formatted, name];
                                    }}
                                />
                                <Legend 
                                    iconSize={10} 
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                                    formatter={(value) => {
                                        if (value === 'targetSales') return '🎯 Target Sales (DB)';
                                        if (value === 'totalSales') return '📊 Actual Sales';
                                        if (value === 'tiktok') return '🛒 TikTok Shop';
                                        if (value === 'shopee') return '🛍️ Shopee Shop';
                                        return value;
                                    }}
                                />
                                {chartMode === "targetVsActual" ? (
                                    <>
                                        <Bar 
                                            dataKey="totalSales" 
                                            name="totalSales" 
                                            fill="#6366f1" 
                                            radius={[6, 6, 0, 0]} 
                                            maxBarSize={45} 
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="targetSales" 
                                            name="targetSales" 
                                            stroke="#10b981" 
                                            strokeWidth={3} 
                                            dot={{ r: 4, fill: "#10b981" }} 
                                            activeDot={{ r: 6 }} 
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Bar dataKey="tiktok" name="tiktok" fill="#ec4899" radius={[0, 0, 0, 0]} stackId="a" maxBarSize={45} />
                                        <Bar dataKey="shopee" name="shopee" fill="#f97316" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={45} />
                                        <Line 
                                            type="monotone" 
                                            dataKey="targetSales" 
                                            name="targetSales" 
                                            stroke="#10b981" 
                                            strokeWidth={2} 
                                            strokeDasharray="4 4"
                                            dot={{ r: 3, fill: "#10b981" }} 
                                        />
                                    </>
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default MtdCharts;
