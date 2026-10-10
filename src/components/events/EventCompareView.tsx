"use client";

import React, { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2, Trophy, AlertCircle, Users, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignEvent, EventAnalysisMetrics } from "@/types/events";

interface Props {
    events: CampaignEvent[];
    initialA?: string;
}

type Row = {
    label: string;
    get: (m: EventAnalysisMetrics) => number;
    fmt: "money" | "int" | "pct" | "x";
    /** true = higher is better, false = lower is better, null = neutral */
    better: boolean | null;
    dividerTitle?: string;
    dividerSubtitle?: string;
};

const ROWS: Row[] = [
    { label: "Target Sales", get: (m) => m.target, fmt: "money", better: null },
    { label: "Total Sales", get: (m) => m.sales, fmt: "money", better: true },
    { label: "Target TTainment", get: (m) => m.targetAttainment, fmt: "pct", better: true },
    { label: "Ad Spend", get: (m) => m.spend, fmt: "money", better: false },
    { label: "ROAS", get: (m) => m.roas, fmt: "x", better: true },
    { label: "Total Order", get: (m) => m.totalOrders, fmt: "int", better: true },
    { label: "COGS", get: (m) => m.totalCogs, fmt: "money", better: false },
    { label: "COGS %", get: (m) => m.cogsPercentage, fmt: "pct", better: false },
    { label: "AOV", get: (m) => m.aov, fmt: "money", better: true },
    { label: "Platform Cost", get: (m) => m.platformCost, fmt: "money", better: false },
    { label: "Other Cost (Custom Cost)", get: (m) => m.totalCustomCosts, fmt: "money", better: false },
    // Profitability & Bottom Line
    {
        label: "Total Cost",
        get: (m) => m.totalCost ?? (m.spend + m.totalCogs + m.platformCost + m.totalCustomCosts),
        fmt: "money",
        better: false,
        dividerTitle: "Net Profitability & Bottom Line",
        dividerSubtitle: "revenue minus ad spend, cogs, platform & other costs",
    },
    { label: "Net Profit", get: (m) => m.profit, fmt: "money", better: true },
    { label: "Profit Margin", get: (m) => m.profitMargin, fmt: "pct", better: true },
    { label: "Net ROAS", get: (m) => m.netRoas, fmt: "x", better: true },
    // Buyer Analytics
    {
        label: "Total Buyers",
        get: (m) => m.customerCohort?.totalCustomers ?? 0,
        fmt: "int",
        better: true,
        dividerTitle: "Buyer Analytics",
        dividerSubtitle: "customer acquisition, retention & cohort order value",
    },
    { label: "New Buyers", get: (m) => m.customerCohort?.newCustomers ?? 0, fmt: "int", better: true },
    { label: "New Buyer AOV", get: (m) => m.customerCohort?.newAov ?? 0, fmt: "money", better: true },
    { label: "Repeat Buyers", get: (m) => m.customerCohort?.returningCustomers ?? 0, fmt: "int", better: true },
    { label: "Repeat Buyers AOV", get: (m) => m.customerCohort?.returningAov ?? 0, fmt: "money", better: true },
];

const money = (v: number) =>
    new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2 }).format(v || 0);

function fmt(v: number, f: Row["fmt"]) {
    const n = Number.isFinite(v) ? v : 0;
    if (f === "money") return money(n);
    if (f === "int") return n.toLocaleString();
    if (f === "pct") return `${n.toFixed(1)}%`;
    return `${n.toFixed(2)}x`;
}

