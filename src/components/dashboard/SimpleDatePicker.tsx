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
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    setStartDate: (date: string) => void;
    setEndDate: (date: string) => void;
    onPresetChange?: (preset: DatePreset) => void;
    activePreset?: DatePreset;
}

// Convert YYYY-MM-DD string to local midnight Date object timezone-safely
function parseKLDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// Convert local Date object back to YYYY-MM-DD string timezone-safely
function formatKLDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function displayFormattedRange(startStr: string, endStr: string, activePreset?: DatePreset): string {
    if (!startStr || !endStr) return 'Select Date Range';
    const start = parseKLDate(startStr);
    const end = parseKLDate(endStr);
    
    if (activePreset && activePreset !== 'custom') {
        const labels: Record<string, string> = {
            today: 'Today',
            yesterday: 'Yesterday',
            weekly: 'Last 7 Days',
            last30: 'Last 30 Days',
            monthly: 'This Month',
            lastMonth: 'Last Month'
        };
        if (labels[activePreset]) {
            return `${labels[activePreset]} (${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")})`;
        }
    }
    
    if (startStr === endStr) {
        return format(start, "MMMM dd, yyyy");
    }
    return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
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
    
    // Internal state for selected range inside the popover calendar
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() => ({
        from: parseKLDate(startDate),
        to: parseKLDate(endDate)
    }));

    // Sync external changes into internal state when popover opens/changes
    useEffect(() => {
        setSelectedRange({
            from: parseKLDate(startDate),
            to: parseKLDate(endDate)
        });
    }, [startDate, endDate, isOpen]);

    // Compute dates relative to local/KL today
    const getTodayLocal = (): Date => {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        return parseKLDate(todayStr);
    };

    const today = getTodayLocal();

    const presets = [
        { id: 'today' as DatePreset, label: 'Today', getValue: () => ({ from: today, to: today }) },
        { id: 'yesterday' as DatePreset, label: 'Yesterday', getValue: () => ({ from: subDays(today, 1), to: subDays(today, 1) }) },
        { id: 'weekly' as DatePreset, label: 'Last 7 Days', getValue: () => ({ from: subDays(today, 6), to: today }) },
        { id: 'last30' as DatePreset, label: 'Last 30 Days', getValue: () => ({ from: subDays(today, 29), to: today }) },
        { id: 'monthly' as DatePreset, label: 'This Month', getValue: () => ({ from: startOfMonth(today), to: today }) },
        { id: 'lastMonth' as DatePreset, label: 'Last Month', getValue: () => {
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
        setIsOpen(false); // Instantly close popover on preset select
    };

    const handleApply = () => {
        if (selectedRange?.from) {
            const startStr = formatKLDate(selectedRange.from);
            const endStr = selectedRange.to ? formatKLDate(selectedRange.to) : startStr;
            setStartDate(startStr);
            setEndDate(endStr);
            
            // Determine if the custom range exactly matches any preset to set activePreset
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

    return (
        <div className="flex items-center gap-2">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date-range-trigger"
                        variant="outline"
                        className={cn(
                            "h-9 min-w-[280px] justify-between text-left font-semibold border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200 hover:text-white transition-all shadow-sm select-none pr-3 pl-3.5 gap-2",
                            isOpen && "border-primary ring-1 ring-primary/20"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-slate-400" />
                            <span className="text-xs">{displayFormattedRange(startDate, endDate, activePreset)}</span>
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent 
                    className="w-auto p-0 border border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl rounded-xl overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800/80" 
                    align="end"
                >
                    {/* Presets Sidebar List */}
                    <div className="w-full md:w-[160px] p-2 bg-slate-900/40 flex flex-col gap-0.5 justify-start">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2.5 py-1.5 mb-1 select-none">Presets</span>
                        {presets.map((p) => {
                            const isActive = activePreset === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handlePresetSelect(p.id, p.getValue)}
                                    className={cn(
                                        "flex items-center justify-between text-xs font-semibold px-2.5 py-2 rounded-lg transition-all w-full text-left cursor-pointer",
                                        isActive 
                                            ? "bg-primary/10 text-primary" 
                                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                                    )}
                                >
                                    <span>{p.label}</span>
                                    {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Dual Month Calendar Panel */}
                    <div className="flex flex-col">
                        <div className="p-3 select-none flex-1">
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
                        {/* Action Buttons footer */}
                        <div className="p-3 border-t border-slate-800/80 bg-slate-900/20 flex items-center justify-between gap-4">
                            <span className="text-[10px] text-slate-400 pl-1 select-none">
                                {selectedRange?.from && (
                                    <>
                                        Selected: {format(selectedRange.from, "MMM dd, yyyy")}
                                        {selectedRange.to && ` - ${format(selectedRange.to, "MMM dd, yyyy")}`}
                                    </>
                                )}
                            </span>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="h-8 text-xs font-semibold px-4 cursor-pointer"
                                    onClick={handleApply}
                                    disabled={!selectedRange?.from}
                                >
                                    Apply Range
                                </Button>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
