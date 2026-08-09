"use client";

import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const CHANNEL_COLORS: Record<string, string> = {
    "Livestream Commerce": "#3b82f6", // Blue
    "Short Video Ads": "#ec4899",   // Pink
    "Product Showcase": "#f97316",  // Orange
    "Creator Affiliates": "#10b981"  // Emerald
};

interface FunnelChartsProps {
    generatedData: any;
    isLoading: boolean;
    TrendIndicator: React.ComponentType<{ value: number; showSign?: boolean }>;
}

export function FunnelCharts({ generatedData, isLoading, TrendIndicator }: FunnelChartsProps) {
    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* 1. Area Trend Chart */}
            <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm md:col-span-2 flex flex-col justify-between">
                <CardHeader className="border-b border-border/30 pb-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        Omnichannel Performance Over Time
                    </CardTitle>
                    <CardDescription>Visual comparison showing ad cost spend versus gross sales GMV trends.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 flex-1 h-[260px]">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading trendlines...
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={generatedData.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#111827",
                                        borderColor: "#374151",
                                        borderRadius: "8px",
                                        color: "#fff",
                                        fontSize: "11px"
                                    }}
                                    formatter={(val: any) => `RM ${Number(val).toLocaleString()}`}
                                />
                                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                <Area type="monotone" dataKey="Revenue (GMV)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorGmv)" />
                                <Area type="monotone" dataKey="Ad Spend" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* 2. Source Attribution Share Donut */}
            <Card className="border-border/50 bg-card dark:bg-card/40 backdrop-blur-sm flex flex-col justify-between">
                <CardHeader className="border-b border-border/30 pb-4">
                    <CardTitle className="text-base font-bold text-foreground">Source Attribution Breakdown</CardTitle>
                    <CardDescription>Revenue contribution by channels.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 flex-1 flex flex-col items-center justify-center gap-6">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading attribution...
                        </div>
                    ) : (
                        <>
                            <div className="h-[150px] w-[150px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={generatedData.attributionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={4}
                                            dataKey="sales"
                                        >
                                            {generatedData.attributionData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[entry.name] || "#334155"} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#111827",
                                                borderColor: "#374151",
                                                borderRadius: "8px",
                                                color: "#fff",
                                                fontSize: "11px"
                                            }}
                                            formatter={(value: any) => `RM ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Attr. GMV</span>
                                    <span className="text-sm font-extrabold text-foreground">RM {generatedData.gmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                            </div>
                            <div className="w-full space-y-2">
                                {generatedData.attributionData.map((item: any, idx: number) => {
                                    const pct = (item.sales / generatedData.gmv) * 100;
                                    return (
                                        <div key={idx} className="flex items-center justify-between text-xs border-b border-border/10 pb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[item.name] }} />
                                                <span className="text-foreground/70 dark:text-foreground font-semibold">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-foreground/80 dark:text-foreground">{pct.toFixed(0)}%</span>
                                                <TrendIndicator value={item.trend} showSign={true} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default FunnelCharts;
