"use client";

import { useEffect, useState, useMemo } from "react";
import { X, ExternalLink, Play, ShoppingBag, Search, RefreshCw, Layers, TrendingUp, Eye, MousePointer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CreativeItem } from "@/app/api/tiktok/gmv-max/creatives/route";

interface ProductCreativesModalProps {
    campaignId: string;
    campaignName: string;
    shopNumber: string;
    startDate: string;
    endDate: string;
    onClose: () => void;
}

interface ApiResponse {
    shopName: string;
    campaignId: string;
    dateRange: { start: string; end: string };
    summary: {
        totalCost: number;
        totalOrders: number;
        totalGrossRevenue: number;
        roi: number;
        totalImpressions: number;
        totalClicks: number;
        creativeCount: number;
    };
    creatives: CreativeItem[];
    error?: string;
}

export function ProductCreativesModal({
    campaignId,
    campaignName,
    shopNumber,
    startDate,
    endDate,
    onClose
}: ProductCreativesModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ApiResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "VIDEO" | "CATALOG">("ALL");

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/tiktok/gmv-max/creatives?startDate=${startDate}&endDate=${endDate}&campaignId=${campaignId}&shopNumber=${shopNumber}`
            );
            const json: ApiResponse = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error || "Failed to fetch creative details");
            }
            setData(json);
        } catch (err: any) {
            setError(err.message || "Network error loading creative data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [campaignId, shopNumber, startDate, endDate]);

    const filteredCreatives = useMemo(() => {
        if (!data?.creatives) return [];
        return data.creatives.filter((c) => {
            const matchesSearch = c.itemId.toLowerCase().includes(searchQuery.trim().toLowerCase());
            const matchesType =
                typeFilter === "ALL" ||
                (typeFilter === "VIDEO" && !c.isCatalog) ||
                (typeFilter === "CATALOG" && c.isCatalog);
            return matchesSearch && matchesType;
        });
    }, [data?.creatives, searchQuery, typeFilter]);

    const fmtRM = (val: number) =>
        `RM ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Dialog */}
            <div className="relative w-full max-w-5xl bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border/50 bg-muted/20">
                    <div className="space-y-1 max-w-[80%]">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xl">🛍️</span>
                            <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight line-clamp-1">
                                {campaignName}
                            </h3>
                            <Badge className="bg-pink-500/15 text-pink-400 border-pink-500/30 text-[10px] px-2 py-0.5 font-semibold">
                                Product GMV Max Creatives
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                            <span>ID: {campaignId}</span>
                            <span>•</span>
                            <span>{startDate} → {endDate}</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {/* Summary KPI Cards */}
                    {data?.summary && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                            <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-1">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                    Ad Spend
                                </span>
                                <span className="text-sm sm:text-base font-bold text-foreground font-mono">
                                    {fmtRM(data.summary.totalCost)}
                                </span>
                            </div>
                            <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-1">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                    Gross Revenue
                                </span>
                                <span className="text-sm sm:text-base font-bold text-blue-400 font-mono">
                                    {fmtRM(data.summary.totalGrossRevenue)}
                                </span>
                            </div>
                            <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-1">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                    SKU Orders
                                </span>
                                <span className="text-sm sm:text-base font-bold text-foreground font-mono">
                                    {data.summary.totalOrders}
                                </span>
                            </div>
                            <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-1">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                    ROAS
                                </span>
                                <span className="text-sm sm:text-base font-extrabold text-emerald-400 font-mono">
                                    {data.summary.roi.toFixed(2)}x
                                </span>
                            </div>
                            <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-1">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                    Impressions
                                </span>
                                <span className="text-sm sm:text-base font-bold text-foreground font-mono">
                                    {data.summary.totalImpressions.toLocaleString()}
                                </span>
                            </div>
                            <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-1">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                    Clicks (CTR)
                                </span>
                                <span className="text-sm sm:text-base font-bold text-foreground font-mono">
                                    {data.summary.totalClicks.toLocaleString()}{" "}
                                    <span className="text-xs text-muted-foreground font-normal">
                                        ({data.summary.totalImpressions > 0
                                            ? ((data.summary.totalClicks / data.summary.totalImpressions) * 100).toFixed(1)
                                            : 0}%)
                                    </span>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by Post ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs bg-muted/20 border-border/60"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                            <Button
                                variant={typeFilter === "ALL" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTypeFilter("ALL")}
                                className="h-8 text-xs font-semibold"
                            >
                                All ({data?.creatives?.length || 0})
                            </Button>
                            <Button
                                variant={typeFilter === "VIDEO" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTypeFilter("VIDEO")}
                                className="h-8 text-xs font-semibold"
                            >
                                🎬 Video Posts
                            </Button>
                            <Button
                                variant={typeFilter === "CATALOG" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTypeFilter("CATALOG")}
                                className="h-8 text-xs font-semibold"
                            >
                                🛍️ Product Cards
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={fetchData}
                                disabled={loading}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Refresh"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {/* Table Area */}
                    {loading ? (
                        <div className="py-16 text-center space-y-3">
                            <RefreshCw className="h-7 w-7 animate-spin mx-auto text-pink-500/80" />
                            <p className="text-xs text-muted-foreground">
                                Querying TikTok Marketing API for creative performance...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="py-12 px-4 border border-destructive/30 rounded-xl bg-destructive/10 text-center space-y-2">
                            <p className="text-xs font-bold text-destructive">Failed to load creative analytics</p>
                            <p className="text-xs text-muted-foreground">{error}</p>
                            <Button variant="outline" size="sm" onClick={fetchData} className="h-8 text-xs mt-2">
                                Retry
                            </Button>
                        </div>
                    ) : filteredCreatives.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-border/60 rounded-xl space-y-2">
                            <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                            <p className="text-xs font-semibold text-foreground">No matching creatives found</p>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                {searchQuery ? "No creatives match your search query." : "No creative spend or delivery recorded in this period."}
                            </p>
                        </div>
                    ) : (
                        <div className="border border-border/60 rounded-xl overflow-hidden bg-card/60 shadow-sm">
                            <div className="overflow-x-auto max-h-[50vh] scrollbar-thin">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-muted/40 sticky top-0 z-10 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider backdrop-blur-md">
                                        <tr>
                                            <th className="py-2.5 px-3">Post ID / Creative</th>
                                            <th className="py-2.5 px-3">Type</th>
                                            <th className="py-2.5 px-3 text-right">Cost (Spend)</th>
                                            <th className="py-2.5 px-3 text-right">Orders</th>
                                            <th className="py-2.5 px-3 text-right">Revenue</th>
                                            <th className="py-2.5 px-3 text-right">ROAS</th>
                                            <th className="py-2.5 px-3 text-right">CPO</th>
                                            <th className="py-2.5 px-3 text-right">Impressions</th>
                                            <th className="py-2.5 px-3 text-right">Clicks</th>
                                            <th className="py-2.5 px-3 text-right">CTR</th>
                                            <th className="py-2.5 px-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30 font-mono">
                                        {filteredCreatives.map((c) => {
                                            const roiColor =
                                                c.roi >= 3
                                                    ? "text-emerald-400 font-bold"
                                                    : c.roi >= 1
                                                    ? "text-blue-400 font-semibold"
                                                    : c.roi > 0
                                                    ? "text-amber-400"
                                                    : "text-muted-foreground";

                                            return (
                                                <tr key={c.itemId} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">
                                                        {c.isCatalog ? (
                                                            <div className="flex items-center gap-1.5 text-blue-400">
                                                                <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                                                                <span className="font-sans font-semibold text-xs">
                                                                    Product Catalog Cards
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[11px] font-mono select-all">
                                                                    {c.itemId}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                        {c.isCatalog ? (
                                                            <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] px-1.5 py-0 font-sans">
                                                                Catalog Cards
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-pink-500/15 text-pink-400 border-pink-500/30 text-[9px] px-1.5 py-0 font-sans">
                                                                Video Post
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                                        {fmtRM(c.cost)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-foreground font-semibold">
                                                        {c.orders}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-blue-400 font-semibold">
                                                        {fmtRM(c.grossRevenue)}
                                                    </td>
                                                    <td className={cn("py-2.5 px-3 text-right", roiColor)}>
                                                        {c.roi > 0 ? `${c.roi.toFixed(2)}x` : "-"}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                                                        {c.costPerOrder > 0 ? fmtRM(c.costPerOrder) : "-"}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                                                        {c.impressions.toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                                                        {c.clicks.toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                                                        {c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : "-"}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        {c.videoUrl ? (
                                                            <a
                                                                href={c.videoUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-[10px] font-sans px-2 py-1 rounded bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border border-pink-500/20 transition-all"
                                                            >
                                                                <Play className="h-2.5 w-2.5 fill-pink-400" />
                                                                Watch
                                                                <ExternalLink className="h-2.5 w-2.5" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-[10px] font-sans text-muted-foreground/60 italic">
                                                                Catalog
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-2.5 border-t border-border/40 bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between">
                                <span>Showing {filteredCreatives.length} active creative assets</span>
                                <span className="italic text-[10px]">Data synced directly from TikTok Marketing API</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
