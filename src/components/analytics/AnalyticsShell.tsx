"use client";

import React from "react";
import { BarChart3, Activity, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsShellProps {
    currentTab: "funnel" | "mtd";
    onTabChange: (tab: "funnel" | "mtd") => void;
    children: React.ReactNode;
}

export function AnalyticsShell({ currentTab, onTabChange, children }: AnalyticsShellProps) {
    return (
        <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header / Title (LCP Target Element) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-purple-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
                        <BarChart3 className="h-8 w-8 text-primary" />
                        Marketing Analytics Engine
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Consolidated Omnichannel performance metrics across sales funnel channels, host performance, and scheduling profiles.
                    </p>
                </div>
                
                {/* Tab switcher buttons in header */}
                <div className="flex items-center gap-2 bg-muted/50 dark:bg-muted/30 border border-border dark:border-border/80 rounded-xl p-1">
                    <button
                        onClick={() => onTabChange("funnel")}
                        className={cn(
                            "text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                            currentTab === "funnel"
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white"
                        )}
                    >
                        <Activity className="h-3.5 w-3.5" />
                        Funnel Overview
                    </button>
                    <button
                        onClick={() => onTabChange("mtd")}
                        className={cn(
                            "text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                            currentTab === "mtd"
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white"
                        )}
                    >
                        <Target className="h-3.5 w-3.5" />
                        MTD Performance Report
                    </button>
                </div>
            </div>

            {children}
        </div>
    );
}

export default AnalyticsShell;
