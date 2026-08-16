"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Database, 
    Globe, 
    RefreshCw, 
    Clock, 
    ChevronDown,
    Activity,
    Info
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SourceStatus {
    lastFetch: string | null;
    status: 'success' | 'error' | 'syncing' | 'idle';
    latestDate?: string | null;
    totalRecords?: number;
    message?: string;
}

interface SyncStatusData {
    api: {
        tiktok: SourceStatus;
        shopee: SourceStatus;
    };
    database: {
        tiktok: SourceStatus;
        shopee: SourceStatus;
    };
    serverTime: string;
}

/** Formats ISO string into formatted KL date & time (e.g., 16 Aug 2026, 11:00 AM) */
function formatKLDateTime(isoStr: string | null | undefined): string {
    if (!isoStr) return "Not synced yet";
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return "Unknown";
        return new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Kuala_Lumpur",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }).format(d);
    } catch {
        return "Unknown";
    }
}

/** Returns human friendly relative time description */
function getRelativeTime(isoStr: string | null | undefined): string {
    if (!isoStr) return "Never";
    try {
        const d = new Date(isoStr);
        const now = new Date();
        const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

        if (diffSec < 45) return "Just now";
        if (diffSec < 90) return "1 min ago";
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
        if (diffSec < 7200) return "1 hr ago";
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hrs ago`;
        if (diffSec < 172800) return "Yesterday";
        return `${Math.floor(diffSec / 86400)} days ago`;
    } catch {
        return "";
    }
}

export function DataFreshnessBadge() {
    const [data, setData] = useState<SyncStatusData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date>(new Date());

    const fetchSyncStatus = useCallback(async (isManual = false) => {
        if (isManual) setIsLoading(true);
        try {
            const res = await fetch("/api/system/sync-status", {
                cache: "no-store",
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setLastChecked(new Date());
            }
        } catch (err) {
            console.error("Failed to fetch sync status:", err);
        } finally {
            if (isManual) setIsLoading(false);
        }
    }, []);

    // Initial load and periodic refresh every 60 seconds
    useEffect(() => {
        fetchSyncStatus();
        const interval = setInterval(() => {
            fetchSyncStatus();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchSyncStatus]);

    // Find the most recent fetch timestamp across all sources
    const allTimestamps = [
        data?.api?.tiktok?.lastFetch,
        data?.api?.shopee?.lastFetch,
        data?.database?.tiktok?.lastFetch,
        data?.database?.shopee?.lastFetch,
    ].filter(Boolean) as string[];

    const latestTimestamp = allTimestamps.length > 0
        ? new Date(Math.max(...allTimestamps.map(t => new Date(t).getTime()))).toISOString()
        : null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "group flex items-center gap-1.5 px-2.5 py-1.5 md:py-1 rounded-lg border text-xs transition-all duration-200 cursor-pointer select-none",
                        "bg-background/80 hover:bg-muted/80 border-border/60 hover:border-border text-foreground shadow-xs"
                    )}
                    aria-label="View last fetch and data freshness status"
                    title="Click to view API & Database last fetch timestamps"
                >
                    {/* Status Dot */}
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>

                    {/* Label */}
                    <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                        <Activity className="h-3 w-3 text-emerald-500" />
                        <span className="hidden sm:inline font-semibold">Data Freshness:</span>
                        <span className="text-foreground font-medium">
                            {latestTimestamp ? getRelativeTime(latestTimestamp) : "Synced"}
                        </span>
                    </div>

                    <ChevronDown className="h-3 w-3 text-muted-foreground/70 transition-transform duration-200 group-hover:text-foreground" />
                </button>
            </PopoverTrigger>

            <PopoverContent 
                align="end" 
                sideOffset={8} 
                className="w-80 sm:w-96 p-0 shadow-xl border-border/80 bg-background/95 backdrop-blur-xl rounded-xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <Activity className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-foreground leading-tight">Data Freshness & Sync</h4>
                            <p className="text-[10px] text-muted-foreground">API & Database Last Fetch Info</p>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchSyncStatus(true)}
                        disabled={isLoading}
                        className="h-7 px-2 text-[11px] gap-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                        <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin text-emerald-500")} />
                        <span>{isLoading ? "Checking..." : "Refresh"}</span>
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">

                    {/* 1. API SECTION */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-border/30">
                            <div className="flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-[11px] font-bold tracking-wide uppercase text-foreground">
                                    1. API (Live Open API)
                                </span>
                            </div>
                            <span className="text-[10px] font-medium text-blue-500 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                                Live Ingest
                            </span>
                        </div>

                        {/* 1.1 TikTok API */}
                        <div className="p-2.5 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/30 transition-colors space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                    <span className="text-xs font-semibold text-foreground">1.1 TikTok API</span>
                                </div>
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    {getRelativeTime(data?.api?.tiktok?.lastFetch)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground/70" />
                                    <span>Last Fetch:</span>
                                </span>
                                <span className="font-mono text-foreground/90 font-medium">
                                    {formatKLDateTime(data?.api?.tiktok?.lastFetch)}
                                </span>
                            </div>
                        </div>

                        {/* 1.2 Shopee API */}
                        <div className="p-2.5 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/30 transition-colors space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                    <span className="text-xs font-semibold text-foreground">1.2 Shopee API</span>
                                </div>
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    {getRelativeTime(data?.api?.shopee?.lastFetch)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground/70" />
                                    <span>Last Fetch:</span>
                                </span>
                                <span className="font-mono text-foreground/90 font-medium">
                                    {formatKLDateTime(data?.api?.shopee?.lastFetch)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. DATABASE SECTION */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-border/30">
                            <div className="flex items-center gap-1.5">
                                <Database className="h-3.5 w-3.5 text-purple-500" />
                                <span className="text-[11px] font-bold tracking-wide uppercase text-foreground">
                                    2. Database (Stored Records)
                                </span>
                            </div>
                            <span className="text-[10px] font-medium text-purple-500 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                                Persistent
                            </span>
                        </div>

                        {/* 2.1 TikTok DB */}
                        <div className="p-2.5 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/30 transition-colors space-y-1.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                    <span className="text-xs font-semibold text-foreground">2.1 TikTok Database</span>
                                </div>
                                <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                    {getRelativeTime(data?.database?.tiktok?.lastFetch)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground/70" />
                                    <span>Last Sync:</span>
                                </span>
                                <span className="font-mono text-foreground/90 font-medium">
                                    {formatKLDateTime(data?.database?.tiktok?.lastFetch)}
                                </span>
                            </div>
                            {data?.database?.tiktok?.latestDate && (
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 border-t border-border/20 pt-1">
                                    <span>Latest Stored Date:</span>
                                    <span className="font-mono text-foreground font-semibold">
                                        {data.database.tiktok.latestDate}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 2.2 Shopee DB */}
                        <div className="p-2.5 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/30 transition-colors space-y-1.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                    <span className="text-xs font-semibold text-foreground">2.2 Shopee Database</span>
                                </div>
                                <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                    {getRelativeTime(data?.database?.shopee?.lastFetch)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground/70" />
                                    <span>Last Sync:</span>
                                </span>
                                <span className="font-mono text-foreground/90 font-medium">
                                    {formatKLDateTime(data?.database?.shopee?.lastFetch)}
                                </span>
                            </div>
                            {data?.database?.shopee?.latestDate && (
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 border-t border-border/20 pt-1">
                                    <span>Latest Stored Date:</span>
                                    <span className="font-mono text-foreground font-semibold">
                                        {data.database.shopee.latestDate}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Timezone: GMT+8 (KL)
                    </span>
                    <span>Auto-refreshes every 60s</span>
                </div>
            </PopoverContent>
        </Popover>
    );
}
