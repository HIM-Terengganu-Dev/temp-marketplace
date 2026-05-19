import { ShopData } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShopCardProps {
    data: ShopData;
}

export function ShopCard({ data }: ShopCardProps) {
    const isConnected = data.status === 'connected';

    return (
        <Card className={cn(
            "overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 group",
            !isConnected && "opacity-80 border-dashed bg-muted/20"
        )}>
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
                <Badge
                    variant={isConnected ? "outline" : "secondary"}
                    className={cn(
                        "text-[10px] px-1.5 py-0.5 h-5",
                        isConnected ? "border-green-500/30 text-green-500" : "text-muted-foreground"
                    )}
                >
                    {isConnected ? 'Active' : 'Pending'}
                </Badge>
            </CardHeader>

            <CardContent className="pt-4">
                {isConnected ? (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-xs text-muted-foreground font-semibold">ROAS (Before Tax)</span>
                                <span className={cn(
                                    "text-xl font-bold tabular-nums tracking-tight",
                                    (data.roas || 0) >= 3 ? "text-green-500" : (data.roas || 0) >= 2 ? "text-yellow-500" : "text-red-500"
                                )}>
                                    {data.roas?.toFixed(2)}x
                                </span>
                            </div>
                            <div className="flex justify-between items-baseline pt-1 border-t border-border/10">
                                <span className="text-xs text-purple-400 font-semibold">ROAS (After Tax)</span>
                                <span className={cn(
                                    "text-xl font-bold tabular-nums tracking-tight",
                                    (data.roasAfterTax || 0) >= 3 ? "text-green-500" : (data.roasAfterTax || 0) >= 2 ? "text-yellow-500" : "text-red-500"
                                )}>
                                    {data.roasAfterTax?.toFixed(2)}x
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/50">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Spend (Before Tax)</span>
                                <span className="font-semibold tabular-nums">RM {data.spend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-purple-400 font-medium">Spend (After Tax)</span>
                                <span className="font-semibold text-purple-500 dark:text-purple-400 tabular-nums">RM {data.spendAfterTax?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs pt-1 border-t border-border/30">
                                <span className="text-muted-foreground">GMV</span>
                                <span className="font-semibold tabular-nums">RM {data.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
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
