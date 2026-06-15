import React from "react";
import { RefreshCw, CheckCircle2, Database, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
    isLoading: boolean;
    dataSource?: string;
    className?: string;
    showText?: boolean;
}

export function SyncIndicator({
    isLoading,
    dataSource = "live_api",
    className,
    showText = true,
}: SyncIndicatorProps) {
    if (isLoading) {
        return (
            <span
                className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/10 select-none animate-pulse",
                    className
                )}
            >
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                {showText && "Syncing..."}
            </span>
        );
    }

    const ds = dataSource.toLowerCase();
    const isStale  = ds.includes("stale");
    const isDb     = !isStale && (ds.includes("database") || ds.includes("cache") || ds.includes("recovery"));
    const isMixed  = !isStale && (ds.includes("+") || ds.includes("mixed"));
    const isApi    = !isStale && (ds.includes("api") || ds.includes("live"));

    // Stale: mid-day DB snapshot, live re-fetch is happening synchronously
    if (isStale) {
        return (
            <span
                className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/10 select-none animate-pulse",
                    className
                )}
                title="Data was cached mid-day. Refreshing from live API…"
            >
                <AlertTriangle className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                {showText && "Stale · Refreshing"}
            </span>
        );
    }

    let text = "Synced";
    let styleClass = "border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10";
    let icon = <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />;

    if (isMixed) {
        text = "Synced (Mixed)";
        styleClass = "border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-500/10";
        icon = <Database className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />;
    } else if (isDb) {
        text = "Synced (DB)";
        styleClass = "border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10";
        icon = <Database className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />;
    } else if (isApi) {
        text = "Synced (API)";
        styleClass = "border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10";
    }

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border select-none transition-colors duration-250",
                styleClass,
                className
            )}
        >
            {icon}
            {showText && text}
        </span>
    );
}

