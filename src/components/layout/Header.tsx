"use client";

import { Bell, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

interface HeaderProps {
    onMenuClick?: () => void;
}

/** Returns a human-readable title for the current route */
function getPageTitle(pathname: string): string {
    const map: Record<string, string> = {
        "/":                   "Overview",
        "/tiktok-shops":       "TikTok Shops",
        "/shopee":             "Shopee",
        "/ads":                "TikTok Ads",
        "/shopee-ads":         "Shopee Ads",
        "/analytics":          "Analytics",
        "/debug-table":        "Debug Table",
        "/debug-table-ikram":  "Debug (Ikram)",
        "/refresh-token":      "Refresh Token",
        "/settings":           "Settings",
    };
    return map[pathname] ?? "Dashboard";
}

export function Header({ onMenuClick }: HeaderProps) {
    const { data: session } = useSession();
    const pathname = usePathname();

    const getInitials = (name: string) =>
        name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "U";

    const pageTitle = getPageTitle(pathname);

    return (
        <header className="sticky top-0 z-20 flex h-14 md:h-16 flex-shrink-0 items-center gap-x-3 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 md:px-6 shadow-[0_1px_0_rgba(255,255,255,0.04)]">

            {/* Left: hamburger (md+: hidden; mobile: only shown as drawer trigger for overflow) */}
            <div className="flex flex-1 items-center gap-3 min-w-0">
                {/* Hamburger — shown on mobile only as a secondary way to open full nav drawer */}
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="md:hidden flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 flex-shrink-0"
                        aria-label="Open navigation menu"
                    >
                        <Menu className="h-5 w-5 md:h-4.5 md:w-4.5" />
                    </button>
                )}

                {/* Page title — desktop shows full name, mobile shows short title */}
                <div className="min-w-0">
                    <span className="block text-base md:text-lg font-bold text-foreground leading-tight truncate">
                        {pageTitle}
                    </span>
                    <p className="text-[10px] text-muted-foreground hidden sm:block leading-none mt-0.5">
                        HIM Marketplace Tracking
                    </p>
                </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">

                {/* Notification bell */}
                <button
                    className="relative flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                    aria-label="Notifications"
                >
                    <Bell className="h-5 w-5 md:h-4.5 md:w-4.5" />
                    <span className="absolute top-2 right-2 md:top-1.5 md:right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                </button>

                <Separator orientation="vertical" className="h-6 bg-border/50 hidden sm:block" />

                {/* User section */}
                {session?.user && (
                    <div className="flex items-center gap-2">
                        {/* Name & role — hidden on very small screens */}
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-xs font-semibold text-foreground leading-none">
                                {session.user.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize mt-0.5 leading-none">
                                {(session.user as { role?: string }).role}
                            </span>
                        </div>

                        {/* Avatar */}
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[1.5px] flex-shrink-0">
                            <div className="h-full w-full rounded-full bg-background flex items-center justify-center font-bold text-[10px] text-foreground">
                                {getInitials(session.user.name || "User")}
                            </div>
                        </div>

                        {/* Sign out */}
                        <button
                            onClick={() => signOut()}
                            className="flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                            title="Sign Out"
                            aria-label="Sign Out"
                        >
                            <LogOut className="h-5 w-5 md:h-4 md:w-4" />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
