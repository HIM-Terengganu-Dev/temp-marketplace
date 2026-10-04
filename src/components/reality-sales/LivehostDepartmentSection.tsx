"use client";

import React, { useState } from "react";
import { Radio, Users, Clock, Video, TrendingUp, Sparkles, UserCheck, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DepartmentKpiCard from "./DepartmentKpiCard";
import DepartmentAlert from "./DepartmentAlert";

interface CategoryMetric {
    label: string;
    shopeeGmv: number;
    shopeeSessions: number;
    shopeeHours: number;
    tiktokGmv: number;
    tiktokSessions: number;
    tiktokHours: number;
    totalGmv: number;
}

interface TopHost {
    host_name: string;
    category: string;
    platform: string;
    sessions: number;
    total_hours: number;
    direct_gmv: number;
}

interface LivehostData {
    status: string;
    hasData: boolean;
    targetAmount: number;
    totalGmv: number;
    totalSessions: number;
    totalHours: number;
    attainmentRate: number;
    categories: Record<string, CategoryMetric>;
    topHosts: TopHost[];
    error?: string;
}

interface LivehostDepartmentSectionProps {
    data: LivehostData;
    month: string;
    isAdmin: boolean;
    onEditTarget: () => void;
    onRetry?: () => void;
}

export default function LivehostDepartmentSection({
    data,
    month,
    isAdmin,
    onEditTarget,
    onRetry
}: LivehostDepartmentSectionProps) {
    const cats = data.categories || {};

    const internal = cats.INTERNAL || { label: "Internal", shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, shopeeSessions: 0, tiktokSessions: 0, shopeeHours: 0, tiktokHours: 0 };
    const external = cats.EXTERNAL || { label: "External", shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, shopeeSessions: 0, tiktokSessions: 0, shopeeHours: 0, tiktokHours: 0 };
    const relive = cats.RELIVE || { label: "ReLive", shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, shopeeSessions: 0, tiktokSessions: 0, shopeeHours: 0, tiktokHours: 0 };
    const drsamhan = cats.DR_SAMHAN || { label: "DrSamhan", shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, shopeeSessions: 0, tiktokSessions: 0, shopeeHours: 0, tiktokHours: 0 };
    const ailive = cats.AI_LIVE || { label: "Ai Live", shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, shopeeSessions: 0, tiktokSessions: 0, shopeeHours: 0, tiktokHours: 0 };

    return (
        <div className="space-y-6">
            {/* Target & KPI Card */}
            <DepartmentKpiCard
                departmentLabel="Live Host"
                targetAmount={data.targetAmount || 0}
                actualSales={data.totalGmv || 0}
                attainmentRate={data.attainmentRate || 0}
                isAdmin={isAdmin}
                onEditTarget={onEditTarget}
                unitLabel="Direct Live GMV"
                sublabel="Centralised from hw-livehost-management sessions across 5 streams"
            />

            {!data.hasData && (
                <DepartmentAlert
                    title="Live Host Notice"
                    type="warning"
                    message={`No livestream shift reports found for month ${month}. Please ensure live shifts and session reports are logged.`}
                    onRetry={onRetry}
                />
            )}

            {data.error && (
                <DepartmentAlert
                    title="Livehost Database Error"
                    type="error"
                    message={`Failed to connect to Live Host database: ${data.error}`}
                    onRetry={onRetry}
                />
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Total Stream Hours</p>
                            <p className="text-xl font-bold mt-0.5">{(data.totalHours || 0).toFixed(1)} hrs</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">All streams combined</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Total Sessions</p>
                            <p className="text-xl font-bold mt-0.5">{(data.totalSessions || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Completed shifts</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                            <Radio className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Avg GMV / Hour</p>
                            <p className="text-xl font-bold mt-0.5">
                                RM {data.totalHours > 0 ? ((data.totalGmv || 0) / data.totalHours).toFixed(0) : "0"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Stream hourly efficiency</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Active Streams</p>
                            <p className="text-xl font-bold mt-0.5">5 Categories</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">TikTok & Shopee Live</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
                            <Sparkles className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 5 Department Categories Grid */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Live Stream Categories & Platform Breakdown
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 1. Internal */}
                    <Card className="border-border/60 hover:border-primary/40 transition-colors shadow-sm">
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-sm">1. Internal Live</span>
                                </div>
                                <span className="text-xs font-extrabold text-foreground">
                                    RM {internal.totalGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    <span className="font-medium">Shopee</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">RM {internal.shopeeGmv.toLocaleString("en-MY", { maximumFractionDigits: 2 })}</span>
                                    <span className="text-[10px] text-muted-foreground block">{internal.shopeeSessions} sessions • {internal.shopeeHours.toFixed(1)}h</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                    <span className="font-medium">TikTok</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">RM {internal.tiktokGmv.toLocaleString("en-MY", { maximumFractionDigits: 2 })}</span>
                                    <span className="text-[10px] text-muted-foreground block">{internal.tiktokSessions} sessions • {internal.tiktokHours.toFixed(1)}h</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. External */}
                    <Card className="border-border/60 hover:border-primary/40 transition-colors shadow-sm">
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                                        <UserCheck className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-sm">2. External Live</span>
                                </div>
                                <span className="text-xs font-extrabold text-foreground">
                                    RM {external.totalGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                    <span className="font-medium">TikTok</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">RM {external.tiktokGmv.toLocaleString("en-MY", { maximumFractionDigits: 2 })}</span>
                                    <span className="text-[10px] text-muted-foreground block">{external.tiktokSessions} sessions • {external.tiktokHours.toFixed(1)}h</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70 italic px-1">
                                Agency & external guest live hosts on TikTok Shop
                            </p>
                        </CardContent>
                    </Card>

                    {/* 3. ReLive */}
                    <Card className="border-border/60 hover:border-primary/40 transition-colors shadow-sm">
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                                        <Video className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-sm">3. ReLive</span>
                                </div>
                                <span className="text-xs font-extrabold text-foreground">
                                    RM {relive.totalGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                    <span className="font-medium">TikTok</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">RM {relive.tiktokGmv.toLocaleString("en-MY", { maximumFractionDigits: 2 })}</span>
                                    <span className="text-[10px] text-muted-foreground block">{relive.tiktokSessions} sessions • {relive.tiktokHours.toFixed(1)}h</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    <span className="font-medium">Shopee</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">RM {relive.shopeeGmv.toLocaleString("en-MY", { maximumFractionDigits: 2 })}</span>
                                    <span className="text-[10px] text-muted-foreground block">{relive.shopeeSessions} sessions • {relive.shopeeHours.toFixed(1)}h</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. DrSamhan */}
                    <Card className="border-border/60 hover:border-primary/40 transition-colors shadow-sm">
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-sm">4. DrSamhan</span>
                                </div>
                                <span className="text-xs font-extrabold text-foreground">
                                    RM {drsamhan.totalGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                    <span className="font-medium">TikTok</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">RM {drsamhan.tiktokGmv.toLocaleString("en-MY", { maximumFractionDigits: 2 })}</span>
                                    <span className="text-[10px] text-muted-foreground block">{drsamhan.tiktokSessions} sessions • {drsamhan.tiktokHours.toFixed(1)}h</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70 italic px-1">
                                Celebrity brand livestreaming dedicated stream
                            </p>
                        </CardContent>
                    </Card>

                    {/* 5. Ai Live */}
                    <Card className="border-border/60 hover:border-primary/40 transition-colors shadow-sm">
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-sm">5. Ai Live</span>
                                </div>
                                <span className="text-xs font-extrabold text-foreground">
                                    RM {ailive.totalGmv.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                    <span className="font-medium">TikTok</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">RM {ailive.tiktokGmv.toLocaleString("en-MY", { maximumFractionDigits: 2 })}</span>
                                    <span className="text-[10px] text-muted-foreground block">{ailive.tiktokSessions} sessions • {ailive.tiktokHours.toFixed(1)}h</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70 italic px-1">
                                Automated synthetic AI avatar streams on TikTok Shop
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Top Live Hosts Table */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Radio className="h-4 w-4 text-primary" />
                        Top Performing Live Hosts
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Direct GMV attribution by host across all stream categories
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-2.5 px-4">Host</th>
                                    <th className="py-2.5 px-4">Category</th>
                                    <th className="py-2.5 px-4">Platform</th>
                                    <th className="py-2.5 px-4 text-right">Direct GMV</th>
                                    <th className="py-2.5 px-4 text-right">Sessions</th>
                                    <th className="py-2.5 px-4 text-right">Hours</th>
                                    <th className="py-2.5 px-4 text-right">Avg GMV / Hr</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {data.topHosts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No livestream host records found for this period.
                                        </td>
                                    </tr>
                                ) : (
                                    data.topHosts.map((h, idx) => (
                                        <tr key={`${h.host_name}-${h.category}-${idx}`} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4 font-semibold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground w-4">{idx + 1}</span>
                                                    <span>{h.host_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant="outline" className="text-[10px] font-normal">
                                                    {h.category}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-[10px] uppercase ${
                                                        h.platform === "shopee" ? "bg-amber-500/10 text-amber-500" : "bg-cyan-500/10 text-cyan-500"
                                                    }`}
                                                >
                                                    {h.platform}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-right font-extrabold text-primary">
                                                RM {h.direct_gmv.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium">
                                                {h.sessions}
                                            </td>
                                            <td className="py-3 px-4 text-right text-muted-foreground">
                                                {h.total_hours.toFixed(1)}h
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium">
                                                RM {h.total_hours > 0 ? (h.direct_gmv / h.total_hours).toFixed(0) : "0"}
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
