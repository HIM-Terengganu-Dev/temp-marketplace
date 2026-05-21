"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved === "true";
    }
    return false;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  // Close mobile menu on pathname changes (navigation)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMobileOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Hide layout for login and unauthorized routes
  const isAuthRoute = pathname === "/login" || pathname === "/unauthorized";

  if (isAuthRoute) {
    return <div className="min-h-screen w-full relative">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        onToggleCollapse={handleToggleCollapse} 
        className="hidden md:flex flex-shrink-0"
      />

      {/* Mobile Drawer Sidebar */}
      {isMobileOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer container */}
          <div className="fixed inset-y-0 left-0 w-64 z-50 md:hidden flex flex-col bg-background border-r border-border shadow-2xl animate-slide-in-left">
            <Sidebar 
              isCollapsed={false} 
              isMobile={true}
              onCloseMobile={() => setIsMobileOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col overflow-y-auto relative min-w-0">
        <Header onMenuClick={() => setIsMobileOpen(true)} />
        <main className="p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex-1">
          {children}
        </main>
      </div>

      <style jsx global>{`
        @keyframes slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
