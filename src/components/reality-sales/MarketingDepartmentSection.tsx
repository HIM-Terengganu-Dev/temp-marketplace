"use client";

import React, { useState } from "react";
import { Megaphone, Search, ArrowUpDown, Video, CheckCircle, AlertTriangle, Eye, ThumbsUp, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DepartmentKpiCard from "./DepartmentKpiCard";
import DepartmentAlert from "./DepartmentAlert";

interface TeamItem {
    handle: string;
    videoCount: number;
    directGmv: number;
    attributedGmv: number;
    views: number;
    likes: number;
    directItemsSold: number;
    hasActivity: boolean;
}

interface MarketingData {
    status: string;
    hasData: boolean;
    targetAmount: number;
    totalSales: number;
    totalVideos: number;
    totalItemsSold: number;
    attainmentRate: number;
    teams: TeamItem[];
    message?: string | null;
    error?: string;
}

interface MarketingDepartmentSectionProps {
    data: MarketingData;
    month: string;
    isAdmin: boolean;
    onEditTarget: () => void;
    onRetry?: () => void;
}

export default function MarketingDepartmentSection({
    data,
    month,
    isAdmin,
    onEditTarget,
    onRetry
}: MarketingDepartmentSectionProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"gmv" | "videos" | "sold">("gmv");

    const teams = data.teams || [];
    const filteredTeams = teams
        .filter((t) => t.handle.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === "gmv") return b.directGmv - a.directGmv;
            if (sortBy === "videos") return b.videoCount - a.videoCount;
            if (sortBy === "sold") return b.directItemsSold - a.directItemsSold;
            return 0;
        });

    const activeTeamsCount = teams.filter(t => t.hasActivity).length;

    return (
        <div className="space-y-6">
            {/* Target & KPI Card */}
            <DepartmentKpiCard
                departmentLabel="Marketing"
                targetAmount={data.targetAmount || 0}
                actualSales={data.totalSales || 0}
                attainmentRate={data.attainmentRate || 0}
                isAdmin={isAdmin}
                onEditTarget={onEditTarget}
                unitLabel="Internal Video GMV"
                sublabel="Tracked from internal handles in Marketing System"
            />

            {/* Empty State or Connection Alert */}
            {!data.hasData && (
                <DepartmentAlert
                    title="Marketing Data Alert"
                    type="warning"
                    message={
                        data.message ||
                        `No internal marketing sales recorded for month ${month}. Please ensure TikTok video records are imported in Marketing & Video Tracking system with matching handles.`
                    }
                    onRetry={onRetry}
                />
            )}

            {data.error && (
                <DepartmentAlert
                    title="Connection Error"
                    type="error"
                    message={`Marketing database query failed: ${data.error}`}
                    onRetry={onRetry}
                />
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Internal Handles</p>
                            <p className="text-xl font-bold mt-0.5">{teams.length}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{activeTeamsCount} active this period</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                            <Megaphone className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Total Videos</p>
                            <p className="text-xl font-bold mt-0.5">{(data.totalVideos || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Tracked video posts</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                            <Video className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Items Sold</p>
                            <p className="text-xl font-bold mt-0.5">{(data.totalItemsSold || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Direct video sales</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <ShoppingBag className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Avg GMV / Handle</p>
                            <p className="text-xl font-bold mt-0.5">
                                RM {activeTeamsCount > 0 ? ((data.totalSales || 0) / activeTeamsCount).toLocaleString("en-MY", { maximumFractionDigits: 0 }) : "0"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Active handles only</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Internal Handles Table */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Megaphone className="h-4 w-4 text-primary" />
                                Total Sales by Internal Team Handles
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Filtered strictly to internal team handles in Marketing System (hw-marketing-tracking)
                            </CardDescription>
                        </div>

                        {/* Search and Sort controls */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-56">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search handle..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="flex items-center gap-1 border border-input rounded-md p-0.5 bg-muted/40">
                                <button
                                    onClick={() => setSortBy("gmv")}
                                    className={`px-2 py-1 text-[11px] font-medium rounded ${
                                        sortBy === "gmv" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    GMV
                                </button>
                                <button
                                    onClick={() => setSortBy("videos")}
                                    className={`px-2 py-1 text-[11px] font-medium rounded ${
                                        sortBy === "videos" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    Videos
                                </button>
                                <button
                                    onClick={() => setSortBy("sold")}
                                    className={`px-2 py-1 text-[11px] font-medium rounded ${
                                        sortBy === "sold" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    Sold
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
                                    <th className="py-2.5 px-4">Handle</th>
                                    <th className="py-2.5 px-4 text-right">Direct GMV</th>
                                    <th className="py-2.5 px-4 text-right">Attributed GMV</th>
                                    <th className="py-2.5 px-4 text-right">Videos</th>
                                    <th className="py-2.5 px-4 text-right">Items Sold</th>
                                    <th className="py-2.5 px-4 text-right">Views</th>
                                    <th className="py-2.5 px-4 text-right">Likes</th>
                                    <th className="py-2.5 px-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredTeams.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                            No matching internal handles found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTeams.map((team, idx) => (
                                        <tr key={team.handle} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4 font-semibold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground w-4">{idx + 1}</span>
                                                    <span>@{team.handle}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-extrabold text-primary">
                                                RM {team.directGmv.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right text-muted-foreground">
                                                RM {team.attributedGmv.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium">
                                                {team.videoCount.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium">
                                                {team.directItemsSold.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right text-muted-foreground">
                                                {team.views.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right text-muted-foreground">
                                                {team.likes.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {team.hasActivity ? (
                                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                                                        No Sales
                                                    </Badge>
                                                )}
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
