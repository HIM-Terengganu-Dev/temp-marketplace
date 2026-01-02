"use client";

import { Bell, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Header() {
    return (
        <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-border/40 bg-background/50 backdrop-blur-xl px-6 shadow-sm">
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex flex-1 items-center">
                    <h1 className="text-lg font-semibold text-foreground">Dashboard Overview</h1>
                </div>
                <div className="flex items-center gap-x-4">

                    {/* Date Picker Placeholder */}
                    {/* Removed dummy calendar button */}

                    <Separator orientation="vertical" className="h-6 bg-border/40" />

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                    </Button>

                    <Separator orientation="vertical" className="h-6 bg-border/40" />

                    {/* User Profile Placeholder */}
                    <div className="flex items-center gap-x-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[1px]">
                            <div className="h-full w-full rounded-full bg-background flex items-center justify-center font-bold text-xs">
                                AD
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </header>
    );
}
