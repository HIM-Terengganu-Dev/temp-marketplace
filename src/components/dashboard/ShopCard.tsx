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
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">RoaS</span>
                            <div className="flex items-baseline gap-2">
                                <span className={cn(
                                    "text-3xl font-bold tabular-nums tracking-tight",
                                    (data.roas || 0) >= 3 ? "text-green-500" : (data.roas || 0) >= 2 ? "text-yellow-500" : "text-red-500"
                                )}>
                                    {data.roas?.toFixed(2)}x
                                </span>
                                <span className="text-xs text-green-500 flex items-center">
                                    <ArrowUpRight className="h-3 w-3 mr-0.5" /> 12%
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">Spend</p>
                                <p className="font-semibold text-sm tabular-nums">RM {data.spend?.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">GMV</p>
                                <p className="font-semibold text-sm tabular-nums">RM {data.revenue?.toLocaleString()}</p>
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
