"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface LiveCountdownTimerProps {
    autoRefresh: boolean;
    onToggleAutoRefresh: () => void;
    onTriggerRefresh: () => void;
    lastUpdated: number;
}

export function LiveCountdownTimer({
    autoRefresh,
    onToggleAutoRefresh,
    onTriggerRefresh,
    lastUpdated,
}: LiveCountdownTimerProps) {
    const [secondsLeft, setSecondsLeft] = useState(300);
    const onTriggerRefreshRef = useRef(onTriggerRefresh);

    // Keep the refresh callback ref current to avoid restarting interval on parent re-renders
    useEffect(() => {
        onTriggerRefreshRef.current = onTriggerRefresh;
    }, [onTriggerRefresh]);

    // Reset countdown when data fetching completes or a manual reset is triggered
    useEffect(() => {
        setSecondsLeft(300);
    }, [lastUpdated]);

    useEffect(() => {
        if (!autoRefresh) {
            return;
        }

        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    // Trigger refresh asynchronously on next tick to avoid state updates during render
                    setTimeout(() => {
                        onTriggerRefreshRef.current();
                    }, 0);
                    return 300;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-xl px-3 py-1.5 backdrop-blur-sm select-none">
            <span
                className={cn(
                    "h-2 w-2 rounded-full flex-shrink-0",
                    autoRefresh
                        ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                        : "bg-amber-500"
                )}
            />
            <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">
                {autoRefresh ? `Live · ${formatTime(secondsLeft)}` : "Paused"}
            </span>
            <button
                onClick={onToggleAutoRefresh}
                className="text-[10px] font-bold text-muted-foreground hover:text-white transition-colors px-2 py-0.5 rounded-md bg-muted hover:bg-muted-foreground border border-border/50 cursor-pointer"
            >
                {autoRefresh ? "Pause" : "Resume"}
            </button>
        </div>
    );
}
