import { ShopData } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShopCardProps {
    data: ShopData;
    onClick?: () => void;
}

function TrendArrow({ pct }: { pct?: number }) {
    if (pct === undefined || pct === null) return null;
    const abs = Math.abs(pct);
    const label = `${abs.toFixed(1)}%`;

    if (pct > 0.5) {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 ml-1">
                <TrendingUp className="h-2.5 w-2.5" />
                {label}
            </span>
        );
    }
    if (pct < -0.5) {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-400 ml-1">
                <TrendingDown className="h-2.5 w-2.5" />
                {label}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground ml-1">
            <Minus className="h-2.5 w-2.5" />
            {label}
        </span>
    );
}

export function ShopCard({ data, onClick }: ShopCardProps) {
    const isConnected = data.status === 'connected';
    const isClickable = isConnected && !!onClick;

    return (
        <Card
            className={cn(
                "overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 group",
                !isConnected && "opacity-80 border-dashed bg-muted/20",
                isClickable && "cursor-pointer hover:shadow-primary/10 hover:translate-y-[-2px]"
            )}
            onClick={isClickable ? onClick : undefined}
        >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold tracking-tight mx-0 leading-none">
                        {data.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            data.platform === 'TikTok' && "bg-black dark:bg-white",
                            data.platform === 'Shopee' && "bg-orange-500",
                            data.platform === 'Meta' && "bg-blue-500"
                        )} />
                        {data.platform} • {data.type === 'shop' ? 'Shop' : 'Ad Account'}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <Badge
                        variant={isConnected ? "outline" : "secondary"}
                        className={cn(
                            "text-[10px] px-1.5 py-0.5 h-5",
                            isConnected ? "border-green-500/30 text-green-500" : "text-muted-foreground"
                        )}
                    >
                        {isConnected ? 'Active' : 'Pending'}
                    </Badge>
                    {isClickable && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                {isConnected ? (
                    <div className="space-y-4">
                        {/* 1. Sales (GMV) */}
                        <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Sales (GMV)</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">
                                    RM {data.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <TrendArrow pct={data.change?.gmv} />
                            </div>
                            {data.orders !== undefined && (
                                <p className="text-[11px] text-muted-foreground">{data.orders.toLocaleString()} orders</p>
                            )}
                        </div>

                        {/* 2. Spend */}
                        <div className="space-y-1.5 pt-3 border-t border-border/50">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Spend</span>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Before Tax</span>
                                <div className="flex items-center">
                                    <span className="font-semibold tabular-nums text-foreground">RM {data.spend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <TrendArrow pct={data.change?.spend} />
                                </div>
                            </div>
                            {data.cpasSpend !== undefined && data.cpasSpend > 0 && (
                                <div className="pl-3 border-l-2 border-slate-700/80 space-y-1 mt-1 pb-1">
                                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                        <span>Shopee CPC Ads</span>
                                        <span className="tabular-nums text-slate-300">RM {data.shopeeCpcSpend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                        <span className="text-blue-400 font-medium">Meta CPAS Ads</span>
                                        <span className="font-semibold tabular-nums text-blue-400">RM {data.cpasSpend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-xs pt-1 border-t border-border/10">
                                <span className="text-purple-400 font-medium">After Tax</span>
                                <span className="font-semibold text-purple-500 dark:text-purple-400 tabular-nums">RM {data.spendAfterTax?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>


                        {/* 3. ROAS */}
                        <div className="space-y-2 pt-3 border-t border-border/50">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Return on Ad Spend (ROAS)</span>
                            <div className="flex justify-between items-baseline">
                                <span className="text-xs text-muted-foreground">Before Tax</span>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn(
                                        "text-lg font-bold tabular-nums tracking-tight",
                                        (data.roas || 0) >= 3 ? "text-green-500" : (data.roas || 0) >= 2 ? "text-yellow-500" : "text-red-500"
                                    )}>
                                        {data.roas?.toFixed(2)}x
                                    </span>
                                    <TrendArrow pct={data.change?.roas} />
                                </div>
                            </div>
                            <div className="flex justify-between items-baseline pt-1 border-t border-border/10">
                                <span className="text-xs text-purple-400 font-medium">After Tax</span>
                                <span className={cn(
                                    "text-lg font-bold tabular-nums tracking-tight",
                                    (data.roasAfterTax || 0) >= 3 ? "text-green-500" : (data.roasAfterTax || 0) >= 2 ? "text-purple-500 dark:text-purple-400" : "text-red-500"
                                )}>
                                    {data.roasAfterTax?.toFixed(2)}x
                                </span>
                            </div>
                        </div>

                        {/* Click hint */}
                        {isClickable && (
                            <p className="text-[10px] text-muted-foreground text-center pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Click for detailed analytics
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 min-h-[120px]">
                        {data.status === 'under_development' ? (
                            <Loader2 className="h-8 w-8 text-primary animate-spin opacity-50" />
                        ) : (
                            <AlertCircle className="h-8 w-8 text-destructive opacity-50" />
                        )}
                        <p className="text-sm font-medium text-muted-foreground">
                            {data.status === 'under_development' ? 'API Integration in Progress' : 'Connection Error'}
                        </p>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Check Status
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
