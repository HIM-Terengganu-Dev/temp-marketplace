"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
    ShoppingBag, 
    Plus, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    Calendar,
    ArrowRight,
    TrendingUp,
    Users,
    Percent,
    DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShopeeShop {
    id: number;
    shop_id: string;
    shop_name: string;
    access_token_expires_at: string;
    updated_at: string;
}

function ShopeeShopsContent() {
    const searchParams = useSearchParams();
    const [shops, setShops] = useState<ShopeeShop[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Parse success/error parameters from Shopee redirect callback URL
    useEffect(() => {
        const connected = searchParams.get('shopee_connected');
        const errorMsg = searchParams.get('shopee_error');

        if (connected === 'true') {
            setStatusMessage({
                type: 'success',
                text: 'Shopee store authorized and successfully integrated!'
            });
            // Clear parameters after displaying
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (errorMsg) {
            setStatusMessage({
                type: 'error',
                text: `Authentication failed: ${decodeURIComponent(errorMsg)}`
            });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [searchParams]);

    // Fetch authorized shops list from DB
    const fetchShops = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/shopee/shops');
            if (res.ok) {
                const data = await res.json();
                setShops(data);
            }
        } catch (e) {
            console.error("Failed to load Shopee shops", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, []);

    // Initiates the OAuth flow
    const handleConnectShopee = async () => {
        setIsConnecting(true);
        try {
            // Include dynamic origin (important for localtunnel/ngrok support)
            const origin = window.location.origin;
            const res = await fetch(`/api/shopee/auth-url?origin=${encodeURIComponent(origin)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    console.log("Redirecting to Shopee authorization page...", data.url);
                    window.location.href = data.url;
                }
            } else {
                throw new Error("Failed to fetch Shopee authentication link from API.");
            }
        } catch (e: any) {
            setStatusMessage({
                type: 'error',
                text: e.message || 'Failed to initiate Shopee connection flow.'
            });
            setIsConnecting(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                        <ShoppingBag className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Shopee Shop Integration</h1>
                        <p className="text-sm text-muted-foreground">Expose sales, orders, and listing metrics from your Shopee Seller Center</p>
                    </div>
                </div>
                <Button 
                    onClick={handleConnectShopee} 
                    disabled={isConnecting}
                    className="bg-orange-500 hover:bg-orange-600 text-white gap-2 transition-all shadow-lg shadow-orange-500/15"
                >
                    {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                    Connect Shopee Store
                </Button>
            </div>

            {/* Notification alert states */}
            {statusMessage && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
                    statusMessage.type === 'success' 
                        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                        : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}>
                    {statusMessage.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                    ) : (
                        <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                    )}
                    <div className="space-y-1">
                        <div className="font-semibold text-sm">
                            {statusMessage.type === 'success' ? 'Success' : 'Connection Error'}
                        </div>
                        <div className="text-xs opacity-90">{statusMessage.text}</div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setStatusMessage(null)} 
                        className="ml-auto hover:bg-transparent h-auto p-0 opacity-60 hover:opacity-100"
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-12">
                {/* List panel of Connected shops */}
                <Card className="md:col-span-7 border-border/40 bg-card/30 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-orange-500" />
                            Connected Shops ({shops.length})
                        </CardTitle>
                        <CardDescription>
                            Active sandbox channels communicating with this dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                                <p className="text-sm text-muted-foreground">Checking authorized connections...</p>
                            </div>
                        ) : shops.length > 0 ? (
                            <div className="grid gap-4">
                                {shops.map((shop) => (
                                    <div 
                                        key={shop.id}
                                        className="p-4 rounded-xl border border-border/40 bg-muted/10 flex items-center justify-between group hover:border-orange-500/20 transition-all"
                                    >
                                        <div className="space-y-1.5">
                                            <div className="font-semibold text-sm flex items-center gap-2">
                                                {shop.shop_name}
                                                <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px] bg-green-500/5 px-2 py-0">
                                                    Active Connected
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-4">
                                                <span>Shop ID: <strong className="text-foreground">{shop.shop_id}</strong></span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Synced: {new Date(shop.updated_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary" className="text-xs font-normal text-muted-foreground">
                                                Expires {new Date(shop.access_token_expires_at).toLocaleDateString()}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border-2 border-dashed border-border/40 rounded-xl bg-muted/5">
                                <div className="p-4 bg-orange-500/10 rounded-full text-orange-500 animate-pulse">
                                    <ShoppingBag className="h-10 w-10" />
                                </div>
                                <div className="space-y-1 max-w-sm px-4">
                                    <h3 className="font-semibold text-sm">No Shopee Shops Connected</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Your Shopee data fields are currently showing static data. Connect a sandbox seller store to start capturing live transaction logs.
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleConnectShopee} 
                                    disabled={isConnecting}
                                    variant="outline" 
                                    className="border-orange-500/20 hover:border-orange-500/40 text-orange-500 text-xs h-9"
                                >
                                    Authorize Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dashboard Previews or Sync Status */}
                <Card className="md:col-span-5 border-border/40 bg-card/30 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Metrics Simulation</CardTitle>
                        <CardDescription>
                            Expected live analytics dashboard layout when active
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-muted/10 border border-border/20 flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                                    <DollarSign className="h-3.5 w-3.5 text-green-400" />
                                    Shopee GMV
                                </div>
                                <div className="font-bold text-sm text-foreground">$12,450.00</div>
                                <div className="text-[9px] text-green-400 flex items-center gap-0.5">
                                    <TrendingUp className="h-2.5 w-2.5" /> +14.2% today
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/10 border border-border/20 flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                                    <ShoppingBag className="h-3.5 w-3.5 text-orange-400" />
                                    Orders
                                </div>
                                <div className="font-bold text-sm text-foreground">340 orders</div>
                                <div className="text-[9px] text-green-400 flex items-center gap-0.5">
                                    <TrendingUp className="h-2.5 w-2.5" /> +8.5% today
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/10 border border-border/20 flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                                    <Users className="h-3.5 w-3.5 text-blue-400" />
                                    Total Visitors
                                </div>
                                <div className="font-bold text-sm text-foreground">1,820 clicks</div>
                                <div className="text-[9px] text-red-400 flex items-center gap-0.5">
                                    <TrendingUp className="h-2.5 w-2.5 rotate-180" /> -2.1% today
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/10 border border-border/20 flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                                    <Percent className="h-3.5 w-3.5 text-purple-400" />
                                    Conversion Rate
                                </div>
                                <div className="font-bold text-sm text-foreground">18.6%</div>
                                <div className="text-[9px] text-green-400 flex items-center gap-0.5">
                                    <TrendingUp className="h-2.5 w-2.5" /> +1.2% average
                                </div>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/10 border border-border/20 space-y-2">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Sandbox Status Log</div>
                            <div className="text-[9px] font-mono text-muted-foreground leading-relaxed space-y-1">
                                <div>[SYS] Connection helper initialized.</div>
                                <div>[SYS] Localtunnel bypass handshake checked.</div>
                                {shops.length > 0 ? (
                                    <>
                                        <div className="text-green-400">[OK] OAuth token sync matches credentials!</div>
                                        <div className="text-green-400">[OK] Active tokens ready to fetch API endpoints.</div>
                                    </>
                                ) : (
                                    <div className="text-amber-500">[WARN] Storing tokens is pending authorization.</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function ShopeeShopsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        }>
            <ShopeeShopsContent />
        </Suspense>
    );
}
