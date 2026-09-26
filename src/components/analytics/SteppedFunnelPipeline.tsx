import React from "react";
import { Filter, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FunnelColor = "blue" | "purple" | "pink" | "emerald" | "cyan" | "amber" | "orange";

export interface FunnelStage {
    stepNumber: number;
    name: string;
    icon: React.ReactNode;
    value: number;
    unitLabel: string;
    badgeLabel: string;
    barLabel: string;
    color: FunnelColor;
    widthPercent?: number;
    badgeStyle?: string;
    extraNote?: React.ReactNode;
}

export interface FunnelTransition {
    label: string;
    rate: string | number;
    dropOff: string | number;
    color?: FunnelColor;
}

interface SteppedFunnelPipelineProps {
    title: string;
    subtitle?: string;
    overallYield?: string;
    stages: FunnelStage[];
    transitions: FunnelTransition[];
    icon?: React.ReactNode;
}

const COLOR_MAP: Record<FunnelColor, {
    text: string;
    gradient: string;
    shadow: string;
    badge: string;
    arrow: string;
}> = {
    blue: {
        text: "text-blue-400",
        gradient: "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600",
        shadow: "shadow-blue-500/10",
        badge: "text-muted-foreground bg-muted",
        arrow: "text-blue-400"
    },
    purple: {
        text: "text-purple-400",
        gradient: "bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600",
        shadow: "shadow-purple-500/10",
        badge: "text-purple-400 bg-purple-500/10 border border-purple-500/20",
        arrow: "text-purple-400"
    },
    pink: {
        text: "text-pink-400",
        gradient: "bg-gradient-to-r from-pink-600 via-pink-500 to-pink-600",
        shadow: "shadow-pink-500/10",
        badge: "text-pink-400 bg-pink-500/10 border border-pink-500/20",
        arrow: "text-pink-400"
    },
    emerald: {
        text: "text-emerald-400",
        gradient: "bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600",
        shadow: "shadow-emerald-500/10",
        badge: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
        arrow: "text-emerald-400"
    },
    cyan: {
        text: "text-cyan-400",
        gradient: "bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-600",
        shadow: "shadow-cyan-500/10",
        badge: "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20",
        arrow: "text-cyan-400"
    },
    amber: {
        text: "text-amber-400",
        gradient: "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600",
        shadow: "shadow-amber-500/10",
        badge: "text-amber-400 bg-amber-500/10 border border-amber-500/20",
        arrow: "text-amber-400"
    },
    orange: {
        text: "text-orange-400",
        gradient: "bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600",
        shadow: "shadow-orange-500/10",
        badge: "text-orange-400 bg-orange-500/10 border border-orange-500/20",
        arrow: "text-orange-400"
    }
};

export function SteppedFunnelPipeline({
    title,
    subtitle,
    overallYield,
    stages,
    transitions,
    icon
}: SteppedFunnelPipelineProps) {
    const topValue = stages.length > 0 ? stages[0].value : 0;

    return (
        <div className="p-5 sm:p-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-6">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/20">
                <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {icon || <Filter className="h-4 w-4 text-primary" />}
                        {title}
                    </h4>
                    {subtitle && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>
                {overallYield !== undefined && (
                    <Badge variant="outline" className="text-xs font-mono px-2.5 py-1 bg-primary/10 border-primary/30 text-primary self-start sm:self-auto font-semibold">
                        Overall Yield: {overallYield}
                    </Badge>
                )}
            </div>

            {/* Symmetrically Centered Cascade Stages */}
            <div className="max-w-2xl mx-auto w-full space-y-4 pt-1 flex flex-col items-center">
                {stages.map((stage, idx) => {
                    const colorConfig = COLOR_MAP[stage.color] || COLOR_MAP.blue;
                    
                    // Width calculation: 100% for first stage, or proportion with safety floor
                    let calculatedWidth = 100;
                    if (idx > 0) {
                        if (stage.widthPercent !== undefined) {
                            calculatedWidth = stage.widthPercent;
                        } else {
                            const rawRatio = topValue > 0 ? (stage.value / topValue) * 100 : 0;
                            // Progressive floor based on stage position to maintain cascade aesthetic
                            const minFloor = Math.max(18, 32 - idx * 4);
                            calculatedWidth = Math.max(minFloor, Math.min(100, rawRatio));
                        }
                    }

                    const transition = transitions[idx];

                    return (
                        <React.Fragment key={stage.stepNumber}>
                            {/* Funnel Stage Row */}
                            <div className="w-full space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-mono px-1">
                                    <span className={cn("font-bold flex items-center gap-1.5", colorConfig.text)}>
                                        {stage.icon} {stage.stepNumber}. {stage.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-foreground">
                                            {stage.value.toLocaleString()} {stage.unitLabel}
                                        </span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded",
                                            stage.badgeStyle || colorConfig.badge
                                        )}>
                                            {stage.badgeLabel}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full flex justify-center">
                                    <div
                                        className={cn(
                                            "h-10 rounded-xl shadow-md flex items-center justify-center text-xs font-bold text-white font-mono transition-all duration-500 px-4",
                                            colorConfig.gradient,
                                            colorConfig.shadow
                                        )}
                                        style={{ width: `${calculatedWidth}%` }}
                                    >
                                        <span className="truncate">{stage.barLabel}</span>
                                    </div>
                                </div>
                                {stage.extraNote && (
                                    <div className="flex justify-center text-[10px] text-muted-foreground pt-0.5">
                                        {stage.extraNote}
                                    </div>
                                )}
                            </div>

                            {/* Downward Transition Pill (if there is a next stage) */}
                            {transition && (
                                <div className="flex items-center justify-center gap-2.5 py-1 px-4 bg-muted/40 border border-border/30 rounded-full text-[11px] font-mono shadow-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <ArrowDown className={cn("h-3 w-3", COLOR_MAP[transition.color || "purple"].arrow)} />
                                        {transition.label}:
                                    </span>
                                    <span className={cn("font-bold", COLOR_MAP[transition.color || "purple"].text)}>
                                        {transition.rate}%
                                    </span>
                                    <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                        -{transition.dropOff}% drop-off
                                    </span>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
