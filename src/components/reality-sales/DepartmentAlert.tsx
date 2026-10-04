"use client";

import React from "react";
import { AlertTriangle, AlertCircle, Info, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DepartmentAlertProps {
    title?: string;
    message: string;
    type?: "warning" | "error" | "info";
    onRetry?: () => void;
}

export default function DepartmentAlert({
    title = "Notice",
    message,
    type = "warning",
    onRetry,
}: DepartmentAlertProps) {
    const config = {
        warning: {
            container: "bg-amber-500/10 border-amber-500/30 text-amber-500",
            icon: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
            badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
        },
        error: {
            container: "bg-destructive/10 border-destructive/30 text-destructive",
            icon: <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />,
            badge: "bg-destructive/20 text-destructive border-destructive/30",
        },
        info: {
            container: "bg-blue-500/10 border-blue-500/30 text-blue-500",
            icon: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
            badge: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
        },
    }[type];

    return (
        <div className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${config.container}`}>
            <div className="flex items-start gap-3">
                <div className="mt-0.5">{config.icon}</div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm tracking-tight text-foreground">{title}</span>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${config.badge}`}>
                            {type === 'warning' ? 'No Data' : type}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
                        {message}
                    </p>
                </div>
            </div>

            {onRetry && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="shrink-0 h-8 gap-1.5 text-xs font-medium border-border/60 hover:bg-muted"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                </Button>
            )}
        </div>
    );
}
