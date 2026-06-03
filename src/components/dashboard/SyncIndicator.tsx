import React from "react";
import { RefreshCw, CheckCircle2, Database } from "lucide-react";
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
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border border-amber-500/30 text-amber-400 bg-amber-500/10 select-none animate-pulse",
                    className
                )}
            >
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                {showText && "Syncing..."}
            </span>
        );
    }

    const isDb = dataSource.toLowerCase().includes("database") || dataSource.toLowerCase().includes("cache") || dataSource.toLowerCase().includes("recovery");
    const isMixed = dataSource.toLowerCase().includes("+") || dataSource.toLowerCase().includes("mixed");
    const isApi = dataSource.toLowerCase().includes("api") || dataSource.toLowerCase().includes("live");

    let text = "Synced";
    let styleClass = "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
    let icon = <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />;

    if (isMixed) {
        text = "Synced (Mixed)";
        styleClass = "border-purple-500/30 text-purple-400 bg-purple-500/10";
        icon = <Database className="h-2.5 w-2.5 text-purple-400" />;
    } else if (isDb) {
        text = "Synced (DB)";
        styleClass = "border-blue-500/30 text-blue-400 bg-blue-500/10";
        icon = <Database className="h-2.5 w-2.5 text-blue-400" />;
    } else if (isApi) {
        text = "Synced (API)";
        styleClass = "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
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
