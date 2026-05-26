"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Read sidebar collapse preference on client mount
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  // Close mobile drawer on route changes
  useEffect(() => {
    const timer = setTimeout(() => setIsMobileOpen(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Hide app chrome on auth routes
  const isAuthRoute = pathname === "/login" || pathname === "/unauthorized";
  if (isAuthRoute) {
    return <div className="min-h-dvh w-full relative">{children}</div>;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">

      {/* ── Desktop: Collapsible Left Sidebar ───────────────────────────── */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        className="hidden md:flex flex-shrink-0"
      />

      {/* ── Mobile: Slide-in Drawer (triggered from Header hamburger) ────── */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden flex flex-col bg-background border-r border-border/40 shadow-2xl animate-slide-in-left">
            <Sidebar
              isCollapsed={false}
              isMobile={true}
              onCloseMobile={() => setIsMobileOpen(false)}
            />
          </div>
        </>
      )}

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto relative min-w-0">
        <Header onMenuClick={() => setIsMobileOpen(true)} />

        {/* 
          Page content:
          - Mobile: 16px padding, extra bottom padding for the bottom nav bar
          - Tablet+: 24px padding
          - Desktop: 32px padding
        */}
        <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex-1 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile: Bottom Navigation Bar ───────────────────────────────── */}
      <MobileBottomNav pathname={pathname} />
    </div>
  );
}

// ── Bottom Nav component (mobile only) ──────────────────────────────────────
import Link from "next/link";
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Megaphone,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

function MobileBottomNav({ pathname }: { pathname: string }) {
  const { data: session } = useSession();
  const allowedFeatures =
    (session?.user as { allowed_features?: string[] } | undefined)
      ?.allowed_features || ["overview", "tiktok", "shopee", "ads", "analytics"];

  const navItems = [
    { href: "/",             icon: LayoutDashboard, label: "Overview",  feature: "overview" },
    { href: "/tiktok-shops", icon: Store,            label: "TikTok",   feature: "tiktok"   },
    { href: "/shopee",       icon: ShoppingBag,      label: "Shopee",   feature: "shopee"   },
    { href: "/ads",          icon: Megaphone,        label: "Ads",      feature: "ads"      },
    { href: "/settings",     icon: Settings,         label: "Settings", feature: "settings" },
  ].filter(item => allowedFeatures.includes(item.feature));

  // Limit to 5 items for the bottom bar
  const visibleItems = navItems.slice(0, 5);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 md:hidden",
        "bg-background/95 backdrop-blur-xl",
        "border-t border-border/50",
        "shadow-[0_-4px_24px_rgba(0,0,0,0.25)]",
        "bottom-safe" // safe-area aware
      )}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl",
                "transition-all duration-200 ease-in-out",
                "min-w-0 px-1 py-2",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/15 shadow-[0_0_12px_rgba(var(--primary),0.3)]"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[9px] font-semibold tracking-wide leading-none transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
