"use client";

import { parseISO, isValid } from "date-fns";

/** Format a YYYY-MM-DD string for display in KL timezone */
function displayDate(dateStr: string): string {
    if (!dateStr) return 'Pick date';
    // Parse as UTC midnight so the KL display is correct
    const d = new Date(dateStr + 'T00:00:00Z');
    if (!isValid(d)) return 'Pick date';
    return d.toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: '2-digit', month: 'short', year: 'numeric' });
}

/** Parse a YYYY-MM-DD string to a Date for the calendar widget (treat as local midnight) */
function parseKLDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : new Date();
}
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DatePreset = 'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom';

interface SimpleDatePickerProps {
    startDate: string;
    endDate: string;
    setStartDate: (date: string) => void;
    setEndDate: (date: string) => void;
    onPresetChange?: (preset: DatePreset) => void;
    activePreset?: DatePreset;
}

export function SimpleDatePicker({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    onPresetChange,
    activePreset,
}: SimpleDatePickerProps) {
    // Always compute dates in KL timezone so presets are correct regardless of server timezone
    const todayKL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

    /** Subtract N days from a YYYY-MM-DD string, return YYYY-MM-DD */
    const subDaysKL = (dateStr: string, n: number): string => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d - n));
        return dt.toISOString().split('T')[0];
    };

    /** First day of month for a YYYY-MM-DD string */
    const startOfMonthKL = (dateStr: string): string => {
        return dateStr.slice(0, 8) + '01';
    };

    /** Last day of month for a YYYY-MM-DD string */
    const endOfMonthKL = (dateStr: string): string => {
        const [y, m] = dateStr.split('-').map(Number);
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    };

    const btnBase = "h-7 text-[10px] px-2 transition-all duration-150";
    const activeClass = "bg-primary/20 text-primary font-semibold";

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-card/30 p-2 rounded-lg border border-border/50">
            {/* Presets */}
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(btnBase, activePreset === 'today' && activeClass)}
                    onClick={() => { setStartDate(todayKL); setEndDate(todayKL); onPresetChange?.('today'); }}
                >
                    Today
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(btnBase, activePreset === 'yesterday' && activeClass)}
                    onClick={() => { const y = subDaysKL(todayKL, 1); setStartDate(y); setEndDate(y); onPresetChange?.('yesterday'); }}
                >
                    Yesterday
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(btnBase, activePreset === 'weekly' && activeClass)}
                    onClick={() => { setStartDate(subDaysKL(todayKL, 7)); setEndDate(todayKL); onPresetChange?.('weekly'); }}
                >
                    Weekly
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(btnBase, activePreset === 'monthly' && activeClass)}
                    onClick={() => { setStartDate(startOfMonthKL(todayKL)); setEndDate(endOfMonthKL(todayKL)); onPresetChange?.('monthly'); }}
                >
                    Monthly
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                    <Label htmlFor="start-date" className="text-[10px] text-muted-foreground uppercase font-semibold">From</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="start-date"
                                variant="outline"
                                className={cn(
                                    "h-8 w-[130px] justify-start text-left font-normal border-primary/20 bg-background/50 hover:bg-primary/5 hover:text-primary transition-all text-xs text-muted-foreground px-2"
                                )}
                            >
                                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                {startDate ? displayDate(startDate) : <span>Pick date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={parseKLDate(startDate)}
                                onSelect={(date) => {
                                    if (date) {
                                        // Calendar returns midnight local-time Date; format as YYYY-MM-DD
                                        const y = date.getFullYear();
                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                        const d = String(date.getDate()).padStart(2, '0');
                                        setStartDate(`${y}-${m}-${d}`);
                                        onPresetChange?.('custom');
                                    }
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <span className="text-muted-foreground text-xs">to</span>
                <div className="flex items-center gap-2">
                    <Label htmlFor="end-date" className="text-[10px] text-muted-foreground uppercase font-semibold">To</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="end-date"
                                variant="outline"
                                className={cn(
                                    "h-8 w-[130px] justify-start text-left font-normal border-primary/20 bg-background/50 hover:bg-primary/5 hover:text-primary transition-all text-xs text-muted-foreground px-2"
                                )}
                            >
                                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                {endDate ? displayDate(endDate) : <span>Pick date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={parseKLDate(endDate)}
                                onSelect={(date) => {
                                    if (date) {
                                        const y = date.getFullYear();
                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                        const d = String(date.getDate()).padStart(2, '0');
                                        setEndDate(`${y}-${m}-${d}`);
                                        onPresetChange?.('custom');
                                    }
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>
    );
}
