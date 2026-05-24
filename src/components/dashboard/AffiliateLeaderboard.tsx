import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, Award, ShoppingBag, DollarSign, Percent, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AffiliateCreator {
    creatorUsername: string;
    creatorName: string;
    orderCount: number;
    gmv: number;
    commissionAmount: number;
}

interface AffiliateLeaderboardProps {
    creators: AffiliateCreator[];
    isLoading: boolean;
}

type SortField = 'gmv' | 'orderCount' | 'commissionAmount';
type SortOrder = 'asc' | 'desc';

export function AffiliateLeaderboard({ creators, isLoading }: AffiliateLeaderboardProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('gmv');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // Filter by search query
    const filteredCreators = creators.filter(c => 
        c.creatorUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.creatorName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort creators
    const sortedCreators = [...filteredCreators].sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    // Top 3 Spotlight Creators
    const topThree = sortedCreators.slice(0, 3);

    return (
        <Card className="border-border/40 bg-card/30 backdrop-blur-sm shadow-xl overflow-hidden transition-all duration-300">
            <CardHeader className="border-b border-border/20 bg-muted/5 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Award className="h-6 w-6 text-red-500 animate-pulse" />
                            TikTok Affiliate Creator Performance
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Real-time sales, order conversion, and commission payouts driven by your affiliate creators
                        </CardDescription>
                    </div>
                    {/* Search input */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search creators..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-border/40 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 min-h-[300px]">
                        <Loader2 className="h-10 w-10 animate-spin text-red-500" />
                        <p className="text-sm text-muted-foreground">Retrieving creator affiliate performance analytics...</p>
                    </div>
                ) : creators.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border border-dashed border-border/40 rounded-xl bg-muted/5 min-h-[300px]">
                        <div className="p-4 bg-red-500/10 rounded-full text-red-500">
                            <Award className="h-10 w-10" />
                        </div>
                        <div className="space-y-1 max-w-sm px-4">
                            <h3 className="font-semibold text-sm">No Affiliate Data Recorded</h3>
                            <p className="text-xs text-muted-foreground">
                                No creator affiliate conversions recorded in this date range. Make sure your Affiliate Seller API scopes are active and campaigns are running!
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 1. Top 3 Creators Spotlight Cards */}
                        {searchQuery === '' && sortedCreators.length > 0 && (
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                                {topThree.map((creator, index) => {
                                    const rankColor = index === 0 
                                        ? 'from-amber-400/20 to-yellow-500/5 border-amber-500/30' // Gold
                                        : index === 1 
                                        ? 'from-slate-300/20 to-slate-400/5 border-slate-400/30' // Silver
                                        : 'from-amber-700/20 to-orange-950/5 border-amber-800/30'; // Bronze

                                    const rankBadge = index === 0 ? '👑 Gold Creator' : index === 1 ? '🥈 Silver Creator' : '🥉 Bronze Creator';
                                    const rankText = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : 'text-amber-600';

                                    return (
                                        <div 
                                            key={creator.creatorUsername}
                                            className={cn(
                                                "p-4 rounded-xl border bg-gradient-to-br flex flex-col justify-between gap-3 shadow-lg hover:translate-y-[-2px] transition-all duration-300 group",
                                                rankColor
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className={cn("text-[9px] px-2 py-0 border-current bg-background/50", rankText)}>
                                                    {rankBadge}
                                                </Badge>
                                                <span className={cn("text-xs font-mono font-bold", rankText)}>#0{index + 1}</span>
                                            </div>
                                            
                                            <div className="space-y-1 mt-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("p-1.5 rounded-full bg-background/60 border border-border/40", rankText)}>
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div className="truncate">
                                                        <h4 className="font-bold text-sm text-foreground truncate group-hover:text-red-400 transition-colors">
                                                            {creator.creatorName}
                                                        </h4>
                                                        <p className="text-[10px] text-muted-foreground truncate">@{creator.creatorUsername}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/10 mt-1">
                                                <div className="space-y-0.5">
                                                    <span className="text-[9px] uppercase font-semibold text-muted-foreground block">GMV</span>
                                                    <span className="font-bold text-xs text-foreground tabular-nums">
                                                        RM {creator.gmv.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <div className="space-y-0.5 text-right">
                                                    <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Orders</span>
                                                    <span className="font-bold text-xs text-foreground tabular-nums">
                                                        {creator.orderCount} orders
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2. Full Performance Table */}
                        <div className="border border-border/30 rounded-xl overflow-hidden bg-slate-950/20">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/15 border-b border-border/30 text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                                            <th className="py-3 px-4 w-12 text-center">Rank</th>
                                            <th className="py-3 px-4">Creator / Username</th>
                                            <th 
                                                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                                                onClick={() => handleSort('orderCount')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Orders Driven
                                                    <ArrowUpDown className="h-3 w-3" />
                                                </div>
                                            </th>
                                            <th 
                                                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                                                onClick={() => handleSort('gmv')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    GMV Generated
                                                    <ArrowUpDown className="h-3 w-3" />
                                                </div>
                                            </th>
                                            <th className="py-3 px-4">Avg Order Value (AOV)</th>
                                            <th 
                                                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                                                onClick={() => handleSort('commissionAmount')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Est. Commission
                                                    <ArrowUpDown className="h-3 w-3" />
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/10 text-xs">
                                        {sortedCreators.map((creator, idx) => {
                                            const rank = idx + 1;
                                            const isTop3 = rank <= 3;
                                            const aov = creator.orderCount > 0 ? creator.gmv / creator.orderCount : 0;

                                            return (
                                                <tr 
                                                    key={creator.creatorUsername}
                                                    className="hover:bg-muted/5 transition-colors duration-200"
                                                >
                                                    <td className="py-3 px-4 text-center">
                                                        {isTop3 ? (
                                                            <span className={cn(
                                                                "inline-flex items-center justify-center h-5 w-5 rounded-full font-bold text-[10px] border",
                                                                rank === 1 ? "bg-amber-400/10 text-amber-400 border-amber-500/20" :
                                                                rank === 2 ? "bg-slate-300/10 text-slate-300 border-slate-400/20" :
                                                                "bg-amber-700/10 text-amber-600 border-amber-800/20"
                                                            )}>
                                                                {rank}
                                                            </span>
                                                        ) : (
                                                            <span className="font-mono text-muted-foreground">{rank}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-foreground">{creator.creatorName}</div>
                                                        <div className="text-[10px] text-muted-foreground">@{creator.creatorUsername}</div>
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold tabular-nums text-foreground">
                                                        {creator.orderCount.toLocaleString()} orders
                                                    </td>
                                                    <td className="py-3 px-4 font-bold tabular-nums text-foreground">
                                                        RM {creator.gmv.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold tabular-nums text-muted-foreground">
                                                        RM {aov.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-3 px-4 font-bold tabular-nums text-emerald-400">
                                                        RM {creator.commissionAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
