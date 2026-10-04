"use client";

import { useState, useEffect } from "react";
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
    ChevronDown,
    X,
    Bug,
    MessageSquarePlus,
    FlaskConical,
    Code2,
    Database,
    Layers,
    TrendingUp,
    Calendar,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface SubMenuItem {
    name: string;
    href: string;
    icon: any;
    feature: string;
}

interface NavItem {
    name: string;
    href?: string;
    icon: any;
    feature?: string;
    children?: SubMenuItem[];
}

const navigation: NavItem[] = [
    {
        name: "Overview",
        href: "/",
        icon: LayoutDashboard,
        feature: "overview",
    },
    {
        name: "TikTok",
        icon: Store,
        children: [
            { name: "TikTok Shops", href: "/tiktok-shops", icon: Store, feature: "tiktok" },
            { name: "TikTok Ads", href: "/ads", icon: Megaphone, feature: "ads" },
        ],
    },
    {
        name: "Shopee",
        icon: ShoppingBag,
        children: [
            { name: "Dashboard", href: "/shopee/dashboard", icon: LayoutDashboard, feature: "shopee" },
            { name: "Analytics", href: "/shopee/analytics", icon: BarChart3, feature: "shopee" },
            { name: "Shopee Shop", href: "/shopee", icon: ShoppingBag, feature: "shopee" },
            { name: "Shopee Ads", href: "/shopee-ads", icon: Megaphone, feature: "ads" },
        ],
    },
    {
        name: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        feature: "analytics",
    },
    {
        name: "Centralised Data",
        icon: Layers,
        children: [
            { name: "Reality Sales Department", href: "/centralised-data/reality-sales", icon: TrendingUp, feature: "reality_sales" },
            { name: "Event Analysis", href: "/centralised-data/event-analysis", icon: Calendar, feature: "event_analysis" },
        ],
    },
    {
        name: "Connected Systems",
        href: "/connected-systems",
        icon: Database,
        feature: "connected_systems",
    },
    {
        name: "Developer Tools",
        icon: Code2,
        children: [
            { name: "Debug Table", href: "/debug-table", icon: Bug, feature: "debug" },
            { name: "Debug (Ikram)", href: "/debug-table-ikram", icon: Bug, feature: "debug" },
            { name: "Refresh Token", href: "/refresh-token", icon: RefreshCw, feature: "refresh_token" },
            { name: "Test Field", href: "/test-field", icon: FlaskConical, feature: "test_field" },
        ],
    },
    {
        name: "Feedback",
        href: "/feedback",
        icon: MessageSquarePlus,
        feature: "feedback",
    },
    {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        feature: "settings",
    },
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
    const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

    const userRole = (session?.user as any)?.role;
    const allowedFeatures =
        (session?.user as { allowed_features?: string[] } | undefined)
            ?.allowed_features || ["overview", "tiktok", "shopee", "ads", "analytics", "connected_systems", "reality_sales", "event_analysis", "feedback", "test_field"];

    const isFeatureAllowed = (feature?: string) => {
        if (!feature) return true;
        if (feature === "feedback" || feature === "test_field" || feature === "connected_systems" || feature === "reality_sales" || feature === "event_analysis") return true;
        if (userRole === "admin") return true;
        return allowedFeatures.includes(feature);
    };

    const filteredNavigation = navigation
        .map((item) => {
            if (item.children) {
                const visibleChildren = item.children.filter((child) =>
                    isFeatureAllowed(child.feature)
                );
                if (visibleChildren.length === 0) return null;
                return { ...item, children: visibleChildren };
            }
            if (isFeatureAllowed(item.feature)) {
                return item;
            }
            return null;
        })
        .filter((item): item is NavItem => item !== null);

    const isItemActive = (href?: string) => {
        if (!href) return false;
        return href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(href + "/");
    };

    const hasActiveChild = (children?: SubMenuItem[]) => {
        if (!children) return false;
        return children.some((child) => isItemActive(child.href));
    };

    // Auto-open parent submenu if child is active
    useEffect(() => {
        filteredNavigation.forEach((item) => {
            if (item.children && hasActiveChild(item.children)) {
                setOpenSubmenus((prev) => ({ ...prev, [item.name]: true }));
            }
        });
    }, [pathname]);

    const toggleSubmenu = (name: string) => {
        setOpenSubmenus((prev) => ({
            ...prev,
            [name]: !prev[name],
        }));
    };

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
            <div className={cn("flex-1 py-3 scrollbar-thin", isCollapsed ? "overflow-visible" : "overflow-y-auto")}>
                <nav className="space-y-1 px-2">
                    {filteredNavigation.map((item) => {
                        const hasChildren = Boolean(item.children && item.children.length > 0);
                        const isChildActive = hasChildren && hasActiveChild(item.children);
                        const isOpen = Boolean(openSubmenus[item.name]);
                        const isActive = isItemActive(item.href);

                        // If parent item with submenus
                        if (hasChildren && item.children) {
                            if (isCollapsed) {
                                return (
                                    <div key={item.name} className="relative group">
                                        <button
                                            type="button"
                                            className={cn(
                                                "group flex items-center justify-center rounded-xl p-2.5 text-sm font-medium transition-all duration-200 w-full",
                                                isChildActive
                                                    ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]"
                                                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                            )}
                                            title={item.name}
                                        >
                                            <item.icon className={cn("h-5 w-5", isChildActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                            {isChildActive && (
                                                <span className="absolute right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                                            )}
                                        </button>

                                        {/* Hover Flyout for Submenus */}
                                        <div className="absolute left-full top-0 ml-2.5 z-50 min-w-48 rounded-xl border border-border/60 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150">
                                            <div className="px-2.5 py-1.5 text-xs font-semibold text-foreground/80 border-b border-border/30 mb-1 flex items-center gap-1.5">
                                                <item.icon className="h-3.5 w-3.5 text-primary" />
                                                <span>{item.name}</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {item.children.map((sub) => {
                                                    const isSubActive = isItemActive(sub.href);
                                                    return (
                                                        <Link
                                                            key={sub.name}
                                                            href={sub.href}
                                                            onClick={onCloseMobile}
                                                            className={cn(
                                                                "flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                                                                isSubActive
                                                                    ? "bg-primary/15 text-primary font-semibold"
                                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                            )}
                                                        >
                                                            <sub.icon className={cn("h-3.5 w-3.5 mr-2", isSubActive ? "text-primary" : "text-muted-foreground")} />
                                                            <span className="truncate">{sub.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Expanded mode accordion
                            return (
                                <div key={item.name} className="space-y-0.5">
                                    <button
                                        type="button"
                                        onClick={() => toggleSubmenu(item.name)}
                                        className={cn(
                                            "group flex items-center justify-between w-full rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                                            isChildActive
                                                ? "text-foreground font-semibold bg-muted/20"
                                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-center min-w-0">
                                            <item.icon
                                                className={cn(
                                                    "h-4 w-4 mr-3 flex-shrink-0 transition-colors",
                                                    isChildActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                                )}
                                            />
                                            <span className="truncate">{item.name}</span>
                                        </div>
                                        <ChevronDown
                                            className={cn(
                                                "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200",
                                                isOpen && "rotate-180 text-foreground"
                                            )}
                                        />
                                    </button>

                                    {/* Collapsible child list */}
                                    {isOpen && (
                                        <div className="ml-3.5 pl-3 border-l border-border/40 space-y-0.5 mt-0.5 mb-1.5">
                                            {item.children.map((sub) => {
                                                const isSubActive = isItemActive(sub.href);
                                                return (
                                                    <Link
                                                        key={sub.name}
                                                        href={sub.href}
                                                        onClick={onCloseMobile}
                                                        className={cn(
                                                            "group relative flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                                                            isSubActive
                                                                ? "bg-primary/12 text-primary font-semibold shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]"
                                                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                                        )}
                                                    >
                                                        {isSubActive && (
                                                            <span className="absolute -left-[13px] h-3.5 w-0.5 rounded-full bg-primary" />
                                                        )}
                                                        <sub.icon
                                                            className={cn(
                                                                "h-3.5 w-3.5 mr-2 flex-shrink-0",
                                                                isSubActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                                            )}
                                                        />
                                                        <span className="truncate">{sub.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Regular Single Navigation Item
                        if (isCollapsed) {
                            return (
                                <div key={item.name} className="relative group">
                                    <Link
                                        href={item.href!}
                                        onClick={onCloseMobile}
                                        className={cn(
                                            "group flex items-center justify-center rounded-xl p-2.5 text-sm font-medium transition-all duration-200 w-full",
                                            isActive
                                                ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]"
                                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon
                                            className={cn(
                                                "h-5 w-5",
                                                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                            )}
                                        />
                                        {isActive && (
                                            <span className="absolute right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                                        )}
                                    </Link>

                                    {/* Tooltip on hover */}
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 px-2.5 py-1 text-xs font-medium bg-popover text-popover-foreground border border-border/60 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                                        {item.name}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.name}
                                href={item.href!}
                                onClick={onCloseMobile}
                                className={cn(
                                    "group relative flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)] font-semibold"
                                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                )}
                            >
                                {isActive && (
                                    <span className="absolute left-1.5 h-5 w-0.5 rounded-full bg-primary" />
                                )}
                                <item.icon
                                    className={cn(
                                        "h-4 w-4 mr-3 flex-shrink-0 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                />
                                <span className="truncate">{item.name}</span>
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
