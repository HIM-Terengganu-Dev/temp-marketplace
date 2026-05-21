"use client";

import { format, subDays, startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleDatePickerProps {
    startDate: string;
    endDate: string;
    setStartDate: (date: string) => void;
    setEndDate: (date: string) => void;
}

export function SimpleDatePicker({
    startDate,
    endDate,
    setStartDate,
    setEndDate
}: SimpleDatePickerProps) {
    const today = new Date();
    
    // Helper to set range
    const setRange = (start: Date, end: Date) => {
        setStartDate(format(start, "yyyy-MM-dd"));
        setEndDate(format(end, "yyyy-MM-dd"));
    };

    // Helper to safely parse string to Date object
    const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const parsed = parseISO(dateStr);
        return isValid(parsed) ? parsed : new Date();
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-card/30 p-2 rounded-lg border border-border/50">
            {/* Presets */}
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] px-2"
                    onClick={() => setRange(today, today)}
                >
                    Today
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] px-2"
                    onClick={() => setRange(subDays(today, 1), subDays(today, 1))}
                >
                    Yesterday
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] px-2"
                    onClick={() => setRange(subDays(today, 7), today)}
                >
                    Weekly
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] px-2"
                    onClick={() => setRange(startOfMonth(today), endOfMonth(today))}
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
                                {startDate ? format(parseDate(startDate), "MMM dd, yyyy") : <span>Pick date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={parseDate(startDate)}
                                onSelect={(date) => {
                                    if (date) {
                                        setStartDate(format(date, "yyyy-MM-dd"));
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
                                {endDate ? format(parseDate(endDate), "MMM dd, yyyy") : <span>Pick date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={parseDate(endDate)}
                                onSelect={(date) => {
                                    if (date) {
                                        setEndDate(format(date, "yyyy-MM-dd"));
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
