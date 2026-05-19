"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MOCK_DATA } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShopCard } from "@/components/dashboard/ShopCard";
import { SimpleDatePicker } from "@/components/dashboard/SimpleDatePicker";

export default function Home() {
    // Default to Today
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

    const [shopData, setShopData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dataSource, setDataSource] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setIsLoading(true);
            try {
                const shopIndices = [1, 2, 3, 4];
                const results = await Promise.all(shopIndices.map(async (num) => {
                    try {
                        // Single smart endpoint: serves from DB for historical dates,
                        // live TikTok API for recent dates (within 14 days).
                        const res = await fetch(
                            `/api/tiktok/shop-metrics?startDate=${startDate}&endDate=${endDate}&shopNumber=${num}`
                        );

                        if (!res.ok) return null;

                        const data = await res.json();

                        return {
                            id: `tts_${num}`,
                            name: data.shopName || `Shop ${num}`,
                            platform: 'TikTok',
                            type: 'shop',
                            gmv: data.gmv || 0,
                            revenue: data.gmv || 0,
                            orders: data.orderCount || 0,
                            spend: data.totalAdsSpend || 0,
                            spendAfterTax: data.totalCostWithTaxes || 0,
                            roas: data.roasBeforeTax || 0,
                            roasAfterTax: data.roasAfterTax || 0,
                            dataSource: data.dataSource || 'live_api',
                            status: 'connected'
                        };
                    } catch (e) {
                        console.error(`Error fetching shop ${num}:`, e);
                        return null;
                    }
                }));

                const validResults = results.filter(r => r !== null);
                setShopData(validResults);

                // Track mixed source for badge display
                const sources = [...new Set(validResults.map((r: any) => r.dataSource))];
                setDataSource(sources.join('+'));
            } catch (error) {
                console.error("Error fetching shop data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate]);

    // Calculate Totals
    const totalRevenue = shopData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
    const totalSpend = shopData.reduce((acc, curr) => acc + (curr.spend || 0), 0);
    const totalSpendAfterTax = shopData.reduce((acc, curr) => acc + (curr.spendAfterTax || 0), 0);
    const totalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalRoasAfterTax = totalSpendAfterTax > 0 ? totalRevenue / totalSpendAfterTax : 0;

    return (
        <div className="space-y-6">
            {/* Toolbar Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    {/* Maybe a breadcrumb or title here if needed, but Header covers it */}
                </div>
                <div className="flex items-center gap-2">
                    <SimpleDatePicker
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total RoaS Hero Card */}
                <Card className="col-span-2 bg-gradient-to-br from-primary/20 to-purple-900/10 border-primary/20 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-primary">
                            Return on Ad Spend (ROAS)
                        </CardTitle>
                        <Badge
                            variant="outline"
                            className={
                                isLoading
                                    ? "border-yellow-500/50 text-yellow-400"
                                    : dataSource.includes('database')
                                        ? "border-blue-500/50 text-blue-400"
                                        : "border-primary/50 text-primary"
                            }
                        >
                            {isLoading
                                ? 'Updating...'
                                : dataSource.includes('database') && !dataSource.includes('api')
                                    ? '📦 Database'
                                    : dataSource.includes('database') && dataSource.includes('api')
                                        ? '📦+🔴 Mixed'
                                        : '🔴 Live'}
                        </Badge>
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
                            Calculated dynamically including SST (8%) and Withholding Tax (8%)
                        </p>
                    </CardContent>
                </Card>

                {/* Revenue Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">RM {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across {shopData.filter(d => d.status === 'connected').length} connected sources
                        </p>
                    </CardContent>
                </Card>

                {/* Spend Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Ad Spend</CardTitle>
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
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Shop List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight ">Connected Accounts</h2>
                    <div className="flex items-center gap-2">
                        {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Fetching latest data...</span>}
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            {shopData.length} Sources
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {shopData.map((shop) => (
                        <ShopCard key={shop.id} data={shop} />
                    ))}
                </div>
            </div>
        </div>
    );
}
