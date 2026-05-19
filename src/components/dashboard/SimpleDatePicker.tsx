"use client";

import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
                    <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 w-[130px] text-xs bg-background/50 border-primary/20 focus:border-primary/50"
                    />
                </div>
                <span className="text-muted-foreground text-xs">to</span>
                <div className="flex items-center gap-2">
                    <Label htmlFor="end-date" className="text-[10px] text-muted-foreground uppercase font-semibold">To</Label>
                    <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 w-[130px] text-xs bg-background/50 border-primary/20 focus:border-primary/50"
                    />
                </div>
            </div>
        </div>
    );
}
