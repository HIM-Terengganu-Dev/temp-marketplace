"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface MtdChartsProps {
    monthlyTrend: any[];
    dayRangeEnd: number;
}

export function MtdCharts({ monthlyTrend, dayRangeEnd }: MtdChartsProps) {
    return (
        <Card id="mtd-ringkasan-chart" className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm flex flex-col justify-between">
            <CardHeader className="border-b border-border/30 pb-4">
                <CardTitle className="text-base font-bold">Sales Visualizer (MTD)</CardTitle>
                <CardDescription>Visual comparison of total MTD sales up to Day {dayRangeEnd}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#111827",
                                borderColor: "#374151",
                                borderRadius: "8px",
                                color: "#fff",
                                fontSize: "11px"
                            }}
                            formatter={(val: any) => `RM ${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        />
                        <Bar dataKey="tiktok.sales" name="TikTok" fill="#ec4899" radius={[3, 3, 0, 0]} stackId="a" />
                        <Bar dataKey="shopee.sales" name="Shopee" fill="#f97316" radius={[3, 3, 0, 0]} stackId="a" />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default MtdCharts;
