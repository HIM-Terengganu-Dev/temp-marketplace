"use client";

import React, { useState, useEffect } from "react";
import { parseISO, format, subDays, startOfMonth, endOfMonth, isValid, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type DatePreset = 'today' | 'yesterday' | 'weekly' | 'monthly' | 'last30' | 'lastMonth' | 'custom';

interface SimpleDatePickerProps {
    startDate: string;
    endDate: string;
    setStartDate: (date: string) => void;
    setEndDate: (date: string) => void;
    onPresetChange?: (preset: DatePreset) => void;
    activePreset?: DatePreset;
}

function parseKLDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatKLDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Short label for the trigger button */
function displayShortLabel(startStr: string, endStr: string, activePreset?: DatePreset): string {
    if (!startStr || !endStr) return 'Select Range';

    // Preset short labels (compact for mobile)
    const shortLabels: Record<string, string> = {
        today:     'Today',
        yesterday: 'Yesterday',
        weekly:    'Last 7 Days',
        last30:    'Last 30 Days',
        monthly:   'This Month',
        lastMonth: 'Last Month',
    };

    if (activePreset && activePreset !== 'custom' && shortLabels[activePreset]) {
        return shortLabels[activePreset];
    }

    // Custom range
    const start = parseKLDate(startStr);
    const end = parseKLDate(endStr);
    if (startStr === endStr) return format(start, 'MMM d, yyyy');
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

export function SimpleDatePicker({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    onPresetChange,
    activePreset = 'today',
}: SimpleDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() => ({
        from: parseKLDate(startDate),
        to: parseKLDate(endDate),
    }));

    useEffect(() => {
        setSelectedRange({
            from: parseKLDate(startDate),
            to: parseKLDate(endDate),
        });
    }, [startDate, endDate, isOpen]);

    const getTodayLocal = (): Date => {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        return parseKLDate(todayStr);
    };

    const today = getTodayLocal();

    const presets = [
        { id: 'today'     as DatePreset, label: 'Today',       getValue: () => ({ from: today, to: today }) },
        { id: 'yesterday' as DatePreset, label: 'Yesterday',   getValue: () => ({ from: subDays(today, 1), to: subDays(today, 1) }) },
        { id: 'weekly'    as DatePreset, label: 'Last 7 Days', getValue: () => ({ from: subDays(today, 6), to: today }) },
        { id: 'last30'    as DatePreset, label: 'Last 30 Days',getValue: () => ({ from: subDays(today, 29), to: today }) },
        { id: 'monthly'   as DatePreset, label: 'This Month',  getValue: () => ({ from: startOfMonth(today), to: today }) },
        { id: 'lastMonth' as DatePreset, label: 'Last Month',  getValue: () => {
            const prevMonth = subDays(startOfMonth(today), 1);
            return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
        }},
    ];

    const handlePresetSelect = (presetId: DatePreset, rangeFn: () => { from: Date; to: Date }) => {
        const range = rangeFn();
        setSelectedRange(range);
        setStartDate(formatKLDate(range.from));
        setEndDate(formatKLDate(range.to));
        onPresetChange?.(presetId);
        setIsOpen(false);
    };

    const handleApply = () => {
        if (selectedRange?.from) {
            const startStr = formatKLDate(selectedRange.from);
            const endStr = selectedRange.to ? formatKLDate(selectedRange.to) : startStr;
            setStartDate(startStr);
            setEndDate(endStr);

            let matchedPreset: DatePreset = 'custom';
            for (const p of presets) {
                const pRange = p.getValue();
                if (formatKLDate(pRange.from) === startStr && formatKLDate(pRange.to) === endStr) {
                    matchedPreset = p.id;
                    break;
                }
            }
            onPresetChange?.(matchedPreset);
            setIsOpen(false);
        }
    };

    const shortLabel = displayShortLabel(startDate, endDate, activePreset);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    id="date-range-trigger"
                    aria-label="Select date range"
                    className={cn(
                        // Mobile: full width; sm+: auto width with min constraint
                        "w-full sm:w-auto sm:min-w-[200px]",
                        "flex items-center justify-between gap-2",
                        "h-10 rounded-xl px-3.5",
                        "text-xs font-semibold text-slate-200",
                        "bg-slate-900/60 border border-slate-700/60",
                        "hover:bg-slate-800 hover:border-slate-600/80 hover:text-white",
                        "transition-all duration-200 shadow-sm select-none",
                        isOpen && "border-primary/60 ring-2 ring-primary/20 bg-slate-800"
                    )}
                >
                    <span className="flex items-center gap-2 min-w-0">
                        <CalendarIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{shortLabel}</span>
                    </span>
                    <ChevronDown
                        className={cn(
                            "h-3.5 w-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200",
                            isOpen && "rotate-180"
                        )}
                    />
                </button>
            </PopoverTrigger>

            <PopoverContent
                className={cn(
                    "w-[calc(100vw-2rem)] sm:w-auto p-0 max-w-[680px]",
                    "border border-slate-800 bg-slate-950/95 backdrop-blur-xl",
                    "shadow-2xl rounded-2xl overflow-hidden",
                    "flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800/80",
                    "animate-in fade-in-0 zoom-in-95 duration-150"
                )}
                align="end"
                sideOffset={8}
            >
                {/* Presets column */}
                <div className="w-full md:w-[152px] p-2 bg-slate-900/50 flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2.5 pt-1.5 pb-1 select-none">
                        Quick Select
                    </span>
                    {/* Mobile: horizontal scrolling pill row */}
                    <div className="flex flex-row md:flex-col gap-1 overflow-x-auto scrollbar-none pb-1 md:pb-0">
                        {presets.map((p) => {
                            const isActive = activePreset === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handlePresetSelect(p.id, p.getValue)}
                                    className={cn(
                                        "flex items-center justify-between text-xs font-semibold",
                                        "px-3 py-2 rounded-lg transition-all duration-150",
                                        "whitespace-nowrap flex-shrink-0",
                                        "text-left cursor-pointer w-full",
                                        isActive
                                            ? "bg-primary/15 text-primary"
                                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                                    )}
                                >
                                    <span>{p.label}</span>
                                    {isActive && <Check className="h-3.5 w-3.5 text-primary ml-2 flex-shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Calendar panel */}
                <div className="flex flex-col">
                    <div className="p-3 select-none overflow-x-auto scrollbar-none">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={selectedRange?.from}
                            selected={selectedRange}
                            onSelect={setSelectedRange}
                            numberOfMonths={2}
                            className="bg-transparent"
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-[10px] text-slate-400 select-none min-w-0">
                            {selectedRange?.from ? (
                                <>
                                    {format(selectedRange.from, "MMM d, yyyy")}
                                    {selectedRange.to && ` – ${format(selectedRange.to, "MMM d, yyyy")}`}
                                </>
                            ) : "Pick a start date"}
                        </span>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 text-xs font-semibold text-slate-400 hover:text-slate-200"
                                onClick={() => setIsOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="h-9 text-xs font-semibold px-5"
                                onClick={handleApply}
                                disabled={!selectedRange?.from}
                            >
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