function useEventMetrics(id: string) {
    const [metrics, setMetrics] = useState<EventAnalysisMetrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setMetrics(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(`/api/centralised-data/events?eventId=${encodeURIComponent(id)}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
                if (cancelled) return;
                if (j.success) setMetrics(j.metrics || null);
                else setError(j.error || "Failed to load metrics");
            })
            .catch((e) => !cancelled && setError(e.message || "Network error"))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [id]);

    return { metrics, loading, error };
}

function EventPicker({
    value,
    onChange,
    events,
    accent,
    tag,
}: {
    value: string;
    onChange: (v: string) => void;
    events: CampaignEvent[];
    accent: string;
    tag: string;
}) {
    return (
        <div className={`rounded-xl border p-3 ${accent}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{tag}</div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm font-semibold"
            >
                <option value="">Select event…</option>
                {events.map((e) => (
                    <option key={e.id} value={e.id}>
                        {e.name} ({e.startDate} → {e.endDate})
                    </option>
                ))}
            </select>
        </div>
    );
}

function EventHeader({ ev, loading, error }: { ev?: CampaignEvent; loading: boolean; error: string | null }) {
    return (
        <div className="min-h-[52px]">
            {ev ? (
                <>
                    <div className="font-extrabold text-sm truncate">{ev.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px] font-mono">
                            {ev.startDate} → {ev.endDate}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">
                            {ev.platform}
                        </Badge>
                    </div>
                </>
            ) : (
                <div className="text-xs text-muted-foreground">No event selected</div>
            )}
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400 mt-1" />}
            {error && (
                <div className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> {error}
                </div>
            )}
        </div>
    );
}

export default function EventCompareView({ events, initialA }: Props) {
    const [idA, setIdA] = useState(initialA || events[0]?.id || "");
    const [idB, setIdB] = useState(events.find((e) => e.id !== (initialA || events[0]?.id))?.id || "");

    const A = useEventMetrics(idA);
    const B = useEventMetrics(idB);
    const evA = events.find((e) => e.id === idA);
    const evB = events.find((e) => e.id === idB);
    const ready = A.metrics && B.metrics;

    const swap = () => {
        setIdA(idB);
        setIdB(idA);
    };

    const winsA = ready
        ? ROWS.filter((r) => r.better !== null && (r.better ? r.get(A.metrics!) > r.get(B.metrics!) : r.get(A.metrics!) < r.get(B.metrics!))).length
        : 0;
    const winsB = ready
        ? ROWS.filter((r) => r.better !== null && (r.better ? r.get(B.metrics!) > r.get(A.metrics!) : r.get(B.metrics!) < r.get(A.metrics!))).length
        : 0;

    if (events.length < 2) {
        return (
            <div className="p-8 text-center text-sm text-muted-foreground rounded-2xl border border-dashed border-border">
                Need at least 2 events to compare. Create another event first.
            </div>
        );
    }

    const topA = A.metrics?.winningSkus?.slice(0, 5) || [];
    const topB = B.metrics?.winningSkus?.slice(0, 5) || [];

    return (
        <div className="space-y-5">
            {/* Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                <EventPicker value={idA} onChange={setIdA} events={events} tag="Event A" accent="border-purple-500/30 bg-purple-500/5" />
                <button
                    onClick={swap}
                    title="Swap events"
                    className="mx-auto h-9 w-9 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center transition"
                >
                    <ArrowRightLeft className="h-4 w-4" />
                </button>
                <EventPicker value={idB} onChange={setIdB} events={events} tag="Event B" accent="border-sky-500/30 bg-sky-500/5" />
            </div>

            {/* Scoreboard */}
            {ready && (
                <div className="grid grid-cols-3 rounded-2xl border border-border/60 bg-card overflow-hidden text-center shadow-xs">
                    <div className={`p-4 ${winsA > winsB ? "bg-purple-500/10" : ""}`}>
                        <div className="text-3xl font-black font-mono text-purple-400">{winsA}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate px-2">{evA?.name} wins</div>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center border-x border-border/60">
                        <Trophy className="h-5 w-5 text-amber-400" />
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Metrics won</div>
                    </div>
                    <div className={`p-4 ${winsB > winsA ? "bg-sky-500/10" : ""}`}>
                        <div className="text-3xl font-black font-mono text-sky-400">{winsB}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate px-2">{evB?.name} wins</div>
                    </div>
                </div>
            )}

            {/* Comparison table */}
            <Card className="border-border/60 bg-card/70 overflow-hidden shadow-xs">
                <CardHeader className="p-0">
                    <CardTitle className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr] text-xs">
                        <div className="p-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold self-end">Metric</div>
                        <div className="p-3 border-l-2 border-purple-500/50 bg-purple-500/5">
                            <EventHeader ev={evA} loading={A.loading} error={A.error} />
                        </div>
                        <div className="p-3 border-l-2 border-sky-500/50 bg-sky-500/5">
                            <EventHeader ev={evB} loading={B.loading} error={B.error} />
                        </div>
                        <div className="p-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold self-end text-right">B vs A</div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {ROWS.map((r) => {
                        const a = A.metrics ? r.get(A.metrics) : null;
                        const b = B.metrics ? r.get(B.metrics) : null;
                        const both = a !== null && b !== null;
                        const diff = both ? b! - a! : 0;
                        const pct = both && a !== 0 ? (diff / Math.abs(a!)) * 100 : null;
                        const aWins = both && r.better !== null && (r.better ? a! > b! : a! < b!);
                        const bWins = both && r.better !== null && (r.better ? b! > a! : b! < a!);
                        const max = both ? Math.max(Math.abs(a!), Math.abs(b!)) || 1 : 1;
                        const good = r.better === null ? null : r.better ? diff > 0 : diff < 0;

                        return (
                            <React.Fragment key={r.label}>
                                {r.dividerTitle && (
                                    <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr] bg-muted/40 border-t-2 border-border/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <div className="col-span-full flex items-center justify-between text-purple-300">
                                            <span className="flex items-center gap-1.5">
                                                {r.dividerTitle === "Buyer Analytics" ? (
                                                    <Users className="h-3.5 w-3.5 text-purple-400" />
                                                ) : (
                                                    <Sparkles className="h-3 w-3 text-purple-400" />
                                                )}
                                                {r.dividerTitle}
                                            </span>
                                            {r.dividerSubtitle && (
                                                <span className="text-[10px] font-normal text-muted-foreground lowercase">
                                                    {r.dividerSubtitle}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div
                                    className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr] border-t border-border/40 text-sm hover:bg-muted/30 transition-colors"
                                >
                                    <div className="p-3 text-xs font-semibold text-muted-foreground self-center">{r.label}</div>
                                    <div className={`p-3 ${aWins ? "bg-purple-500/10" : ""}`}>
                                        <div className={`font-mono font-bold ${aWins ? "text-purple-300" : ""}`}>
                                            {a !== null ? fmt(a, r.fmt) : "—"} {aWins && "🏆"}
                                        </div>
                                        {both && (
                                            <div className="h-1 mt-1.5 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full bg-purple-500" style={{ width: `${(Math.abs(a!) / max) * 100}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className={`p-3 ${bWins ? "bg-sky-500/10" : ""}`}>
                                        <div className={`font-mono font-bold ${bWins ? "text-sky-300" : ""}`}>
                                            {b !== null ? fmt(b, r.fmt) : "—"} {bWins && "🏆"}
                                        </div>
                                        {both && (
                                            <div className="h-1 mt-1.5 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full bg-sky-500" style={{ width: `${(Math.abs(b!) / max) * 100}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className={`p-3 text-right font-mono text-xs self-center ${
                                            good === null || diff === 0 ? "text-muted-foreground" : good ? "text-emerald-400" : "text-red-400"
                                        }`}
                                    >
                                        {both ? (
                                            <>
                                                <div>{diff > 0 ? "+" : ""}{fmt(diff, r.fmt)}</div>
                                                {pct !== null && <div className="text-[10px] opacity-80">{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</div>}
                                            </>
                                        ) : (
                                            "—"
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Top SKUs */}
            {ready && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { ev: evA, skus: topA, color: "purple" },
                        { ev: evB, skus: topB, color: "sky" },
                    ].map((col, i) => (
                        <Card key={i} className={`border-border/60 bg-card/70 ${col.color === "purple" ? "border-t-purple-500/60" : "border-t-sky-500/60"} border-t-2`}>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                                    Top 5 SKUs — {col.ev?.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-1.5">
                                {col.skus.length === 0 && <div className="text-xs text-muted-foreground">No SKU data</div>}
                                {col.skus.map((s, j) => (
                                    <div key={s.sku} className="flex items-center justify-between text-xs">
                                        <span className="font-mono truncate pr-2">
                                            {j + 1}. {s.sku}
                                        </span>
                                        <span className="font-mono font-bold">{s.unitsSold.toLocaleString()} units</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
