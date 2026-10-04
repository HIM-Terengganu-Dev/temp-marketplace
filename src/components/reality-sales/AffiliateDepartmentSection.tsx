"use client";

import React, { useState } from "react";
import { Share2, Users, ShoppingBag, Video, Radio, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DepartmentKpiCard from "./DepartmentKpiCard";
import DepartmentAlert from "./DepartmentAlert";

interface TopAffiliate {
    username: string;
    platform: string;
    tier: string;
    total_gmv: number;
    video_gmv: number;
    live_gmv: number;
    items_sold: number;
    total_orders: number;
}

interface AffiliateData {
    status: string;
    hasData: boolean;
    targetAmount: number;
    totalGmv: number;
    shopeeGmv: number;
    tiktokGmv: number;
    totalItemsSold: number;
    totalOrders: number;
    attainmentRate: number;
    topAffiliates: TopAffiliate[];
    error?: string;
}

interface AffiliateDepartmentSectionProps {
    data: AffiliateData;
    month: string;
    isAdmin: boolean;
    onEditTarget: () => void;
    onRetry?: () => void;
}

export default function AffiliateDepartmentSection({
    data,
    month,
    isAdmin,
    onEditTarget,
    onRetry
}: AffiliateDepartmentSectionProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPlatform, setSelectedPlatform] = useState<"ALL" | "TIKTOK" | "SHOPEE">("ALL");

    const totalGmv = data.totalGmv || 0;
    const shopeeShare = totalGmv > 0 ? ((data.shopeeGmv || 0) / totalGmv) * 100 : 0;
    const tiktokShare = totalGmv > 0 ? ((data.tiktokGmv || 0) / totalGmv) * 100 : 0;

    const filteredAffiliates = (data.topAffiliates || [])
        .filter((a) => {
            const matchesSearch = a.username.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPlatform =
                selectedPlatform === "ALL" ||
                (selectedPlatform === "TIKTOK" && a.platform.toLowerCase().includes("tiktok")) ||
                (selectedPlatform === "SHOPEE" && a.platform.toLowerCase().includes("shopee"));
            return matchesSearch && matchesPlatform;
        });

    return (
        <div className="space-y-6">
            {/* Target & KPI Card */}
            <DepartmentKpiCard
                departmentLabel="Affiliate"
                targetAmount={data.targetAmount || 0}
                actualSales={data.totalGmv || 0}
                attainmentRate={data.attainmentRate || 0}
                isAdmin={isAdmin}
                onEditTarget={onEditTarget}
                unitLabel="External Affiliate GMV"
                sublabel="Strictly external affiliate creator records from hw-affiliate-management"
            />

            {!data.hasData && (
                <DepartmentAlert
                    title="Affiliate Notice"
                    type="warning"
                    message={`No external affiliate records found for month ${month}. Verify daily affiliate roster sync in Affiliate Management.`}
                    onRetry={onRetry}
                />
            )}

            {data.error && (
                <DepartmentAlert
                    title="Affiliate Database Error"
                    type="error"
                    message={`Failed to query Affiliate database: ${data.error}`}
                    onRetry={onRetry}
                />
            )}

            {/* Platform Comparison Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shopee External */}
                <Card className="border-border/60 hover:border-amber-500/40 transition-colors shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="p-4 pb-2 border-b border-border/40">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                                    <ShoppingBag className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-bold text-sm">Shopee Affiliate</span>
                                    <span className="text-[10px] text-muted-foreground block">External Creator Network</span>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                {shopeeShare.toFixed(1)}% Share
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        <div>
                            <div className="text-2xl font-extrabold tracking-tight text-foreground">
                                RM {(data.shopeeGmv || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                External creators promoting Shopee catalog
                            </p>
                        </div>

                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${shopeeShare}%` }} />
                        </div>
                    </CardContent>
                </Card>

                {/* TikTok Shop External */}
                <Card className="border-border/60 hover:border-cyan-500/40 transition-colors shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="p-4 pb-2 border-b border-border/40">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-500">
                                    <Video className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-bold text-sm">TikTok Shop Affiliate</span>
                                    <span className="text-[10px] text-muted-foreground block">External Creator Network</span>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-500 border-cyan-500/30">
                                {tiktokShare.toFixed(1)}% Share
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        <div>
                            <div className="text-2xl font-extrabold tracking-tight text-foreground">
                                RM {(data.tiktokGmv || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                External Open & Target Collaboration affiliates
                            </p>
                        </div>

                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${tiktokShare}%` }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top External Affiliates Table */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-primary" />
                                Top External Affiliates
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Ranked by total external affiliate sales for the selected period
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-48">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search creator..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="flex items-center gap-1 border border-input rounded-md p-0.5 bg-muted/40">
                                <button
                                    onClick={() => setSelectedPlatform("ALL")}
                                    className={`px-2 py-1 text-[11px] font-medium rounded ${
                                        selectedPlatform === "ALL" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setSelectedPlatform("TIKTOK")}
                                    className={`px-2 py-1 text-[11px] font-medium rounded ${
                                        selectedPlatform === "TIKTOK" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    TikTok
                                </button>
                                <button
                                    onClick={() => setSelectedPlatform("SHOPEE")}
                                    className={`px-2 py-1 text-[11px] font-medium rounded ${
                                        selectedPlatform === "SHOPEE" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    Shopee
                                </button>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-2.5 px-4">Creator</th>
                                    <th className="py-2.5 px-4">Platform</th>
                                    <th className="py-2.5 px-4">Tier</th>
                                    <th className="py-2.5 px-4 text-right">Total GMV</th>
                                    <th className="py-2.5 px-4 text-right">Video Sales</th>
                                    <th className="py-2.5 px-4 text-right">Live GMV</th>
                                    <th className="py-2.5 px-4 text-right">Orders</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredAffiliates.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No external affiliates matching search criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAffiliates.map((aff, idx) => (
                                        <tr key={`${aff.username}-${aff.platform}-${idx}`} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4 font-semibold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground w-4">{idx + 1}</span>
                                                    <span>@{aff.username}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-[10px] ${
                                                        aff.platform.toLowerCase().includes("shopee")
                                                            ? "bg-amber-500/10 text-amber-500"
                                                            : "bg-cyan-500/10 text-cyan-500"
                                                    }`}
                                                >
                                                    {aff.platform}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-[11px] text-muted-foreground">{aff.tier || "Standard"}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-extrabold text-primary">
                                                RM {aff.total_gmv.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right text-muted-foreground">
                                                RM {aff.video_gmv.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right text-muted-foreground">
                                                RM {aff.live_gmv.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium">
                                                {aff.total_orders.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
