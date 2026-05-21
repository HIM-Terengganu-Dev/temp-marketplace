"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimpleDatePicker } from "@/components/dashboard/SimpleDatePicker";
import { useSession } from "next-auth/react";
import { GMVLineChart, ImpressionsPieChart } from "@/components/dashboard/Charts";

export default function BODDashboard() {
    const { data: session } = useSession();
    // Default to last 7 days
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setIsLoading(true);
            try {
                const res = await fetch(`/api/tiktok/bod-metrics?startDate=${startDate}&endDate=${endDate}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json.aggregated);
                }
            } catch (error) {
                console.error("Error fetching BOD metrics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate]);

    if (!data && isLoading) {
        return <div className="flex h-[50vh] items-center justify-center text-muted-foreground animate-pulse">Loading Dashboard...</div>;
    }

    const gmv = data?.gmv || 0;
    const adsCost = data?.adsSpend || 0;
    
    // User requested formula: COGS = 28% of GMV, Platform Cost = 25% of GMV
    const cogs = gmv * 0.28;
    const platformCost = gmv * 0.25;
    
    // Gross Profit = Revenue(GMV) - COGS - Platform Cost - Ads Cost
    const grossProfit = gmv - cogs - platformCost - adsCost;
    const profitMargin = gmv > 0 ? (grossProfit / gmv) * 100 : 0;

    const visitors = data?.visitors || 0;
    const impressions = data?.impressions || 0;
    
    // Pie chart data
    const pieData = data ? [
        { name: 'LIVE', value: data.impressionBreakdowns.LIVE },
        { name: 'VIDEO', value: data.impressionBreakdowns.VIDEO },
        { name: 'PRODUCT CARD', value: data.impressionBreakdowns.PRODUCT_CARD }
    ].filter(item => item.value > 0) : [];

    // Mock chart historical data (ideally this comes from an endpoint split by day)
    // For now we will mock a static trend based on the total.
    const mockLineData = [
        { date: startDate, gmv: gmv * 0.3, cost: (cogs + platformCost + adsCost) * 0.3 },
        { date: 'Mid', gmv: gmv * 0.4, cost: (cogs + platformCost + adsCost) * 0.4 },
        { date: endDate, gmv: gmv * 0.3, cost: (cogs + platformCost + adsCost) * 0.3 },
    ];

    return (
        <div className="space-y-6 bg-[#0a0a0a] min-h-screen text-slate-100 p-2 md:p-6 rounded-xl border border-white/10">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">BOD Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Executive summary across all stores | {startDate} - {endDate}</p>
                </div>
                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/10">
                    <SimpleDatePicker
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                    />
                </div>
            </div>

            {/* Top KPI Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-black/60 border-white/10 backdrop-blur-md hover:border-blue-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Gross Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            RM {grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Margin: {profitMargin.toFixed(2)}%</p>
                    </CardContent>
                </Card>

                <Card className="bg-black/60 border-white/10 backdrop-blur-md hover:border-blue-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Total GMV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-400">
                            RM {gmv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Total Revenue</p>
                    </CardContent>
                </Card>

                <Card className="bg-black/60 border-white/10 backdrop-blur-md hover:border-blue-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Visitors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-400">
                            {visitors.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Avg Product Page Visitors</p>
                    </CardContent>
                </Card>

                <Card className="bg-black/60 border-white/10 backdrop-blur-md hover:border-blue-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Impressions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-pink-400">
                            {impressions.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Total Product Impressions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Cost Row */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">COGS (28%)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-orange-400">
                            RM {cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Platform Cost (25%)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-orange-400">
                            RM {platformCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Ads Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-orange-400">
                            RM {adsCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2 bg-black/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg">Cost and Gross Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GMVLineChart data={mockLineData} />
                    </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg">Impressions Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pieData.length > 0 ? (
                            <ImpressionsPieChart data={pieData} />
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                                No impression data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
