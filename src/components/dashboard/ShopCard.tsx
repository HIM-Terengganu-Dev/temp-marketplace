import { ShopData } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SyncIndicator } from "./SyncIndicator";

interface ShopCardProps {
    data: ShopData;
    onClick?: () => void;
    isLoading?: boolean;
}

function TrendArrow({ pct }: { pct?: number }) {
    if (pct === undefined || pct === null) return null;
    const abs = Math.abs(pct).toFixed(1);
    if (pct > 0.5)
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-1 tabular-nums">
                <TrendingUp className="h-2.5 w-2.5" />{abs}%
            </span>
        );
    if (pct < -0.5)
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-650 dark:text-red-400 ml-1 tabular-nums">
                <TrendingDown className="h-2.5 w-2.5" />{abs}%
            </span>
        );
    return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 dark:text-muted-foreground ml-1 tabular-nums">
            <Minus className="h-2.5 w-2.5" />{abs}%
        </span>
    );
}

const PLATFORM_CONFIG: Record<string, {
    dot: string;
    topGradient: string;
    badgeClass: string;
    activeGlow: string;
}> = {
    TikTok: {
        dot:         "bg-slate-950 dark:bg-white",
        topGradient: "from-purple-600/30 via-pink-500/10 to-transparent",
        badgeClass:  "border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-500/10",
        activeGlow:  "hover:shadow-purple-500/10",
    },
    Shopee: {
        dot:         "bg-orange-500",
        topGradient: "from-orange-500/20 via-amber-500/10 to-transparent",
        badgeClass:  "border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-500/10",
        activeGlow:  "hover:shadow-orange-500/10",
    },
    Meta: {
        dot:         "bg-blue-500",
        topGradient: "from-blue-500/20 via-sky-500/10 to-transparent",
        badgeClass:  "border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10",
        activeGlow:  "hover:shadow-blue-500/10",
    },
};

export function ShopCard({ data, onClick, isLoading = false }: ShopCardProps) {
    const isConnected = data.status === "connected";
    const isClickable = isConnected && !!onClick;
    const platform = data.platform || "TikTok";
    const cfg = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.TikTok;

    return (
        <Card
            className={cn(
                "overflow-hidden transition-all duration-250 ease-in-out group relative",
                "border-slate-200 dark:border-border/40 bg-card dark:bg-card/60 backdrop-blur-sm",
                isClickable && [
                    "cursor-pointer",
                    "hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 dark:hover:border-border/70",
                    cfg.activeGlow,
                ],
                !isConnected && "opacity-75 border-dashed bg-muted/10",
            )}
            onClick={isClickable ? onClick : undefined}
        >
            {/* Platform top gradient accent bar */}
            <div className={cn(
                "absolute inset-x-0 top-0 h-16 bg-gradient-to-b pointer-events-none",
                cfg.topGradient
            )} />

            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-4 px-4 relative">
                <div className="space-y-1 min-w-0 flex-1 pr-2">
                    <CardTitle className="text-sm font-bold tracking-tight leading-tight truncate">
                        {data.name}
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                        <span className="truncate">{platform} · {data.type === "shop" ? "Shop" : "Ad Account"}</span>
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1">
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[9px] px-1.5 py-0.5 h-5 font-semibold",
                                isConnected
                                    ? "border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/8"
                                    : "text-muted-foreground border-slate-200 dark:border-border/50"
                            )}
                        >
                            {isConnected ? "Active" : "Pending"}
                        </Badge>
                        {isClickable && (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                        )}
                    </div>
                    {isConnected && (
                        <SyncIndicator isLoading={isLoading} dataSource={data.dataSource} />
                    )}
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-2 relative">
                {isConnected ? (
                    <div className="space-y-3">
                        {/* GMV */}
                        <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
                                Sales (GMV)
                            </span>
                            <div className="flex items-baseline gap-1 flex-wrap">
                                <span className="text-xl font-extrabold tabular-nums tracking-tight text-foreground">
                                    RM {data.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <TrendArrow pct={data.change?.gmv} />
                            </div>
                            {data.orders !== undefined && (
                                <p className="text-[10px] text-muted-foreground">
                                    {data.orders.toLocaleString()} orders
                                </p>
                            )}
                        </div>

                        {/* Ad Spend */}
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-border/30">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-widest block">
                                Ad Spend
                            </span>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 dark:text-muted-foreground">Before Tax</span>
                                <div className="flex items-center">
                                    <span className="font-semibold tabular-nums text-slate-900 dark:text-foreground text-sm">
                                        RM {data.spend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <TrendArrow pct={data.change?.spend} />
                                </div>
                            </div>

                            {/* Shopee sub-breakdown */}
                            {data.cpasSpend !== undefined && data.cpasSpend > 0 && (
                                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700/50 space-y-1 py-1">
                                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-muted-foreground">
                                        <span>Shopee CPC</span>
                                        <span className="tabular-nums font-medium">
                                            RM {data.shopeeCpcSpend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-blue-600 dark:text-blue-400 font-medium font-semibold">Meta CPAS</span>
                                        <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                                            RM {data.cpasSpend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 dark:border-border/20">
                                <span className="text-purple-600 dark:text-purple-400 font-medium text-[10px]">After Tax (SST+WHT)</span>
                                <span className="font-semibold text-purple-700 dark:text-purple-400 tabular-nums text-sm">
                                    RM {data.spendAfterTax?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* ROAS */}
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-border/30">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-widest block">
                                ROAS
                            </span>
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] text-slate-500 dark:text-muted-foreground">Before Tax</span>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn(
                                        "text-lg font-extrabold tabular-nums tracking-tight",
                                        (data.roas || 0) >= 3 ? "text-emerald-600 dark:text-emerald-400"
                                            : (data.roas || 0) >= 2 ? "text-amber-600 dark:text-yellow-400"
                                            : "text-red-650 dark:text-red-400"
                                    )}>
                                        {(data.roas ?? 0).toFixed(2)}x
                                    </span>
                                    <TrendArrow pct={data.change?.roas} />
                                </div>
                            </div>
                            <div className="flex justify-between items-baseline border-t border-slate-100 dark:border-border/20 pt-1">
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">After Tax</span>
                                <span className={cn(
                                    "text-lg font-extrabold tabular-nums tracking-tight",
                                    (data.roasAfterTax || 0) >= 3 ? "text-emerald-600 dark:text-emerald-400"
                                        : (data.roasAfterTax || 0) >= 2 ? "text-purple-600 dark:text-purple-400"
                                        : "text-red-650 dark:text-red-400"
                                )}>
                                    {(data.roasAfterTax ?? 0).toFixed(2)}x
                                </span>
                            </div>
                        </div>

                        {/* Click hint */}
                        {isClickable && (
                            <p className="text-[9px] text-muted-foreground text-center pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Tap for detailed analytics →
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 min-h-[120px]">
                        {data.status === "under_development" ? (
                            <Loader2 className="h-7 w-7 text-primary animate-spin opacity-60" />
                        ) : (
                            <AlertCircle className="h-7 w-7 text-destructive opacity-60" />
                        )}
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground">
                                {data.status === "under_development" ? "Integration in Progress" : "Connection Error"}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                {data.status === "under_development" ? "API setup underway" : "Check credentials"}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
