"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    TrendingUp,
    Megaphone,
    Radio,
    Share2,
    Boxes,
    Calendar,
    RefreshCw,
    Loader2,
    LayoutDashboard,
    AlertCircle,
    ArrowUpRight,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import MarketingDepartmentSection from "@/components/reality-sales/MarketingDepartmentSection";
import LivehostDepartmentSection from "@/components/reality-sales/LivehostDepartmentSection";
import AffiliateDepartmentSection from "@/components/reality-sales/AffiliateDepartmentSection";
import StockInventorySection from "@/components/reality-sales/StockInventorySection";
import EditDepartmentTargetModal from "@/components/reality-sales/EditDepartmentTargetModal";
import DepartmentAlert from "@/components/reality-sales/DepartmentAlert";

type DepartmentTab = "overview" | "marketing" | "livehost" | "affiliate" | "stock";

function getMonthKL(): string {
    const todayKL = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    const [y, m] = todayKL.split("-");
    return `${y}-${m}`;
}

export default function RealitySalesDepartmentPage() {
    const { data: session } = useSession();
    const userRole = ((session?.user as any)?.role || "").toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "super_admin";

    // Date state
    const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthKL());
    const [activeTab, setActiveTab] = useState<DepartmentTab>("overview");

    // Data state
    const [loading, setLoading] = useState(true);
    const [pageData, setPageData] = useState<any>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Target modal state
    const [targetModalOpen, setTargetModalOpen] = useState(false);
    const [targetModalDept, setTargetModalDept] = useState<"marketing" | "livehost" | "affiliate">("marketing");
    const [targetModalLabel, setTargetModalLabel] = useState("Marketing");
    const [targetModalCurrent, setTargetModalCurrent] = useState(0);

    const openTargetModal = (dept: "marketing" | "livehost" | "affiliate", label: string, currentVal: number) => {
        setTargetModalDept(dept);
        setTargetModalLabel(label);
        setTargetModalCurrent(currentVal);
        setTargetModalOpen(true);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await fetch(`/api/reality-sales?month=${selectedMonth}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to load reality sales data");
            }
            setPageData(data);
        } catch (err: any) {
            console.error("[reality-sales-page] Error loading data:", err);
            setFetchError(err.message || "Failed to load reality sales data");
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Compute month navigation helpers
    const changeMonth = (offset: number) => {
        const [yearStr, monthStr] = selectedMonth.split("-");
        let year = parseInt(yearStr, 10);
        let month = parseInt(monthStr, 10) + offset;
        if (month > 12) {
            month = 1;
            year += 1;
        } else if (month < 1) {
            month = 12;
            year -= 1;
        }
        setSelectedMonth(`${year}-${String(month).padStart(2, "0")}`);
    };

    const marketingData = pageData?.marketing;
    const livehostData = pageData?.livehost;
    const affiliateData = pageData?.affiliate;
    const stockData = pageData?.stock;

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0 p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-purple-400 to-indigo-500 bg-clip-text text-transparent">
                            Reality Sales Department
                        </h1>
                        {isAdmin && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 uppercase">
                                Admin Mode
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Centralised multi-department command center: Marketing, Live Host, Affiliate, and Stock Inventory.
                    </p>
                </div>

                {/* Month Navigator & Refresh */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="flex items-center rounded-lg border border-border/60 bg-card p-1 shadow-xs">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => changeMonth(-1)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="Previous Month"
                        >
                            &larr; Prev
                        </Button>
                        <div className="flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span>{selectedMonth}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => changeMonth(1)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="Next Month"
                        >
                            Next &rarr;
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                        className="h-9 gap-1.5 text-xs border-border/60 shadow-xs"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Department Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border/40">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                        activeTab === "overview"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Overview</span>
                </button>

                <button
                    onClick={() => setActiveTab("marketing")}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                        activeTab === "marketing"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                    <Megaphone className="h-4 w-4" />
                    <span>1. Marketing</span>
                    {marketingData && !marketingData.hasData && (
                        <span className="h-2 w-2 rounded-full bg-amber-500" title="No data alert" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("livehost")}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                        activeTab === "livehost"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                    <Radio className="h-4 w-4" />
                    <span>2. Live Host</span>
                </button>

                <button
                    onClick={() => setActiveTab("affiliate")}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                        activeTab === "affiliate"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                    <Share2 className="h-4 w-4" />
                    <span>3. Affiliate</span>
                </button>

                <button
                    onClick={() => setActiveTab("stock")}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                        activeTab === "stock"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                    <Boxes className="h-4 w-4" />
                    <span>4. Stock & Inventory</span>
                </button>
            </div>

            {/* Global Error Banner */}
            {fetchError && (
                <DepartmentAlert
                    title="System Error"
                    type="error"
                    message={fetchError}
                    onRetry={fetchData}
                />
            )}

            {/* Loading Indicator */}
            {loading && !pageData ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs font-medium">Reconciling reality sales data across 4 departments...</p>
                </div>
            ) : pageData ? (
                <div>
                    {/* TAB: Overview */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* 1. Marketing Card */}
                                <Card
                                    onClick={() => setActiveTab("marketing")}
                                    className="cursor-pointer border-border/60 hover:border-primary/50 transition-all hover:shadow-md group"
                                >
                                    <CardHeader className="p-4 pb-2 border-b border-border/40">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                    <Megaphone className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-sm">Marketing</span>
                                            </div>
                                            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-2">
                                        <div className="text-xl font-extrabold text-foreground">
                                            RM {(marketingData?.totalSales || 0).toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Target: RM {(marketingData?.targetAmount || 0).toLocaleString("en-MY", { maximumFractionDigits: 0 })}</span>
                                            <span className="font-bold text-primary">{marketingData?.attainmentRate?.toFixed(1) || 0}%</span>
                                        </div>
                                        {marketingData && !marketingData.hasData && (
                                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 w-full justify-center">
                                                No Data Found
                                            </Badge>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* 2. Live Host Card */}
                                <Card
                                    onClick={() => setActiveTab("livehost")}
                                    className="cursor-pointer border-border/60 hover:border-primary/50 transition-all hover:shadow-md group"
                                >
                                    <CardHeader className="p-4 pb-2 border-b border-border/40">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                                                    <Radio className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-sm">Live Host</span>
                                            </div>
                                            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-2">
                                        <div className="text-xl font-extrabold text-foreground">
                                            RM {(livehostData?.totalGmv || 0).toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Target: RM {(livehostData?.targetAmount || 0).toLocaleString("en-MY", { maximumFractionDigits: 0 })}</span>
                                            <span className="font-bold text-blue-500">{livehostData?.attainmentRate?.toFixed(1) || 0}%</span>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {livehostData?.totalSessions || 0} sessions • {(livehostData?.totalHours || 0).toFixed(1)} hrs
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* 3. Affiliate Card */}
                                <Card
                                    onClick={() => setActiveTab("affiliate")}
                                    className="cursor-pointer border-border/60 hover:border-primary/50 transition-all hover:shadow-md group"
                                >
                                    <CardHeader className="p-4 pb-2 border-b border-border/40">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                                                    <Share2 className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-sm">Affiliate</span>
                                            </div>
                                            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-2">
                                        <div className="text-xl font-extrabold text-foreground">
                                            RM {(affiliateData?.totalGmv || 0).toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Target: RM {(affiliateData?.targetAmount || 0).toLocaleString("en-MY", { maximumFractionDigits: 0 })}</span>
                                            <span className="font-bold text-emerald-500">{affiliateData?.attainmentRate?.toFixed(1) || 0}%</span>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            External: Shopee & TikTok Shop
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* 4. Stock Inventory Card */}
                                <Card
                                    onClick={() => setActiveTab("stock")}
                                    className="cursor-pointer border-border/60 hover:border-primary/50 transition-all hover:shadow-md group"
                                >
                                    <CardHeader className="p-4 pb-2 border-b border-border/40">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                                                    <Boxes className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-sm">Stock Inventory</span>
                                            </div>
                                            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-2">
                                        <div className="text-xl font-extrabold text-foreground">
                                            {(stockData?.cogsOverview?.totalOrdersCount || 0).toLocaleString()} Orders
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{(stockData?.cogsOverview?.totalSkus || 0)} Total SKUs</span>
                                            <span className="font-bold text-purple-500">
                                                {(stockData?.cogsOverview?.singleWithCost || 0) + (stockData?.cogsOverview?.comboWithCost || 0)} Costed
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {(stockData?.cogsOverview?.totalUnitsSold || 0).toLocaleString()} units shipped
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed previews */}
                            <div className="space-y-4">
                                <MarketingDepartmentSection
                                    data={marketingData}
                                    month={selectedMonth}
                                    isAdmin={isAdmin}
                                    onEditTarget={() => openTargetModal("marketing", "Marketing", marketingData?.targetAmount || 0)}
                                    onRetry={fetchData}
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB: Marketing */}
                    {activeTab === "marketing" && (
                        <MarketingDepartmentSection
                            data={marketingData}
                            month={selectedMonth}
                            isAdmin={isAdmin}
                            onEditTarget={() => openTargetModal("marketing", "Marketing", marketingData?.targetAmount || 0)}
                            onRetry={fetchData}
                        />
                    )}

                    {/* TAB: Live Host */}
                    {activeTab === "livehost" && (
                        <LivehostDepartmentSection
                            data={livehostData}
                            month={selectedMonth}
                            isAdmin={isAdmin}
                            onEditTarget={() => openTargetModal("livehost", "Live Host", livehostData?.targetAmount || 0)}
                            onRetry={fetchData}
                        />
                    )}

                    {/* TAB: Affiliate */}
                    {activeTab === "affiliate" && (
                        <AffiliateDepartmentSection
                            data={affiliateData}
                            month={selectedMonth}
                            isAdmin={isAdmin}
                            onEditTarget={() => openTargetModal("affiliate", "Affiliate", affiliateData?.targetAmount || 0)}
                            onRetry={fetchData}
                        />
                    )}

                    {/* TAB: Stock Inventory */}
                    {activeTab === "stock" && (
                        <StockInventorySection
                            data={stockData}
                            onRetry={fetchData}
                        />
                    )}
                </div>
            ) : null}

            {/* Target Modal for Admin */}
            {isAdmin && (
                <EditDepartmentTargetModal
                    isOpen={targetModalOpen}
                    onClose={() => setTargetModalOpen(false)}
                    onSaved={fetchData}
                    department={targetModalDept}
                    departmentLabel={targetModalLabel}
                    month={selectedMonth}
                    currentTarget={targetModalCurrent}
                />
            )}

            <p className="text-[11px] text-muted-foreground/80 mt-6 leading-normal border-t border-border/40 pt-4">
                * Centralised reality data reconciled from Marketing & Video Tracking (hw-marketing-tracking), Livehost Management (hw-livehost-management), Affiliate Management (hw-affiliate-management), Stock Inventory (hw-stock-inventory), and local credentials.department_targets.
            </p>
        </div>
    );
}
