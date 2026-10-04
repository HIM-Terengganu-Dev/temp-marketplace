"use client";

import React, { useState } from "react";
import {
    Award,
    Search,
    TrendingUp,
    Boxes,
    PackageCheck,
    Coins,
    Sparkles
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WinningSkuItem } from "@/types/events";

interface WinningSkusCardProps {
    winningSkus: WinningSkuItem[];
    totalCogs: number;
}

export default function WinningSkusCard({
    winningSkus,
    totalCogs,
}: WinningSkusCardProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredSkus = winningSkus.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
            item.sku.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q)
        );
    });

    const maxUnits = winningSkus.length > 0 ? winningSkus[0].unitsSold || 1 : 1;

    return (
        <Card className="border-border/60 bg-card/60 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Award className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span>Winning SKUs Leaderboard</span>
                                <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">
                                    Top {winningSkus.length} Performers
                                </Badge>
                            </CardTitle>
                            <p className="text-[11px] text-muted-foreground">
                                High-velocity products sold during this campaign with unit and rolled-up COGS.
                            </p>
                        </div>
                    </div>

                    {/* Search box */}
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Filter SKU or title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs bg-background/50"
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {filteredSkus.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                        {searchQuery ? "No matching SKUs found." : "No SKU order telemetry recorded for this date range."}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold text-[11px]">
                                    <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                                    <th className="py-2.5 px-4">Merchant SKU & Product</th>
                                    <th className="py-2.5 px-4 text-right">Units Sold</th>
                                    <th className="py-2.5 px-4 text-right">Orders</th>
                                    <th className="py-2.5 px-4 text-right">Unit COGS</th>
                                    <th className="py-2.5 px-4 text-right">Total COGS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {filteredSkus.map((item, index) => {
                                    const rank = index + 1;
                                    const rankBadge =
                                        rank === 1
                                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                            : rank === 2
                                            ? "bg-slate-300/20 text-slate-300 border-slate-300/40"
                                            : rank === 3
                                            ? "bg-amber-700/20 text-amber-500 border-amber-700/40"
                                            : "bg-muted/40 text-muted-foreground border-border/40";

                                    const progressPct = Math.min(100, Math.round((item.unitsSold / maxUnits) * 100));

                                    return (
                                        <tr
                                            key={`${item.sku}-${index}`}
                                            className="hover:bg-muted/30 transition-colors group"
                                        >
                                            {/* Rank */}
                                            <td className="py-3 px-4 text-center">
                                                <span
                                                    className={`inline-flex items-center justify-center h-6 w-6 rounded-md font-mono text-[11px] font-bold border ${rankBadge}`}
                                                >
                                                    {rank}
                                                </span>
                                            </td>

                                            {/* SKU & Product Name */}
                                            <td className="py-3 px-4 max-w-xs sm:max-w-md">
                                                <div className="font-mono font-bold text-foreground text-xs group-hover:text-primary transition-colors flex items-center gap-1.5">
                                                    <span>{item.sku}</span>
                                                    {rank <= 3 && (
                                                        <Sparkles className="h-3 w-3 text-amber-400" />
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={item.name}>
                                                    {item.name}
                                                </div>
                                            </td>

                                            {/* Units Sold + mini visual bar */}
                                            <td className="py-3 px-4 text-right">
                                                <div className="font-mono font-bold text-foreground">
                                                    {item.unitsSold.toLocaleString()}
                                                </div>
                                                <div className="w-16 ml-auto mt-1 h-1 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500 rounded-full"
                                                        style={{ width: `${progressPct}%` }}
                                                    />
                                                </div>
                                            </td>

                                            {/* Orders */}
                                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                {item.orders.toLocaleString()}
                                            </td>

                                            {/* Unit COGS */}
                                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                RM {item.unitCost.toFixed(2)}
                                            </td>

                                            {/* Total COGS */}
                                            <td className="py-3 px-4 text-right font-mono font-bold text-purple-400">
                                                RM {item.totalCogs.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
