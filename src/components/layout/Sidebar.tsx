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
    Bug,
} from "lucide-react";
import { useSession } from "next-auth/react";

const navigation = [
    { name: "Overview",           href: "/",                   icon: LayoutDashboard, feature: "overview"      },
    { name: "TikTok Shops",       href: "/tiktok-shops",       icon: Store,           feature: "tiktok"        },
    { name: "Shopee Shop",        href: "/shopee",              icon: ShoppingBag,     feature: "shopee"        },
    { name: "TikTok Ads",         href: "/ads",                 icon: Megaphone,       feature: "ads"           },
    { name: "Shopee Ads",         href: "/shopee-ads",          icon: Megaphone,       feature: "ads"           },
    { name: "Analytics",          href: "/analytics",           icon: BarChart3,       feature: "analytics"     },
    { name: "Debug Table",        href: "/debug-table",         icon: Bug,             feature: "debug"         },
    { name: "Debug (Ikram)",      href: "/debug-table-ikram",   icon: Bug,             feature: "debug"         },
    { name: "Refresh Token",      href: "/refresh-token",       icon: RefreshCw,       feature: "refresh_token" },
    { name: "Settings",           href: "/settings",            icon: Settings,        feature: "settings"      },
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

    const allowedFeatures =
        (session?.user as { allowed_features?: string[] } | undefined)
            ?.allowed_features || ["overview", "tiktok", "shopee", "ads", "analytics"];

    const filteredNavigation = navigation.filter(item =>
        allowedFeatures.includes(item.feature)
    );

    return (
        <div
            className={cn(
                "border-r border-border/30 bg-sidebar/50 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out relative h-full",
                isCollapsed ? "w-16" : "w-64",
                className
            )}
        >
            {/* Desktop collapse toggle button */}
            {!isMobile && onToggleCollapse && (
                <button
                    onClick={onToggleCollapse}
                    className={cn(
                        "absolute top-8 -right-3.5 h-7 w-7 rounded-full",
                        "border border-border/50 bg-card shadow-md",
                        "flex items-center justify-center",
                        "text-muted-foreground hover:text-foreground",
                        "transition-all duration-200 hover:scale-110 hover:shadow-lg z-50"
                    )}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed
                        ? <ChevronRight className="h-3.5 w-3.5" />
                        : <ChevronLeft className="h-3.5 w-3.5" />}
                </button>
            )}

            {/* Logo / Brand Header */}
            <div
                className={cn(
                    "flex h-14 md:h-16 items-center border-b border-border/30 px-4 flex-shrink-0",
                    isCollapsed ? "justify-center" : "justify-between"
                )}
            >
                <div
                    className={cn(
                        "font-black bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent select-none transition-all duration-300",
                        isCollapsed ? "text-sm" : "text-xl"
                    )}
                >
                    {isCollapsed ? "H" : "HIM Tracking"}
                </div>

                {/* Mobile close button */}
                {isMobile && onCloseMobile && (
                    <button
                        onClick={onCloseMobile}
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                        aria-label="Close menu"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Navigation items */}
            <div className="flex-1 overflow-y-auto py-3 scrollbar-thin">
                <nav className="space-y-0.5 px-2">
                    {filteredNavigation.map((item) => {
                        const isActive =
                            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={cn(
                                    "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isCollapsed ? "justify-center px-0 mx-1" : "px-3",
                                    isActive
                                        ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]"
                                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                )}
                            >
                                {/* Active left accent bar */}
                                {isActive && !isCollapsed && (
                                    <span className="absolute left-2 h-5 w-0.5 rounded-full bg-primary" />
                                )}

                                <item.icon
                                    className={cn(
                                        "flex-shrink-0 transition-all duration-200",
                                        isCollapsed ? "h-5 w-5" : "h-4 w-4 mr-3",
                                        isActive
                                            ? "text-primary"
                                            : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                />

                                {!isCollapsed && (
                                    <span className="truncate">{item.name}</span>
                                )}

                                {/* Active indicator dot (collapsed mode) */}
                                {isActive && isCollapsed && (
                                    <span className="absolute right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* System Status Footer */}
            <div className="border-t border-border/30 p-3 flex-shrink-0">
                {isCollapsed ? (
                    <div className="flex justify-center py-1" title="System Operational">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    </div>
                ) : (
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)] flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-emerald-400 leading-none">System Operational</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">All APIs connected</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
