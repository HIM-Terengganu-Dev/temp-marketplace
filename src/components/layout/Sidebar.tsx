"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ShoppingBag,
    BarChart3,
    Settings,
    Megaphone,
    Store,
    RefreshCw,
    Globe,
    ChevronLeft,
    ChevronRight,
    X,
} from "lucide-react";

import { useSession } from "next-auth/react";

const navigation = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "TikTok Shops", href: "/tiktok-shops", icon: Store },
    { name: "Shopee Shop", href: "/shopee", icon: ShoppingBag },
    { name: "Ad Accounts", href: "/ads", icon: Megaphone },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "BOD Dashboard", href: "/bod-dashboard", icon: Globe },
    { name: "Debug Table", href: "/debug-table", icon: BarChart3 }, // Temporary Debug Link
    { name: "Debug Table (Ikram)", href: "/debug-table-ikram", icon: BarChart3 }, // Temporary Debug Link
    { name: "Refresh Token", href: "/refresh-token", icon: RefreshCw },
    { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
    isCollapsed?: boolean;
    isMobile?: boolean;
    onToggleCollapse?: () => void;
    onCloseMobile?: () => void;
    className?: string;
}

export function Sidebar({
    isCollapsed = false,
    isMobile = false,
    onToggleCollapse,
    onCloseMobile,
    className,
}: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();

    const allowedFeatures = (session?.user as { allowed_features?: string[] } | undefined)?.allowed_features || ["overview", "tiktok", "shopee", "ads", "analytics"];

    const filteredNavigation = navigation.filter(item => {
        if (item.href === "/") return allowedFeatures.includes("overview");
        if (item.href === "/tiktok-shops") return allowedFeatures.includes("tiktok");
        if (item.href === "/shopee") return allowedFeatures.includes("shopee");
        if (item.href === "/ads") return allowedFeatures.includes("ads");
        if (item.href === "/analytics") return allowedFeatures.includes("analytics");
        if (item.href === "/bod-dashboard") return allowedFeatures.includes("executive");
        if (item.href === "/debug-table") return allowedFeatures.includes("debug");
        if (item.href === "/debug-table-ikram") return allowedFeatures.includes("debug");
        if (item.href === "/refresh-token") return allowedFeatures.includes("refresh_token");
        if (item.href === "/settings") return allowedFeatures.includes("settings");
        return true;
    });

    return (
        <div className={cn(
            "border-r border-border/40 bg-sidebar/50 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out relative h-full",
            isCollapsed ? "w-16" : "w-64",
            className
        )}>
            {/* Desktop Collapse Floating Button */}
            {!isMobile && onToggleCollapse && (
                <button
                    onClick={onToggleCollapse}
                    className="absolute top-8 -right-3 h-6 w-6 rounded-full border border-border bg-card shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 z-50 hover:scale-110"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronLeft className="h-3.5 w-3.5" />
                    )}
                </button>
            )}

            {/* Sidebar Logo Header */}
            <div className={cn(
                "flex h-16 items-center border-b border-border/40 px-6",
                isCollapsed ? "justify-center px-0" : "justify-between"
            )}>
                <div className={cn(
                    "font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent transition-all duration-300 select-none",
                    isCollapsed ? "text-sm" : "text-xl"
                )}>
                    {isCollapsed ? "HIM" : "HIM Tracking"}
                </div>
                
                {/* Mobile dismiss trigger */}
                {isMobile && onCloseMobile && (
                    <button
                        onClick={onCloseMobile}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                        aria-label="Close menu"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Navigation items list */}
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {filteredNavigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={cn(
                                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                    isCollapsed ? "justify-center px-2" : "px-3"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 flex-shrink-0 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                                        isCollapsed ? "mr-0" : "mr-3"
                                    )}
                                />
                                <span className={cn(
                                    "transition-all duration-300 whitespace-nowrap overflow-hidden",
                                    isCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100"
                                )}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* System Status Footer */}
            <div className="border-t border-border/40 p-4">
                {isCollapsed ? (
                    <div className="flex justify-center cursor-help" title="System Operational">
                        <span className="h-3.5 w-3.5 rounded-full bg-green-500 animate-pulse border-2 border-background shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    </div>
                ) : (
                    <div className="rounded-lg bg-card/50 p-4 backdrop-blur-sm border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground">Status</p>
                        <div className="mt-2 flex items-center text-sm font-semibold text-green-500">
                            <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            System Operational
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
