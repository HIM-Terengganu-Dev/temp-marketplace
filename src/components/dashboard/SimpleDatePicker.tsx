"use client";

import * as React from "react";
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
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-xs text-muted-foreground whitespace-nowrap">Start:</Label>
                <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 w-[140px] text-xs bg-background/50 border-primary/20 focus:border-primary/50"
                />
            </div>
            <span className="text-muted-foreground">-</span>
            <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-xs text-muted-foreground whitespace-nowrap">End:</Label>
                <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 w-[140px] text-xs bg-background/50 border-primary/20 focus:border-primary/50"
                />
            </div>
        </div>
    );
}
