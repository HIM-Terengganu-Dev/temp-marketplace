"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Activity,
    AlertCircle,
    Boxes,
    CheckCircle2,
    Database,
    ExternalLink,
    HardDrive,
    Layers,
    Loader2,
    Megaphone,
    RefreshCw,
    Search,
    Server,
    Table as TableIcon,
    Users,
    Video,
    Zap,
    Clock,
    ArrowUpRight
} from "lucide-react";

interface ColumnInfo {
    column_name: string;
    data_type: string;
}

interface TableSummary {
    tableName: string;
    rowCount: number;
    lastUpdated: string | null;
    columns: { name: string; type: string }[];
}

interface SystemHealthStatus {
    key: string;
    name: string;
    description: string;
    status: 'connected' | 'disconnected' | 'missing_config';
    latencyMs: number | null;
    totalTables: number;
    totalRows: number;
    latestActivity: string | null;
    tables: TableSummary[];
    error?: string;
}

interface HealthResponse {
    success: boolean;
    timestamp: string;
    systems: SystemHealthStatus[];
    local: SystemHealthStatus;
}

const SYSTEM_ICONS: Record<string, any> = {
    affiliate: Users,
    livehost: Video,
    marketing: Megaphone,
    stock: Boxes,
    local: HardDrive,
};

function formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) return "No timestamp data";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return "Just now";
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
        if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 30) return `${diffDays} days ago`;
        return d.toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return dateStr;
    }
}

