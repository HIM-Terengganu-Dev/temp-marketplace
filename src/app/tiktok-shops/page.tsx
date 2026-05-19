"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { SimpleDatePicker } from "@/components/dashboard/SimpleDatePicker";
import { ShopCard } from "@/components/dashboard/ShopCard";
import { Badge } from "@/components/ui/badge";
import { Store, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export default function TikTokShopsPage() {
    const { data: session } = useSession();
    // Default to Today
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

    const [shopData, setShopData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = async () => {
        if (!startDate || !endDate) return;

        setIsLoading(true);
        try {
            const shopIndices = (session?.user as any)?.allowed_tiktok_shops || [1, 2, 3, 4];
            const results = await Promise.all(shopIndices.map(async (num: number) => {
                try {
                    const [gmvRes, roasRes] = await Promise.all([
                        fetch(`/api/tiktok/gmv?startDate=${startDate}&endDate=${endDate}&shopNumber=${num}`),
                        fetch(`/api/tiktok/roas?startDate=${startDate}&endDate=${endDate}&shopNumber=${num}`)
                    ]);

                    if (!gmvRes.ok || !roasRes.ok) return null;

                    const gmvData = await gmvRes.json();
                    const roasData = await roasRes.json();

                    return {
                        id: `tts_${num}`,
                        name: gmvData.shopName || `Shop ${num}`,
                        platform: 'TikTok',
                        type: 'shop',
                        gmv: gmvData.gmv || 0,
                        revenue: gmvData.gmv || 0,
                        orders: gmvData.orderCount || 0,
                        spend: roasData.totalAdsSpend || 0,
                        roas: roasData.roas || 0,
                        status: 'connected'
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

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, session]);

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">TikTok Shops</h1>
                        <p className="text-sm text-muted-foreground">Manage and track your connected TikTok Seller accounts</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchData} 
                        disabled={isLoading}
                        className="h-9 gap-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Refresh
                    </Button>
                    <SimpleDatePicker
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                    />
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
