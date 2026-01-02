"use client";

import { useState, useEffect } from "react";
import { MOCK_DATA } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShopCard } from "@/components/dashboard/ShopCard";
import { SimpleDatePicker } from "@/components/dashboard/SimpleDatePicker";

export default function Home() {
    // Default to Dec 25, 2025 as requested for initial verification
    const [startDate, setStartDate] = useState("2025-12-25");
    const [endDate, setEndDate] = useState("2025-12-25");

    const [shopData, setShopData] = useState(MOCK_DATA);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setIsLoading(true);
            try {
                // Determine shops to fetch (currently only shop1 has API)
                // In future, loop through connected shops
                const shopIdToUpdate = 'tts_1';

                // Fetch directly with the string values (YYYY-MM-DD)
                // No timezone conversion needed as inputs align with API requirement
                const response = await fetch(`/api/tiktok/gmv?startDate=${startDate}&endDate=${endDate}`);
                if (!response.ok) throw new Error('Failed to fetch');

                const result = await response.json();

                // Update local state by merging API result
                setShopData(prevData => prevData.map(shop => {
                    if (shop.id === shopIdToUpdate) {
                        return {
                            ...shop,
                            gmv: result.gmv,
                            revenue: result.gmv, // using GMV as Revenue for now
                            orders: result.orderCount,
                            status: 'connected',
                            spend: shop.spend
                        };
                    }
                    return shop;
                }));
            } catch (error) {
                console.error("Error fetching shop data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate]);

    // Calculate Totals based on current (potentially fetched) state
    const totalRevenue = shopData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
    const totalSpend = shopData.reduce((acc, curr) => acc + (curr.spend || 0), 0);
    const totalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

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
                            Total RoaS (Return on Ad Spend)
                        </CardTitle>
                        <Badge variant="outline" className="border-primary/50 text-primary">
                            {isLoading ? 'Updating...' : 'Live'}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-foreground tracking-tight">
                            {totalRoas.toFixed(2)}x
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Calculated dynamically
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
                    <CardContent>
                        <div className="text-2xl font-bold">RM {totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
