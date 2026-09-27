"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface MtdChartsProps {
    monthlyTrend: any[];
    dayRangeEnd: number;
}

export function MtdCharts({ monthlyTrend, dayRangeEnd }: MtdChartsProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Flatten nested tiktok.sales and shopee.sales for 100% reliable Recharts rendering
    const chartData = useMemo(() => {
        if (!Array.isArray(monthlyTrend)) return [];
        return monthlyTrend.map((item: any) => ({
            monthLabel: item.monthLabel || item.label || '',
            tiktok: Number(item.tiktok?.sales || item.tiktokSales || 0),
            shopee: Number(item.shopee?.sales || item.shopeeSales || 0),
            totalSales: Number(item.totalSales || 0)
        }));
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
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-foreground">Sales Visualizer (MTD Trend)</CardTitle>
                        <CardDescription>Cumulative stacked platform GMV up to Day {dayRangeEnd} across historical months.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 pb-4">
                {chartData.length === 0 ? (
                    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-xs">
                        No trend data available to visualize
                    </div>
                ) : (
                    <div className="w-full h-[280px] min-h-[280px]">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
                                    }}
                                    formatter={(val: any, name: any) => [
                                        `RM ${Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                                        name === 'tiktok' ? 'TikTok Shop' : name === 'shopee' ? 'Shopee Shop' : name
                                    ]}
                                />
                                <Legend 
                                    iconSize={10} 
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                                    formatter={(value) => value === 'tiktok' ? '🛒 TikTok Shop' : value === 'shopee' ? '🛍️ Shopee Shop' : value}
                                />
                                <Bar dataKey="tiktok" name="tiktok" fill="#ec4899" radius={[4, 4, 0, 0]} stackId="a" />
                                <Bar dataKey="shopee" name="shopee" fill="#f97316" radius={[4, 4, 0, 0]} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default MtdCharts;
