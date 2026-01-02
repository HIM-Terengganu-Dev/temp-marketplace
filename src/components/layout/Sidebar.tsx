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
} from "lucide-react";

const navigation = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "TikTok Shops", href: "/tiktok-shops", icon: Store },
    { name: "Shopee Shop", href: "/shopee", icon: ShoppingBag },
    { name: "Ad Accounts", href: "/ads", icon: Megaphone },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Debug Table", href: "/debug-table", icon: BarChart3 }, // Temporary Debug Link
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden border-r border-border/40 bg-sidebar/50 backdrop-blur-xl md:flex md:w-64 md:flex-col">
            <div className="flex h-16 items-center border-b border-border/40 px-6">
                <div className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    HIM Tracking
                </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-border/40 p-4">
                <div className="rounded-lg bg-card/50 p-4 backdrop-blur-sm border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <div className="mt-2 flex items-center text-sm font-semibold text-green-500">
                        <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        System Operational
                    </div>
                </div>
            </div>
        </div>
    );
}