export default function ConnectedSystemsPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<HealthResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    // Explorer state
    const [selectedSystemKey, setSelectedSystemKey] = useState<string>("stock");
    const [selectedTable, setSelectedTable] = useState<string>("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<{
        tableName: string;
        total: number;
        columns: ColumnInfo[];
        rows: any[];
    } | null>(null);
    const [searchFilter, setSearchFilter] = useState("");

    const fetchStatus = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/external-systems/status", { cache: "no-store" });
            const result = await res.json();
            if (result.success) {
                setData(result);
                setLastChecked(new Date());

                // Set default selected table if none chosen
                const currentSystem = result.systems.find((s: SystemHealthStatus) => s.key === selectedSystemKey) || result.systems[0];
                if (currentSystem && currentSystem.tables.length > 0 && !selectedTable) {
                    setSelectedSystemKey(currentSystem.key);
                    setSelectedTable(currentSystem.tables[0].tableName);
                }
            } else {
                setError(result.error || "Failed to fetch systems health status");
            }
        } catch (err: any) {
            setError(err.message || "Network error checking databases");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    // Fetch table preview whenever system or table changes
    const fetchTablePreview = async (systemKey: string, tableName: string) => {
        if (!systemKey || !tableName) return;
        setPreviewLoading(true);
        try {
            const res = await fetch(
                `/api/external-systems/preview?system=${encodeURIComponent(systemKey)}&table=${encodeURIComponent(tableName)}&limit=25`,
                { cache: "no-store" }
            );
            const json = await res.json();
            if (json.success) {
                setPreviewData(json);
            } else {
                setPreviewData(null);
            }
        } catch (err) {
            console.error("Failed to preview table data:", err);
            setPreviewData(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        if (selectedSystemKey && selectedTable) {
            fetchTablePreview(selectedSystemKey, selectedTable);
        }
    }, [selectedSystemKey, selectedTable]);

    const allSystems = useMemo(() => {
        if (!data) return [];
        return [...data.systems, ...(data.local ? [data.local] : [])];
    }, [data]);

    const activeSystem = useMemo(() => {
        return allSystems.find((s) => s.key === selectedSystemKey) || allSystems[0];
    }, [allSystems, selectedSystemKey]);

    // Filter preview rows
    const filteredRows = useMemo(() => {
        if (!previewData?.rows) return [];
        if (!searchFilter.trim()) return previewData.rows;
        const q = searchFilter.toLowerCase();
        return previewData.rows.filter((row) =>
            Object.values(row).some((val) =>
                val !== null && val !== undefined && String(val).toLowerCase().includes(q)
            )
        );
    }, [previewData, searchFilter]);

    // High-level aggregate metrics
    const stats = useMemo(() => {
        if (!data) return { onlineCount: 0, totalCount: 0, totalRows: 0, totalTables: 0, avgLatency: 0 };
        const ext = data.systems;
        const onlineCount = ext.filter((s) => s.status === "connected").length;
        const totalRows = ext.reduce((sum, s) => sum + s.totalRows, 0);
        const totalTables = ext.reduce((sum, s) => sum + s.totalTables, 0);
        const latencies = ext.map((s) => s.latencyMs).filter((l): l is number => l !== null);
        const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
        return {
            onlineCount,
            totalCount: ext.length,
            totalRows,
            totalTables,
            avgLatency,
        };
    }, [data]);

    const handleSelectSystem = (sysKey: string) => {
        setSelectedSystemKey(sysKey);
        const targetSys = allSystems.find((s) => s.key === sysKey);
        if (targetSys && targetSys.tables.length > 0) {
            setSelectedTable(targetSys.tables[0].tableName);
        } else {
            setSelectedTable("");
        }
    };

    return (
        <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Database className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Connected Systems & Data Hub
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Real-time database connectivity, data freshness telemetry, and table inspector across Neon databases.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {lastChecked && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Checked: {lastChecked.toLocaleTimeString()}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchStatus(true)}
                        disabled={refreshing || loading}
                        className="gap-2 shadow-xs"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
                        {refreshing ? "Checking..." : "Refresh Status"}
                    </Button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur-xs border-border/40 shadow-xs">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Systems Connectivity
                        </CardTitle>
                        <Zap className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <span>
                                {stats.onlineCount} / {stats.totalCount}
                            </span>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                                All Systems Live
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            External Neon PostgreSQL instances
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-xs border-border/40 shadow-xs">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Average Ping Latency
                        </CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <span>{stats.avgLatency} ms</span>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                                ap-southeast-1
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Neon pooled query connection
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-xs border-border/40 shadow-xs">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Tracked Tables
                        </CardTitle>
                        <Layers className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalTables} Tables
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across 4 operational database schemas
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-xs border-border/40 shadow-xs">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Total External Records
                        </CardTitle>
                        <Server className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalRows.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Indexed records ready for cross-system sync
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* System Status Cards Grid */}
            <div>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    System Status & Data Freshness
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data?.systems.map((sys) => {
                        const IconComponent = SYSTEM_ICONS[sys.key] || Database;
                        const isSelected = selectedSystemKey === sys.key;

                        return (
                            <div
                                key={sys.key}
                                onClick={() => handleSelectSystem(sys.key)}
                                className={`cursor-pointer rounded-xl border transition-all duration-200 p-5 ${
                                    isSelected
                                        ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30"
                                        : "border-border/40 bg-card/60 hover:border-border hover:bg-card/90 shadow-xs"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-lg ${
                                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                        }`}>
                                            <IconComponent className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                                {sys.name}
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                                    Neon DB
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                {sys.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Connection Pill */}
                                    <div className="shrink-0 flex items-center gap-1.5">
                                        {sys.status === "connected" ? (
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs gap-1 font-medium">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                {sys.latencyMs}ms
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                Offline
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Freshness & Table Summary Stats */}
                                <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Latest Activity</span>
                                        <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            {formatRelativeTime(sys.latestActivity)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Tables</span>
                                        <span className="font-medium text-foreground block mt-0.5">
                                            {sys.totalTables}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Total Rows</span>
                                        <span className="font-medium text-foreground block mt-0.5">
                                            {sys.totalRows.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Quick preview pills of top tables */}
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {sys.tables.slice(0, 4).map((t) => (
                                        <button
                                            key={t.tableName}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSystemKey(sys.key);
                                                setSelectedTable(t.tableName);
                                            }}
                                            className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                                                selectedSystemKey === sys.key && selectedTable === t.tableName
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-background/80 hover:bg-muted text-muted-foreground border-border/40"
                                            }`}
                                        >
                                            {t.tableName} ({t.rowCount > 1000 ? `${(t.rowCount / 1000).toFixed(1)}k` : t.rowCount})
                                        </button>
                                    ))}
                                    {sys.tables.length > 4 && (
                                        <span className="text-[10px] text-muted-foreground self-center">
                                            +{sys.tables.length - 4} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Live Data Explorer & Table Inspector */}
            <Card className="border-border/40 shadow-xs bg-card/60">
                <CardHeader className="pb-3 border-b border-border/30">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <TableIcon className="h-4 w-4 text-primary" />
                                Data Inspector & Table Explorer
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Live query preview and schema telemetry for {activeSystem?.name || "selected system"}
                            </CardDescription>
                        </div>

                        {/* System Selector Tabs */}
                        <div className="flex flex-wrap gap-1 bg-muted/60 p-1 rounded-lg border border-border/40">
                            {allSystems.map((s) => (
                                <button
                                    key={s.key}
                                    onClick={() => handleSelectSystem(s.key)}
                                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                                        selectedSystemKey === s.key
                                            ? "bg-background text-foreground shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {s.name.split(" ")[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                    {/* Table Select & Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground">Select Table:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {activeSystem?.tables.map((t) => (
                                    <button
                                        key={t.tableName}
                                        onClick={() => setSelectedTable(t.tableName)}
                                        className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                                            selectedTable === t.tableName
                                                ? "bg-primary text-primary-foreground border-primary font-medium"
                                                : "bg-background/80 hover:bg-muted text-foreground border-border/50"
                                        }`}
                                    >
                                        {t.tableName}
                                        <span className="ml-1.5 opacity-70 text-[10px]">
                                            ({t.rowCount.toLocaleString()})
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filter Search */}
                        <div className="relative w-full sm:w-64">
                            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Filter fetched rows..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="h-8 pl-8 text-xs bg-background/60"
                            />
                        </div>
                    </div>

                    {/* Table Meta Summary */}
                    {previewData && (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/30 text-xs">
                            <div className="flex items-center gap-4">
                                <span>
                                    Table: <strong className="text-foreground">{previewData.tableName}</strong>
                                </span>
                                <span>
                                    Total in Database: <strong className="text-foreground">{previewData.total.toLocaleString()} rows</strong>
                                </span>
                                <span>
                                    Columns: <strong className="text-foreground">{previewData.columns.length}</strong>
                                </span>
                            </div>
                            <span className="text-muted-foreground text-[11px]">
                                Showing first 25 records (live fetch)
                            </span>
                        </div>
                    )}

                    {/* Data Table Preview */}
                    <div className="rounded-lg border border-border/40 overflow-hidden bg-background/50">
                        {previewLoading ? (
                            <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span>Querying {activeSystem?.name}...</span>
                            </div>
                        ) : !previewData || previewData.rows.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                                <Database className="h-6 w-6 opacity-40" />
                                <span>No rows found in this table or table is empty.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[480px]">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-muted/70 sticky top-0 z-10 border-b border-border/40">
                                        <tr>
                                            <th className="py-2 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/20 w-12 text-center">
                                                #
                                            </th>
                                            {previewData.columns.map((col) => (
                                                <th
                                                    key={col.column_name}
                                                    className="py-2 px-3 text-[11px] font-semibold text-muted-foreground tracking-wider border-r border-border/20 whitespace-nowrap"
                                                >
                                                    <div>{col.column_name}</div>
                                                    <div className="text-[9px] font-normal text-muted-foreground/70 uppercase">
                                                        {col.data_type}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20 font-mono">
                                        {filteredRows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-2 px-3 text-muted-foreground text-center border-r border-border/20 text-[11px]">
                                                    {idx + 1}
                                                </td>
                                                {previewData.columns.map((col) => {
                                                    const val = row[col.column_name];
                                                    let displayVal = "";
                                                    if (val === null || val === undefined) {
                                                        displayVal = "NULL";
                                                    } else if (typeof val === "object") {
                                                        displayVal = JSON.stringify(val);
                                                    } else {
                                                        displayVal = String(val);
                                                    }

                                                    const isNull = val === null || val === undefined;

                                                    return (
                                                        <td
                                                            key={col.column_name}
                                                            className={`py-2 px-3 border-r border-border/20 max-w-xs truncate ${
                                                                isNull ? "text-muted-foreground/40 italic" : "text-foreground"
                                                            }`}
                                                            title={displayVal}
                                                        >
                                                            {displayVal}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Integration & Sync Opportunity Map */}
            <Card className="border-border/40 bg-card/40">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        Marketplace Sync Architecture
                    </CardTitle>
                    <CardDescription className="text-xs">
                        How external system databases bridge into this marketplace application
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg border border-border/30 bg-background/50 space-y-1.5">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                                <Boxes className="h-4 w-4 text-blue-500" />
                                <span>hw-stock-inventory &rarr; SKU COGS & Bundle Cost</span>
                            </div>
                            <p className="text-muted-foreground text-[11px]">
                                Pulls 228 master SKUs and combo bundle components into local <code className="text-primary">credentials.sku_cogs</code>. Ensures profit calculations and MTD targets always use latest item costs.
                            </p>
                        </div>

                        <div className="p-3 rounded-lg border border-border/30 bg-background/50 space-y-1.5">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                                <Video className="h-4 w-4 text-emerald-500" />
                                <span>hw-livehost-management &rarr; Livestream Performance</span>
                            </div>
                            <p className="text-muted-foreground text-[11px]">
                                Ingests 2,706 session reports and host shift logs into <code className="text-primary">credentials.shop_livestream_performance</code> for live GMV vs host shift correlation.
                            </p>
                        </div>

                        <div className="p-3 rounded-lg border border-border/30 bg-background/50 space-y-1.5">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                                <Users className="h-4 w-4 text-purple-500" />
                                <span>hw-affiliate-management &rarr; Creator & Sample Sync</span>
                            </div>
                            <p className="text-muted-foreground text-[11px]">
                                Syncs 2,500+ recruitment entries and creator targets with TikTok affiliate GMV metrics to track conversion rate of gifted samples.
                            </p>
                        </div>

                        <div className="p-3 rounded-lg border border-border/30 bg-background/50 space-y-1.5">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                                <Megaphone className="h-4 w-4 text-amber-500" />
                                <span>hw-marketing-tracking &rarr; Video & Content Attribution</span>
                            </div>
                            <p className="text-muted-foreground text-[11px]">
                                Correlates 138k+ video records with marketplace ad spikes to attribute organic video traction to sales lifts.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
