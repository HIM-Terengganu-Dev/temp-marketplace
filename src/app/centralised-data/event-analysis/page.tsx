"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    Sparkles,
    DollarSign,
    Target,
    Layers,
    ShoppingBag,
    Boxes,
    Receipt,
    Wallet,
    Award,
    TrendingUp,
    RefreshCw,
    Plus,
    Edit3,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    HelpCircle,
    Percent
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreateEditEventModal from "@/components/events/CreateEditEventModal";
import EventCompareView from "@/components/events/EventCompareView";
import CustomCostsCard from "@/components/events/CustomCostsCard";
import WinningSkusCard from "@/components/events/WinningSkusCard";
import DepartmentTelemetryCard from "@/components/events/DepartmentTelemetryCard";
import CustomerRetentionCard from "@/components/events/CustomerRetentionCard";
import ProfitWaterfallCard from "@/components/events/ProfitWaterfallCard";

import {
    CampaignEvent,
    EventAnalysisMetrics,
} from "@/types/events";

interface SourceInfo {
    label: string;
    source: string;
    dates: string;
}

/** Hover tooltip (shown when hovering the parent `group` card) listing data sources + data dates. */
function SourceTip({ items }: { items: SourceInfo[] }) {
    return (
        <div
            role="tooltip"
            className="pointer-events-none absolute right-3 top-10 z-50 w-80 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0"
        >
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Data source &amp; date
            </div>
            <ul className="space-y-2">
                {items.map((it, i) => (
                    <li key={i} className="text-[11px] leading-snug normal-case tracking-normal">
                        <div className="font-semibold text-foreground">{it.label}</div>
                        <div className="font-mono text-muted-foreground break-words">{it.source}</div>
                        <div className="text-sky-400">Date: {it.dates}</div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function buildSourceTips(
    selectedEvent: CampaignEvent,
    metrics: EventAnalysisMetrics
) {
    const range = `${selectedEvent.startDate} → ${selectedEvent.endDate}`;
    const stockSrc = "Stock system – marketplace orders";
    const tips = {
        sales: [
            { label: "Store sales", source: "Shopee & TikTok daily store sales (our system)", dates: range },
            { label: "Depts", source: "Marketing videos + Live sessions + Affiliate reports", dates: range },
        ],
        target: [{ label: "Campaign target", source: "Entered manually in the campaign setup", dates: range }],
        orders: [
            { label: "Total orders", source: stockSrc, dates: range },
            { label: "Backup if stock has none", source: "Shopee & TikTok daily store orders", dates: range },
        ],
        spend: [
            { label: "Ad spend", source: "Shopee & TikTok daily ad spend (our system)", dates: range },
            { label: "Extra ad cost", source: "Entered manually in the campaign setup", dates: range },
        ],
        cogs: [
            { label: "Units sold", source: stockSrc, dates: range },
            { label: "Cost per unit", source: "Stock system – SKU cost list (latest cost)", dates: "Latest, not by sale date" },
        ],
        platform: [{ label: "Platform fee", source: `Calculated: Sales × ${metrics.platformCostRate}%`, dates: range }],
        custom: [{ label: "Custom costs", source: "Entered manually in the campaign setup", dates: range }],
        sku: [{ label: "Top 20 SKUs by units sold", source: stockSrc, dates: range }],
        profit: [{ label: "Net profit", source: "Calculated: Sales − Ads − COGS − Platform − Custom", dates: range }],
    };
    return tips;

}

export default function EventAnalysisPage() {
    const [events, setEvents] = useState<CampaignEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [mode, setMode] = useState<"analysis" | "compare">("analysis");
    const [metrics, setMetrics] = useState<EventAnalysisMetrics | null>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<CampaignEvent | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchEventData = useCallback(async (evtId?: string, isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const url = evtId
                ? `/api/centralised-data/events?eventId=${encodeURIComponent(evtId)}`
                : `/api/centralised-data/events`;
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json();

            if (json.success) {
                setEvents(json.events || []);
                const current = json.selectedEvent || (json.events?.length > 0 ? json.events[0] : null);
                if (current) {
                    setSelectedEventId(current.id);
                }
                setMetrics(json.metrics || null);
            } else {
                setError(json.error || "Failed to load event analysis data");
            }
        } catch (err: any) {
            setError(err.message || "Network error loading events");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchEventData();
    }, [fetchEventData]);

    const handleSelectEvent = (id: string) => {
        if (id === selectedEventId) return;
        setSelectedEventId(id);
        fetchEventData(id, true);
    };

    const handleOpenCreate = () => {
        setEventToEdit(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (evt: CampaignEvent) => {
        setEventToEdit(evt);
        setModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete campaign event "${name}"?`)) {
            return;
        }

        setDeletingId(id);
        try {
            const res = await fetch(`/api/centralised-data/events?id=${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const remaining = events.filter((e) => e.id !== id);
                setEvents(remaining);
                if (selectedEventId === id) {
                    const nextId = remaining.length > 0 ? remaining[0].id : "";
                    setSelectedEventId(nextId);
                    if (nextId) fetchEventData(nextId, true);
                    else setMetrics(null);
                }
            } else {
                alert(data.error || "Failed to delete event");
            }
        } catch (err: any) {
            alert(err.message || "Error deleting event");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSavedEvent = (saved: CampaignEvent) => {
        fetchEventData(saved.id, true);
    };

    const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

    const formatCurrency = (val?: number) => {
        if (typeof val !== "number") return "RM 0.00";
        return new Intl.NumberFormat("en-MY", {
            style: "currency",
            currency: "MYR",
            minimumFractionDigits: 2,
        }).format(val);
    };

    const topWinningSku = metrics?.winningSkus && metrics.winningSkus.length > 0
        ? metrics.winningSkus[0]
        : null;

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0 p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-xs">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-500 bg-clip-text text-transparent">
                            Campaign Event Analysis
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Comparative campaign evaluation, multi-department telemetry reconciliation & net event profitability engine.
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchEventData(selectedEventId, true)}
                        disabled={refreshing || loading}
                        className="h-8 gap-1.5 text-xs shadow-xs border-border/60"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
                        <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                    </Button>

                    <Button
                        size="sm"
                        onClick={handleOpenCreate}
                        className="h-8 gap-1.5 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create Event</span>
                    </Button>
                </div>
            </div>

            {/* Error Notification Banner */}
            {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchEventData(selectedEventId, true)}
                        className="h-7 text-xs border-destructive/30 hover:bg-destructive/20"
                    >
                        Retry
                    </Button>
                </div>
            )}

            {/* Mode toggle */}
            <div className="inline-flex rounded-lg border border-border/60 bg-card p-1 text-xs font-semibold">
                {(["analysis", "compare"] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-4 py-1.5 rounded-md transition ${
                            mode === m ? "bg-purple-600 text-white shadow" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {m === "analysis" ? "Analysis" : "Compare Events"}
                    </button>
                ))}
            </div>

            {mode === "compare" ? (
                <EventCompareView events={events} initialA={selectedEventId} />
            ) : (
            <>
            {/* Event Selector Strip / Cards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                        <span>Campaign Events ({events.length})</span>
                    </h2>
                    {events.length > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                            Click an event to view full 8-metric analysis
                        </span>
                    )}
                </div>

                {events.length === 0 && !loading ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border/60 bg-muted/10 space-y-3">
                        <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
                        <h3 className="text-sm font-bold text-foreground">No Campaign Events Created Yet</h3>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Create your first campaign event with a date range, target, and platform channels to start analyzing multi-department sales, ad spend, COGS, and profit.
                        </p>
                        <Button
                            size="sm"
                            onClick={handleOpenCreate}
                            className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Create Campaign Event</span>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {events.map((e) => {
                            const isSelected = selectedEventId === e.id;
                            const platformBadge =
                                e.platform === "tiktok"
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                    : e.platform === "shopee"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";

                            const platformLabel =
                                e.platform === "tiktok"
                                    ? "TikTok Only"
                                    : e.platform === "shopee"
                                    ? "Shopee Only"
                                    : "Combined";

                            return (
                                <div
                                    key={e.id}
                                    onClick={() => handleSelectEvent(e.id)}
                                    className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative group flex flex-col justify-between ${
                                        isSelected
                                            ? "border-purple-500 bg-purple-500/10 shadow-md ring-1 ring-purple-500/40"
                                            : "border-border/60 bg-card/60 hover:border-border hover:bg-card/90 shadow-xs"
                                    }`}
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${platformBadge}`}>
                                                {platformLabel}
                                            </Badge>
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                {e.startDate} &rarr; {e.endDate}
                                            </span>
                                        </div>

                                        <div className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 group-hover:text-purple-400 transition-colors">
                                            {e.name}
                                        </div>

                                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                                            <span className="text-[11px] text-muted-foreground">Target:</span>
                                            <span className="font-mono font-bold text-foreground">
                                                {formatCurrency(e.targetAmount)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>Platform Fee:</span>
                                            <span className="font-mono font-semibold text-sky-400">
                                                {e.platformCostRate ?? 25}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action buttons on card hover */}
                                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-border/30">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                handleOpenEdit(e);
                                            }}
                                            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                        >
                                            <Edit3 className="h-3 w-3" />
                                            <span>Edit</span>
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={deletingId === e.id}
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                handleDelete(e.id, e.name);
                                            }}
                                            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            <span>Delete</span>
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selected Event Detail & Telemetry */}
            {loading && !metrics ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                    <p className="text-xs font-semibold">
                        Reconciling live sales, ad cost, orders, winning SKUs, COGS, and profit...
                    </p>
                </div>
            ) : selectedEvent && metrics ? (
                <div className="space-y-6">
                    {/* Active Event Hero Bar */}
                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                                    {selectedEvent.name}
                                </h2>
                                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                                    {selectedEvent.platform === "combine"
                                        ? "Combined (Shopee & TikTok)"
                                        : selectedEvent.platform === "tiktok"
                                        ? "TikTok Only"
                                        : "Shopee Only"}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                                    {selectedEvent.startDate} &mdash; {selectedEvent.endDate}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-mono text-sky-400 border-sky-500/30 bg-sky-500/10">
                                    Platform Fee: {selectedEvent.platformCostRate ?? 25}%
                                </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>Active Departments:</span>
                                {selectedEvent.departments.map((d) => (
                                    <span
                                        key={d}
                                        className="bg-muted px-2 py-0.5 rounded text-[10px] font-medium text-foreground uppercase tracking-wider"
                                    >
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(selectedEvent)}
                                className="h-8 gap-1.5 text-xs border-border/60"
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit Campaign</span>
                            </Button>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* PRIMARY EXECUTIVE METRIC CARDS                            */}
                    {/* 1. sales, 2. target, 3. total order, 4. spend,            */}
                    {/* 5. total COGS, 6. platform cost, 7. custom cost,          */}
                    {/* 8. winning skus, 9. Net Profit                             */}
                    {/* ========================================================= */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* 1. SALES */}
                        <Card className="border-border/60 bg-card/70 shadow-xs relative group hover:border-primary/50 transition-all">
                            <SourceTip items={buildSourceTips(selectedEvent, metrics).sales} />
                            <CardHeader className="p-4 pb-1">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    <span>1. Total Sales (GMV)</span>
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-1">
                                <div className="text-2xl font-black font-mono text-foreground">
                                    {formatCurrency(metrics.sales)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>Store: {formatCurrency(metrics.storeSales)}</span>
                                    <span>Depts: {formatCurrency(metrics.departmentSales)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. TARGET */}
                        <Card className="border-border/60 bg-card/70 shadow-xs relative group hover:border-blue-500/50 transition-all">
                            <SourceTip items={buildSourceTips(selectedEvent, metrics).target} />
                            <CardHeader className="p-4 pb-1">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    <span>2. Campaign Target</span>
                                    <Target className="h-4 w-4 text-blue-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-1.5">
                                <div className="flex items-baseline justify-between">
                                    <div className="text-2xl font-black font-mono text-foreground">
                                        {formatCurrency(metrics.target)}
                                    </div>
                                    <span className="font-bold text-xs font-mono text-blue-400">
                                        {metrics.targetAttainment.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            metrics.targetAttainment >= 100
                                                ? "bg-emerald-500"
                                                : "bg-blue-500"
                                        }`}
                                        style={{ width: `${Math.min(100, metrics.targetAttainment)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Variance: {metrics.targetVariance >= 0 ? "+" : ""}
                                    {formatCurrency(metrics.targetVariance)}
                                </p>
                            </CardContent>
                        </Card>

                        {/* 3. TOTAL ORDER */}
                        <Card className="border-border/60 bg-card/70 shadow-xs relative group hover:border-sky-500/50 transition-all">
                            <SourceTip items={buildSourceTips(selectedEvent, metrics).orders} />
                            <CardHeader className="p-4 pb-1">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    <span>3. Total Orders</span>
                                    <ShoppingBag className="h-4 w-4 text-sky-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-1">
                                <div className="text-2xl font-black font-mono text-sky-400">
                                    {metrics.totalOrders.toLocaleString()}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>AOV: <strong className="text-foreground">{formatCurrency(metrics.aov)}</strong></span>
                                    <span>Across marketplace</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 4. SPEND (FROM THIS SYSTEM AD COST) */}
                        <Card className="border-border/60 bg-card/70 shadow-xs relative group hover:border-red-500/50 transition-all">
                            <SourceTip items={buildSourceTips(selectedEvent, metrics).spend} />
                            <CardHeader className="p-4 pb-1">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    <span>4. Ad Spend</span>
                                    <DollarSign className="h-4 w-4 text-red-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-1">
                                <div className="text-2xl font-black font-mono text-red-400">
                                    {formatCurrency(metrics.spend)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>ROAS: <strong className="text-foreground">{metrics.roas.toFixed(2)}x</strong></span>
                                    <span>From this system metrics</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 5. TOTAL COGS */}
                        <Card className="border-border/60 bg-card/70 shadow-xs relative group hover:border-amber-500/50 transition-all">
                            <SourceTip items={buildSourceTips(selectedEvent, metrics).cogs} />
                            <CardHeader className="p-4 pb-1">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    <span>5. Total COGS</span>
                                    <Boxes className="h-4 w-4 text-amber-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-1">
                                <div className="text-2xl font-black font-mono text-amber-500">
                                    {formatCurrency(metrics.totalCogs)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>COGS %: <strong className="text-foreground">{metrics.cogsPercentage.toFixed(1)}%</strong></span>
                                    <span>Exploded recipes</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 6. PLATFORM COST */}
                        <Card className="border-border/60 bg-card/70 shadow-xs relative group hover:border-sky-500/50 transition-all">
                            <SourceTip items={buildSourceTips(selectedEvent, metrics).platform} />
                            <CardHeader className="p-4 pb-1">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    <span>6. Platform Cost ({metrics.platformCostRate}%)</span>
                                    <Percent className="h-4 w-4 text-sky-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-1">
                                <div className="text-2xl font-black font-mono text-sky-400">
                                    {formatCurrency(metrics.platformCost)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>Rate: <strong className="text-foreground">{metrics.platformCostRate}%</strong> of Sales</span>
                                    <span>Channel deduction</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 7. CUSTOM COST */}
                        <Card className="border-border/60 bg-card/70 shadow-xs relative group hover:border-purple-500/50 transition-all">
                            <SourceTip items={buildSourceTips(selectedEvent, metrics).custom} />
                            <CardHeader className="p-4 pb-1">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    <span>7. Custom Costs</span>
                                    <Receipt className="h-4 w-4 text-purple-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-1">
                                <div className="text-2xl font-black font-mono text-purple-400">
                                    {formatCurrency(metrics.totalCustomCosts)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>{metrics.customCosts.length} line items configured</span>
                                    <span>Manual entries</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 8. WINNING SKUS */}
                        <Card className="border-border/60 bg-card/70 shadow-xs relative group hover:border-purple-500/50 transition-all">
                            <SourceTip items={buildSourceTips(selectedEvent, metrics).sku} />
                            <CardHeader className="p-4 pb-1">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    <span>8. Winning SKU</span>
                                    <Award className="h-4 w-4 text-purple-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-1">
                                <div className="text-lg font-bold font-mono text-purple-400 truncate" title={topWinningSku?.sku || "N/A"}>
                                    {topWinningSku ? topWinningSku.sku : "No SKU data"}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>Units: <strong className="text-foreground">{topWinningSku?.unitsSold.toLocaleString() || 0}</strong></span>
                                    <span>{metrics.winningSkus.length} active SKUs</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 9. PROFIT */}
                        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs relative group hover:border-emerald-500/60 transition-all">
                            <SourceTip items={buildSourceTips(selectedEvent, metrics).profit} />
                            <CardHeader className="p-4 pb-1">
                                <CardTitle className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>9. Net Profit</span>
                                    <Wallet className="h-4 w-4 text-emerald-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-1">
                                <div className="text-2xl font-black font-mono text-emerald-400">
                                    {formatCurrency(metrics.profit)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-emerald-400/80">
                                    <span>Margin: <strong className="text-emerald-300">{metrics.profitMargin.toFixed(1)}%</strong></span>
                                    <span>Net ROAS: <strong className="text-emerald-300">{metrics.netRoas.toFixed(2)}x</strong></span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Financial P&L Waterfall Card */}
                    <ProfitWaterfallCard metrics={metrics} />

                    {/* Department Telemetry Breakdown */}
                    <DepartmentTelemetryCard metrics={metrics} />

                    {/* Customer Acquisition & Retention Cohort */}
                    <CustomerRetentionCard metrics={metrics} platform={selectedEvent?.platform} />

                    {/* Winning SKUs Leaderboard */}

                    <WinningSkusCard
                        winningSkus={metrics.winningSkus}
                        totalCogs={metrics.totalCogs}
                    />

                    {/* Interactive Custom Costs Card */}
                    <CustomCostsCard
                        event={selectedEvent}
                        totalCustomCosts={metrics.totalCustomCosts}
                        onUpdateEvent={(updated) => {
                            setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
                            fetchEventData(updated.id, true);
                        }}
                    />
                </div>
            ) : null}
            </>
            )}

            {/* Create / Edit Modal */}
            <CreateEditEventModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={handleSavedEvent}
                eventToEdit={eventToEdit}
            />
        </div>
    );
}
