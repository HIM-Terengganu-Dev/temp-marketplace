"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { SimpleDatePicker, DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { ShopCard } from "@/components/dashboard/ShopCard";
import { Badge } from "@/components/ui/badge";
import { Store, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

/** Computes the previous period date range of equal duration */
function getPreviousPeriod(startStr: string, endStr: string) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - diffDays);
    const prevEnd = new Date(start);
    prevEnd.setDate(start.getDate() - 1);

    return {
        start: prevStart.toISOString().split('T')[0],
        end: prevEnd.toISOString().split('T')[0]
    };
}

export default function TikTokShopsPage() {
    const { data: session } = useSession();
    // Default to Today
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [activePreset, setActivePreset] = useState<DatePreset>("today");

    const [shopData, setShopData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = async () => {
        if (!startDate || !endDate) return;

        setIsLoading(true);
        const prevRange = getPreviousPeriod(startDate, endDate);

        try {
            const shopIndices = (session?.user as any)?.allowed_tiktok_shops || [1, 2, 3, 4];
            const results = await Promise.all(shopIndices.map(async (num: number) => {
                try {
                    const [res, prevRes] = await Promise.all([
                        fetch(`/api/tiktok/shop-metrics?startDate=${startDate}&endDate=${endDate}&shopNumber=${num}`),
                        fetch(`/api/tiktok/shop-metrics?startDate=${prevRange.start}&endDate=${prevRange.end}&shopNumber=${num}`)
                    ]);

                    if (!res.ok) return null;

                    const data = await res.json();
                    const prevData = prevRes.ok ? await prevRes.json() : null;

                    const gmv = data.gmv || 0;
                    const prevGmv = prevData ? (prevData.gmv || 0) : 0;
                    const gmvChange = prevGmv > 0 ? ((gmv - prevGmv) / prevGmv) * 100 : 0;

                    const spend = data.totalAdsSpend || 0;
                    const prevSpend = prevData ? (prevData.totalAdsSpend || 0) : 0;
                    const spendChange = prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : 0;

                    const roas = data.roasBeforeTax || 0;
                    const prevRoas = prevData ? (prevData.roasBeforeTax || 0) : 0;
                    const roasChange = prevRoas > 0 ? ((roas - prevRoas) / prevRoas) * 100 : 0;

                    return {
                        id: `tts_${num}`,
                        name: data.shopName || `Shop ${num}`,
                        platform: 'TikTok',
                        type: 'shop',
                        gmv,
                        revenue: gmv,
                        orders: data.orderCount || 0,
                        spend,
                        roas,
                        status: 'connected',
                        change: {
                            gmv: gmvChange,
                            spend: spendChange,
                            roas: roasChange
                        }
                    };
                } catch (e) {
                    console.error(`Error fetching shop ${num}:`, e);
                    return null;
                }
            }));

            setShopData(results.filter(r => r !== null));
        } catch (error) {
            console.error("Error fetching shop data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshAll = () => {
        fetchData();
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, session]);

    return (
        <div className="space-y-4 md:space-y-6">
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
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRefreshAll} 
                        disabled={isLoading}
                        className="h-9 gap-2 text-xs font-semibold"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
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

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                {shopData.map((shop) => (
                    <ShopCard key={shop.id} data={shop} />
                ))}
            </div>

            {shopData.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-xl border border-dashed border-border">
                    <p className="text-muted-foreground">No shops connected yet.</p>
                </div>
            )}


        </div>
    );
}

// Helper for class names
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
