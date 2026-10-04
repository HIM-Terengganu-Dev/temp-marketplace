"use client";

import React from "react";
import {
    Megaphone,
    Radio,
    Share2,
    Layers,
    DollarSign,
    ShoppingBag,
    TrendingUp,
    Clock,
    Eye
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventAnalysisMetrics } from "@/types/events";

interface DepartmentTelemetryCardProps {
    metrics: EventAnalysisMetrics;
}

export default function DepartmentTelemetryCard({
    metrics,
}: DepartmentTelemetryCardProps) {
    const { departmentBreakdown, platformBreakdown } = metrics;
    const mkt = departmentBreakdown.marketing;
    const live = departmentBreakdown.livehost;
    const aff = departmentBreakdown.affiliate;
    const store = departmentBreakdown.storeOrders;

    const formatRM = (val: number) =>
        `RM ${val.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Marketing Telemetry */}
            <Card className="border-border/60 bg-card/60 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                <Megaphone className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm">Marketing Creators</span>
                        </div>
                        <Badge
                            variant="outline"
                            className={`text-[9px] ${
                                mkt.enabled
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {mkt.enabled ? "Active" : "Excluded"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Internal Creator GMV</span>
                        <div className="text-xl font-extrabold font-mono text-foreground">
                            {formatRM(mkt.gmv)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                        <div>
                            <span className="text-muted-foreground block text-[10px]">Tracked Videos</span>
                            <span className="font-bold font-mono">{mkt.videos.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-[10px]">Direct Items Sold</span>
                            <span className="font-bold font-mono">{mkt.itemsSold.toLocaleString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Live Host Telemetry */}
            <Card className="border-border/60 bg-card/60 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                                <Radio className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm">Live Host Department</span>
                        </div>
                        <Badge
                            variant="outline"
                            className={`text-[9px] ${
                                live.enabled
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {live.enabled ? "Active" : "Excluded"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Direct Livestream GMV</span>
                        <div className="text-xl font-extrabold font-mono text-foreground">
                            {formatRM(live.gmv)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                        <div>
                            <span className="text-muted-foreground block text-[10px]">Broadcast Hours</span>
                            <span className="font-bold font-mono">{live.hours}h</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-[10px]">SKU Orders</span>
                            <span className="font-bold font-mono">{live.orders.toLocaleString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Affiliate Telemetry */}
            <Card className="border-border/60 bg-card/60 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                                <Share2 className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm">Affiliate Network</span>
                        </div>
                        <Badge
                            variant="outline"
                            className={`text-[9px] ${
                                aff.enabled
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {aff.enabled ? "Active" : "Excluded"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">External Affiliate GMV</span>
                        <div className="text-xl font-extrabold font-mono text-foreground">
                            {formatRM(aff.gmv)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                        <div>
                            <span className="text-muted-foreground block text-[10px]">Affiliate Orders</span>
                            <span className="font-bold font-mono">{aff.orders.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-[10px]">Items Sold</span>
                            <span className="font-bold font-mono">{aff.itemsSold.toLocaleString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Marketplace Channel Split */}
            <Card className="border-border/60 bg-card/60 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
                                <Layers className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm">Platform Distribution</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                            Omnichannel
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                    <div className="space-y-2">
                        {/* TikTok */}
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-purple-500" />
                                <span className="font-semibold text-foreground">TikTok Shop:</span>
                            </div>
                            <div className="text-right font-mono">
                                <span className="font-bold">{formatRM(platformBreakdown.tiktok.gmv)}</span>
                                <span className="text-[10px] text-muted-foreground block">
                                    Spend: {formatRM(platformBreakdown.tiktok.spend)}
                                </span>
                            </div>
                        </div>

                        {/* Shopee */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <span className="font-semibold text-foreground">Shopee:</span>
                            </div>
                            <div className="text-right font-mono">
                                <span className="font-bold">{formatRM(platformBreakdown.shopee.gmv)}</span>
                                <span className="text-[10px] text-muted-foreground block">
                                    Spend: {formatRM(platformBreakdown.shopee.spend)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
