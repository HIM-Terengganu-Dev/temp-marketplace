"use client";

import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession, signOut } from "next-auth/react";

export function Header() {
    const { data: session } = useSession();
    
    // Get initials (e.g. "Admin User" -> "AU")
    const getInitials = (name: string) => {
        return name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "U";
    };

    return (
        <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-border/40 bg-background/50 backdrop-blur-xl px-6 shadow-sm">
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex flex-1 items-center">
                    <h1 className="text-lg font-semibold text-foreground">Dashboard Overview</h1>
                </div>
                <div className="flex items-center gap-x-4">

                    <Separator orientation="vertical" className="h-6 bg-border/40" />

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                    </Button>

                    <Separator orientation="vertical" className="h-6 bg-border/40" />

                    {/* User Profile */}
                    {session?.user && (
                        <div className="flex items-center gap-x-4">
                            <div className="flex flex-col items-end text-sm">
                                <span className="font-medium leading-none">{session.user.name}</span>
                                <span className="text-xs text-muted-foreground capitalize mt-1">
                                    {(session.user as any).role}
                                </span>
                            </div>
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[1px]">
                                <div className="h-full w-full rounded-full bg-background flex items-center justify-center font-bold text-xs">
                                    {getInitials(session.user.name || "User")}
                                </div>
                            </div>
                            
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-2"
                                onClick={() => signOut()}
                                title="Sign Out"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                </div>
            </div>
        </header>
    );
}
