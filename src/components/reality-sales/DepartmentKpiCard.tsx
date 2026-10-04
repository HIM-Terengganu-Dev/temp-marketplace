"use client";

import React from "react";
import { Target, TrendingUp, Award, Pencil, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DepartmentKpiCardProps {
    departmentLabel: string;
    targetAmount: number;
    actualSales: number;
    attainmentRate: number;
    isAdmin?: boolean;
    onEditTarget?: () => void;
    unitLabel?: string;
    sublabel?: string;
}

export default function DepartmentKpiCard({
    departmentLabel,
    targetAmount,
    actualSales,
    attainmentRate,
    isAdmin = false,
    onEditTarget,
    unitLabel = "GMV",
    sublabel
}: DepartmentKpiCardProps) {
    const isTargetSet = targetAmount > 0;
    const isAchieved = attainmentRate >= 100;
    const isGood = attainmentRate >= 75;
    const gap = targetAmount - actualSales;

    return (
        <Card className="border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 h-28 w-28 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

            <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            <Target className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                                {departmentLabel} Target
                            </span>
                            {sublabel && (
                                <span className="text-[11px] text-muted-foreground/80">{sublabel}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isTargetSet ? (
                            <Badge
                                variant="outline"
                                className={`text-[11px] font-semibold px-2 py-0.5 ${
                                    isAchieved
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                        : isGood
                                        ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                                        : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                }`}
                            >
                                {isAchieved ? "Goal Achieved" : isGood ? "On Track" : "Action Needed"}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground border-dashed">
                                Target Unset
                            </Badge>
                        )}

                        {isAdmin && onEditTarget && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onEditTarget}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                                title="Configure Target as Admin"
                            >
                                <Pencil className="h-3 w-3" />
                                <span className="hidden sm:inline">Set Target</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Numbers row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="text-[11px] text-muted-foreground font-medium">Monthly Target</div>
                        <div className="text-base sm:text-lg font-bold tracking-tight mt-0.5">
                            {isTargetSet ? `RM ${targetAmount.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "Not Configured"}
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="text-[11px] text-primary font-medium">Actual {unitLabel}</div>
                        <div className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5 text-primary">
                            RM {actualSales.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="text-[11px] text-muted-foreground font-medium">Attainment Rate</div>
                        <div className={`text-base sm:text-lg font-bold tracking-tight mt-0.5 ${
                            isAchieved ? "text-emerald-500" : isGood ? "text-blue-500" : "text-amber-500"
                        }`}>
                            {attainmentRate.toFixed(1)}%
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="text-[11px] text-muted-foreground font-medium">
                            {gap > 0 ? "Remaining Gap" : "Surplus"}
                        </div>
                        <div className="text-base sm:text-lg font-bold tracking-tight mt-0.5 text-foreground">
                            RM {Math.abs(gap).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {isTargetSet && (
                    <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                            <span>Attainment Progress</span>
                            <span>{Math.min(100, attainmentRate).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                    isAchieved ? "bg-emerald-500" : isGood ? "bg-blue-500" : "bg-amber-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, attainmentRate))}%` }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
