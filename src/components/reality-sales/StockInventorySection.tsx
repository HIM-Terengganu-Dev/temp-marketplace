"use client";

import React, { useState } from "react";
import { Boxes, Package, Layers, ShoppingCart, Search, ChevronDown, ChevronRight, DollarSign, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DepartmentAlert from "./DepartmentAlert";

interface SingleSku {
    merchant_sku: string;
    product_category: string | null;
    sale_class: string | null;
    cost: number | null;
    created_at: string;
    updated_at: string;
}

interface ComboComponent {
    component_sku: string;
    qty: number;
    component_cost: number | null;
}

interface ComboSku {
    merchant_sku: string;
    product_category: string | null;
    sale_class: string | null;
    components: ComboComponent[];
    totalCogs: number | null;
    isCompleteCost: boolean;
    created_at: string;
    updated_at: string;
}

interface OrderSummaryItem {
    marketplace: string;
    store: string;
    order_status: string;
    order_count: number;
    total_quantity: number;
}

interface RecentOrder {
    id: number;
    order_no: string;
    marketplace: string;
    store: string;
    merchant_sku: string;
    quantity: number;
    order_time: string;
    order_status: string;
    tracking_number: string | null;
}

interface StockData {
    status: string;
    hasData: boolean;
    cogsOverview: {
        totalSkus: number;
        singleCount: number;
        comboCount: number;
        singleWithCost: number;
        comboWithCost: number;
        totalOrdersCount: number;
        totalUnitsSold: number;
    };
    singleSkus: SingleSku[];
    comboSkus: ComboSku[];
    ordersSummary: OrderSummaryItem[];
    recentOrders: RecentOrder[];
    error?: string;
}

interface StockInventorySectionProps {
    data: StockData;
    onRetry?: () => void;
}

export default function StockInventorySection({
    data,
    onRetry
}: StockInventorySectionProps) {
    const [activeTab, setActiveTab] = useState<"cogs" | "single" | "combo" | "orders">("cogs");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCombos, setExpandedCombos] = useState<Record<string, boolean>>({});

    const toggleCombo = (sku: string) => {
        setExpandedCombos(prev => ({ ...prev, [sku]: !prev[sku] }));
    };

    const overview = data.cogsOverview || {
        totalSkus: 0,
        singleCount: 0,
        comboCount: 0,
        singleWithCost: 0,
        comboWithCost: 0,
        totalOrdersCount: 0,
        totalUnitsSold: 0
    };

    const filteredSingle = (data.singleSkus || []).filter(s =>
        s.merchant_sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.product_category || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCombo = (data.comboSkus || []).filter(c =>
        c.merchant_sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.product_category || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOrders = (data.recentOrders || []).filter(o =>
        o.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.merchant_sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.store.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {data.error && (
                <DepartmentAlert
                    title="Stock Inventory Database Error"
                    type="error"
                    message={`Failed to query Stock & Inventory database: ${data.error}`}
                    onRetry={onRetry}
                />
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Total SKUs</p>
                            <p className="text-xl font-bold mt-0.5">{overview.totalSkus.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {overview.singleCount} Single • {overview.comboCount} Combo
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                            <Boxes className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">COGS Defined</p>
                            <p className="text-xl font-bold mt-0.5 text-emerald-500">
                                {overview.singleWithCost + overview.comboWithCost} SKUs
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {overview.singleWithCost} single • {overview.comboWithCost} combo
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Total Orders</p>
                            <p className="text-xl font-bold mt-0.5">{overview.totalOrdersCount.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">In selected period</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                            <ShoppingCart className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Units Shipped</p>
                            <p className="text-xl font-bold mt-0.5">{overview.totalUnitsSold.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Items sold</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
                            <Package className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sub-tab selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/40 border border-border/40">
                    <button
                        onClick={() => setActiveTab("cogs")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            activeTab === "cogs" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        COGS Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("single")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            activeTab === "single" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Single SKUs ({data.singleSkus.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("combo")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            activeTab === "combo" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Combo SKUs ({data.comboSkus.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("orders")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            activeTab === "orders" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Order Stream ({data.recentOrders.length})
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search SKU or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            {/* Tab 1: COGS Overview */}
            {activeTab === "cogs" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="p-4 pb-2 border-b border-border/40">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Package className="h-4 w-4 text-emerald-500" />
                                    Single SKUs COGS Summary
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Base component unit costs configured in stock database
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <div className="divide-y divide-border/30 max-h-72 overflow-y-auto pr-1">
                                    {data.singleSkus.filter(s => s.cost !== null).map(sku => (
                                        <div key={sku.merchant_sku} className="py-2 flex items-center justify-between text-xs">
                                            <div>
                                                <span className="font-semibold text-foreground">{sku.merchant_sku}</span>
                                                <span className="text-[10px] text-muted-foreground block">{sku.product_category || "Uncategorised"}</span>
                                            </div>
                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                RM {sku.cost?.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="p-4 pb-2 border-b border-border/40">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-primary" />
                                    Top Combo Bundles Rolled-up COGS
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Computed formula: sum(component quantity × component unit cost)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <div className="divide-y divide-border/30 max-h-72 overflow-y-auto pr-1">
                                    {data.comboSkus.filter(c => c.totalCogs !== null).slice(0, 10).map(combo => (
                                        <div key={combo.merchant_sku} className="py-2 flex items-center justify-between text-xs">
                                            <div>
                                                <span className="font-semibold text-foreground">{combo.merchant_sku}</span>
                                                <span className="text-[10px] text-muted-foreground block">
                                                    {combo.components.length} components • {combo.components.map(c => `${c.qty}x ${c.component_sku}`).join(", ")}
                                                </span>
                                            </div>
                                            <span className="font-mono font-bold text-primary">
                                                RM {combo.totalCogs?.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Tab 2: Single SKUs Table */}
            {activeTab === "single" && (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="p-4 pb-2 border-b border-border/40">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            Single SKUs Catalog
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Direct product definitions with unit costs and category tagging
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-2.5 px-4">Merchant SKU</th>
                                        <th className="py-2.5 px-4">Category</th>
                                        <th className="py-2.5 px-4">Sale Class</th>
                                        <th className="py-2.5 px-4 text-right">Unit COGS</th>
                                        <th className="py-2.5 px-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {filteredSingle.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                                No single SKUs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSingle.map((sku) => (
                                            <tr key={sku.merchant_sku} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-foreground font-mono">
                                                    {sku.merchant_sku}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {sku.product_category || "—"}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {sku.sale_class || "—"}
                                                </td>
                                                <td className="py-3 px-4 text-right font-extrabold text-foreground font-mono">
                                                    {sku.cost !== null ? `RM ${sku.cost.toFixed(2)}` : (
                                                        <span className="text-muted-foreground/60 font-normal">Not Set</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {sku.cost !== null ? (
                                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                                            Costed
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                                                            Missing Cost
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tab 3: Combo SKUs Table */}
            {activeTab === "combo" && (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="p-4 pb-2 border-b border-border/40">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            Combo SKUs & Recipe Components
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Bundled product combinations and calculated roll-up COGS
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-2.5 px-4">Combo SKU</th>
                                        <th className="py-2.5 px-4">Category</th>
                                        <th className="py-2.5 px-4">Components</th>
                                        <th className="py-2.5 px-4 text-right">Rolled-Up COGS</th>
                                        <th className="py-2.5 px-4 text-center">Status</th>
                                        <th className="py-2.5 px-4 text-center">Detail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {filteredCombo.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                                No combo SKUs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCombo.map((combo) => {
                                            const isExpanded = !!expandedCombos[combo.merchant_sku];
                                            return (
                                                <React.Fragment key={combo.merchant_sku}>
                                                    <tr className="hover:bg-muted/20 transition-colors">
                                                        <td className="py-3 px-4 font-semibold text-foreground font-mono">
                                                            {combo.merchant_sku}
                                                        </td>
                                                        <td className="py-3 px-4 text-muted-foreground">
                                                            {combo.product_category || "—"}
                                                        </td>
                                                        <td className="py-3 px-4 text-muted-foreground">
                                                            {combo.components.length} item{combo.components.length === 1 ? "" : "s"}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-extrabold text-primary font-mono">
                                                            {combo.totalCogs !== null ? `RM ${combo.totalCogs.toFixed(2)}` : (
                                                                <span className="text-muted-foreground/60 font-normal">Incomplete</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            {combo.isCompleteCost && combo.totalCogs !== null ? (
                                                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                                                    Complete
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                                                                    Partial Cost
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <button
                                                                onClick={() => toggleCombo(combo.merchant_sku)}
                                                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                                aria-label="Toggle details"
                                                            >
                                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {isExpanded && (
                                                        <tr className="bg-muted/30">
                                                            <td colSpan={6} className="p-3 pl-8">
                                                                <div className="space-y-1.5">
                                                                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                                        Component Breakdown:
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                                        {combo.components.map((c, i) => (
                                                                            <div key={i} className="p-2 rounded border border-border/50 bg-background text-[11px] flex justify-between">
                                                                                <span><strong className="font-mono">{c.component_sku}</strong> × {c.qty}</span>
                                                                                <span className="font-mono text-muted-foreground">
                                                                                    {c.component_cost !== null ? `RM ${(c.qty * c.component_cost).toFixed(2)}` : "No cost"}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tab 4: Orders Stream */}
            {activeTab === "orders" && (
                <div className="space-y-4">
                    {/* Orders summary by marketplace */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {data.ordersSummary.slice(0, 3).map((item, idx) => (
                            <Card key={idx} className="border-border/50 bg-card/60">
                                <CardContent className="p-3.5">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                                            {item.marketplace}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{item.store}</span>
                                    </div>
                                    <div className="mt-2 flex items-baseline justify-between">
                                        <span className="text-lg font-bold">{item.order_count.toLocaleString()} orders</span>
                                        <span className="text-xs text-muted-foreground">{item.total_quantity.toLocaleString()} units</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Recent Orders table */}
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-primary" />
                                Recent Orders Stream
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Latest 50 marketplace orders logged in hw stock inventory
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-2.5 px-4">Order No</th>
                                            <th className="py-2.5 px-4">Marketplace</th>
                                            <th className="py-2.5 px-4">Store</th>
                                            <th className="py-2.5 px-4">SKU</th>
                                            <th className="py-2.5 px-4 text-right">Qty</th>
                                            <th className="py-2.5 px-4">Order Time</th>
                                            <th className="py-2.5 px-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {filteredOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                                    No orders found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOrders.map((order) => (
                                                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-2.5 px-4 font-semibold text-foreground font-mono">
                                                        {order.order_no}
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <Badge variant="secondary" className="text-[10px] uppercase">
                                                            {order.marketplace}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-muted-foreground">
                                                        {order.store}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-mono font-medium">
                                                        {order.merchant_sku}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-bold text-foreground">
                                                        {order.quantity}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-muted-foreground">
                                                        {new Date(order.order_time).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "short", timeStyle: "short" })}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] ${
                                                                order.order_status?.toLowerCase().includes("complete") || order.order_status?.toLowerCase().includes("deliver")
                                                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                                                    : "bg-blue-500/10 text-blue-500 border-blue-500/30"
                                                            }`}
                                                        >
                                                            {order.order_status || "Processing"}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
