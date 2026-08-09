"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { DatePreset } from "@/components/dashboard/SimpleDatePicker";
import { AnalyticsShell } from "@/components/analytics/AnalyticsShell";

// Code splitting: dynamically import tabs so inactive tab code isn't parsed on initial load
const FunnelOverviewTab = dynamic(() => import("@/components/analytics/FunnelOverviewTab"), {
    ssr: false,
    loading: () => (
        <div className="h-64 flex flex-col items-center justify-center bg-card/10 backdrop-blur-md rounded-2xl border border-border/20 text-muted-foreground gap-3">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs font-semibold uppercase tracking-wider">Loading Funnel Overview...</p>
        </div>
    )
});

const MtdReportTab = dynamic(() => import("@/components/analytics/MtdReportTab"), {
    ssr: false,
    loading: () => (
        <div className="h-64 flex flex-col items-center justify-center bg-card/10 backdrop-blur-md rounded-2xl border border-border/20 text-muted-foreground gap-3">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs font-semibold uppercase tracking-wider">Loading MTD Performance Report...</p>
        </div>
    )
});

/** Returns today's date string YYYY-MM-DD in Asia/Kuala_Lumpur timezone */
function todayKL(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

/** Returns date string YYYY-MM-DD for N days ago in Asia/Kuala_Lumpur timezone */
function daysAgoKL(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

/** Returns 1st day of current month YYYY-MM-01 in Asia/Kuala_Lumpur timezone */
function startOfCurrentMonthKL(): string {
    const today = todayKL();
    const [y, m] = today.split('-');
    return `${y}-${m}-01`;
}

export default function AnalyticsPage() {
    useSession();

    // Tab switcher state
    const [currentTab, setCurrentTab] = useState<"funnel" | "mtd">("funnel");

    // Toolbar / Date states (Funnel Overview)
    const [activePreset, setActivePreset] = useState<DatePreset>("monthly");
    const [startDate, setStartDate] = useState(() => startOfCurrentMonthKL());
    const [endDate, setEndDate] = useState(todayKL());
    const [companyFilter, setCompanyFilter] = useState<"ALL" | "HIMWELLNESS" | "WEROCA">("ALL");
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    // MTD States
    const [targetMonth, setTargetMonth] = useState(() => {
        const today = todayKL();
        const [y, m] = today.split('-');
        return `${y}-${m}`;
    });

    const monthOptions = (() => {
        const startYear = 2025;
        const startMonth = 12;
        const today = todayKL();
        const [curYStr, curMStr] = today.split('-');
        const currentYear = parseInt(curYStr, 10) || 2026;
        const currentMonth = parseInt(curMStr, 10) || 7;

        const options = [];
        let yIter = startYear;
        let mIter = startMonth;
        const monthLabels = ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGS', 'SEP', 'OKT', 'NOV', 'DEC'];

        while (yIter < currentYear || (yIter === currentYear && mIter <= currentMonth)) {
            const val = `${yIter}-${String(mIter).padStart(2, '0')}`;
            const label = `${monthLabels[mIter - 1]} ${yIter}`;
            options.push({ val, label });
            mIter++;
            if (mIter > 12) {
                mIter = 1;
                yIter++;
            }
        }
        return options;
    })();

    const [dayRangeEnd, setDayRangeEnd] = useState(() => {
        const today = todayKL();
        return parseInt(today.split('-')[2], 10) || 10;
    });

    const [monthlyTarget, setMonthlyTarget] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mtd_monthly_target');
            return saved ? Number(saved) : 4000000;
        }
        return 4000000;
    });

    const [tiktokTargetVal, setTiktokTargetVal] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedVal = localStorage.getItem('mtd_tiktok_target_val');
            if (savedVal) return Number(savedVal);
            
            const savedPct = localStorage.getItem('mtd_tiktok_target_pct');
            if (savedPct) {
                const pct = Number(savedPct);
                const target = localStorage.getItem('mtd_monthly_target') ? Number(localStorage.getItem('mtd_monthly_target')) : 4000000;
                return target * (pct / 100);
            }
            return 3000000;
        }
        return 3000000;
    });

    const [mtdCompany, setMtdCompany] = useState<'ALL' | 'HIMWELLNESS' | 'WEROCA'>('ALL');
    const [mtdData, setMtdData] = useState<any>(null);
    const [isMtdLoading, setIsMtdLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mtdError, setMtdError] = useState<string | null>(null);

    // Refresh triggers
    const [reloadKey, setReloadKey] = useState(0);
    const [reloadMtdKey, setReloadMtdKey] = useState(0);

    // Load Funnel Overview Data
    useEffect(() => {
        let isMounted = true;
        const loadAnalyticsData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/analytics?startDate=${startDate}&endDate=${endDate}&companyFilter=${companyFilter}`);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const msg = errData.error || (
                        response.status === 401 
                            ? "Unauthorized: Please sign in to access analytics." 
                            : response.status === 403 
                                ? "Forbidden: Access denied to selected metrics." 
                                : `Failed to fetch analytics data (HTTP ${response.status})`
                    );
                    if (isMounted) setError(msg);
                    return;
                }
                const result = await response.json();
                if (isMounted) {
                    setData(result);
                }
            } catch (err: any) {
                console.error("Error loading analytics data:", err);
                if (isMounted) {
                    setError(err.message || "Failed to fetch analytics data");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadAnalyticsData();
        return () => {
            isMounted = false;
        };
    }, [startDate, endDate, companyFilter, reloadKey]);

    // Load MTD Data
    useEffect(() => {
        if (currentTab !== "mtd") return;
        let isMounted = true;
        const loadMtdData = async () => {
            setIsMtdLoading(true);
            setMtdError(null);
            try {
                const response = await fetch(`/api/analytics/mtd-report?targetMonth=${targetMonth}&dayRangeEnd=${dayRangeEnd}&companyFilter=${mtdCompany}`);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const msg = errData.error || (
                        response.status === 401 
                            ? "Unauthorized: Please sign in to access MTD report." 
                            : response.status === 403 
                                ? "Forbidden: Access denied to selected MTD metrics." 
                                : `Failed to fetch MTD report data (HTTP ${response.status})`
                    );
                    if (isMounted) setMtdError(msg);
                    return;
                }
                const result = await response.json();
                if (isMounted) {
                    setMtdData(result);
                }
            } catch (err: any) {
                console.error("Error loading MTD report data:", err);
                if (isMounted) {
                    setMtdError(err.message || "Failed to fetch MTD report data");
                }
            } finally {
                if (isMounted) {
                    setIsMtdLoading(false);
                }
            }
        };

        loadMtdData();
        return () => {
            isMounted = false;
        };
    }, [currentTab, targetMonth, dayRangeEnd, mtdCompany, reloadMtdKey]);

    return (
        <AnalyticsShell currentTab={currentTab} onTabChange={setCurrentTab}>
            {currentTab === "funnel" ? (
                <FunnelOverviewTab
                    data={data}
                    isLoading={isLoading}
                    error={error}
                    onRetry={() => setReloadKey(prev => prev + 1)}
                    companyFilter={companyFilter}
                    setCompanyFilter={setCompanyFilter}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    activePreset={activePreset}
                    setActivePreset={setActivePreset}
                />
            ) : (
                <MtdReportTab
                    targetMonth={targetMonth}
                    setTargetMonth={setTargetMonth}
                    monthOptions={monthOptions}
                    dayRangeEnd={dayRangeEnd}
                    setDayRangeEnd={setDayRangeEnd}
                    monthlyTarget={monthlyTarget}
                    setMonthlyTarget={setMonthlyTarget}
                    tiktokTargetVal={tiktokTargetVal}
                    setTiktokTargetVal={setTiktokTargetVal}
                    mtdCompany={mtdCompany}
                    setMtdCompany={setMtdCompany}
                    mtdData={mtdData}
                    isMtdLoading={isMtdLoading}
                    mtdError={mtdError}
                    onRetry={() => setReloadMtdKey(prev => prev + 1)}
                />
            )}
            <p className="text-[11px] text-muted-foreground/80 mt-4 leading-normal">
                * MTD data sourced from live database (credentials.daily_shopee_metrics + credentials.daily_shop_metrics).
            </p>
        </AnalyticsShell>
    );
}
