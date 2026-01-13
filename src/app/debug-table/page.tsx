"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function DebugTablePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get today's date in GMT+8 timezone
    const getTodayGMT8 = () => {
        const now = new Date();
        // Convert to GMT+8 timezone using toLocaleString
        const gmt8Date = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
        // Format as YYYY-MM-DD
        const year = gmt8Date.getFullYear();
        const month = String(gmt8Date.getMonth() + 1).padStart(2, '0');
        const day = String(gmt8Date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Default to today's date (GMT+8)
    const [startDate, setStartDate] = useState(getTodayGMT8());
    const [endDate, setEndDate] = useState(getTodayGMT8());
    const [selectedMetric, setSelectedMetric] = useState("gmv");
    const [selectedShop, setSelectedShop] = useState("1");

    const METRICS = [
        { id: 'gmv', name: 'GMV (Revenue)' },
        { id: 'live_gmv_max', name: 'Live GMV Cost (Marketing API)' },
        { id: 'product_gmv_max', name: 'Product GMV Cost (Marketing API)' },
        { id: 'manual_ads_cost', name: 'Manual Ads Cost (Bidding Campaigns)' },
        { id: 'roas', name: 'ROAS (Return on Ad Spend)' }
    ];

    // Shop names - will be displayed from API response, but using these for dropdown labels
    const SHOP_OPTIONS = [
        { value: '1', label: 'DrSamhanWellness' },
        { value: '2', label: 'HIM CLINIC' },
        { value: '3', label: 'Vigomax HQ' },
        { value: '4', label: 'VigomaxPlus HQ' }
    ];

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = '';
            if (selectedMetric === 'gmv') {
                url = `/api/tiktok/gmv?startDate=${startDate}&endDate=${endDate}&shopNumber=${selectedShop}`;
            } else if (selectedMetric === 'live_gmv_max') {
                url = `/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=LIVE_GMV_MAX`;
            } else if (selectedMetric === 'product_gmv_max') {
                url = `/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=PRODUCT_GMV_MAX`;
            } else if (selectedMetric === 'manual_ads_cost') {
                url = `/api/tiktok/manual-campaign-spend?startDate=${startDate}&endDate=${endDate}`;
            } else if (selectedMetric === 'roas') {
                // For ROAS, we need both GMV and ads spend data for the selected shop
                const [gmvRes, roasRes] = await Promise.all([
                    fetch(`/api/tiktok/gmv?startDate=${startDate}&endDate=${endDate}&shopNumber=${selectedShop}`),
                    fetch(`/api/tiktok/roas?startDate=${startDate}&endDate=${endDate}&shopNumber=${selectedShop}`)
                ]);

                if (!gmvRes.ok || !roasRes.ok) {
                    throw new Error('Failed to fetch ROAS data');
                }

                const gmvData = await gmvRes.json();
                const roasData = await roasRes.json();

                const gmv = gmvData.gmv || 0;
                const totalAdsSpend = roasData.totalAdsSpend || 0;
                const roas = totalAdsSpend > 0 ? gmv / totalAdsSpend : 0;
                
                // Calculate ACTUAL ROAS with SST and WHT
                const totalCostWithTaxes = roasData.totalCostWithTaxes || totalAdsSpend;
                const actualRoas = totalCostWithTaxes > 0 ? gmv / totalCostWithTaxes : 0;

                setData({
                    ...roasData,
                    gmv,
                    roas,
                    actualRoas
                });
                setLoading(false);
                return;
            }

            if (!url) return;

            const res = await fetch(url);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch');
            }
            const result = await res.json();
            setData(result);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!data || !data.orders || data.orders.length === 0) return;

        // CSV Headers
        const headers = ['Order ID', 'Date', 'Status', 'GMV (RM)', 'Items', 'Included in Total', 'Buyer User ID'];
        
        // CSV Rows
        const rows: (string | number)[][] = data.orders.map((order: any) => {
            const date = order.createTime 
                ? format(new Date(order.createTime * 1000), 'yyyy-MM-dd HH:mm:ss')
                : 'N/A';
            return [
                order.id || '',
                date,
                order.status || '',
                (order.gmv || 0).toFixed(2),
                order.itemCount || 0,
                order.isIncluded ? 'Yes' : 'No (Excluded)',
                order.buyerUserId || ''
            ];
        });

        // Add summary row
        const includedOrders = data.orders.filter((o: any) => o.isIncluded);
        const totalGMV = includedOrders.reduce((sum: number, o: any) => sum + (o.gmv || 0), 0);
        const totalItems = includedOrders.reduce((sum: number, o: any) => sum + (o.itemCount || 0), 0);
        
        rows.push([]); // Empty row
        rows.push(['', '', 'Total (Included Orders):', totalGMV.toFixed(2), totalItems, `${includedOrders.length} orders`, '']);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map((row: (string | number)[]) => row.map((cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Generate filename with shop name, date range, and timestamp
        const shopName = data.shopName || 'Shop';
        const filename = `GMV_Orders_${shopName}_${startDate}_to_${endDate}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold">TikTok API Debug Table</h1>

            <div className="flex gap-4 items-end bg-muted/20 p-4 rounded-lg border">
                <div>
                    <label className="block text-sm font-medium mb-1">Shop</label>
                    <select
                        value={selectedShop}
                        onChange={(e) => {
                            setSelectedShop(e.target.value);
                            setData(null); // Clear data on shop change
                        }}
                        className="border rounded p-2 bg-background w-[180px]"
                    >
                        {SHOP_OPTIONS.map(shop => (
                            <option key={shop.value} value={shop.value}>{shop.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Metric</label>
                    <select
                        value={selectedMetric}
                        onChange={(e) => {
                            setSelectedMetric(e.target.value);
                            setData(null); // Clear data on metric change
                        }}
                        className="border rounded p-2 bg-background w-[200px]"
                    >
                        {METRICS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border rounded p-2 bg-background"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border rounded p-2 bg-background"
                    />
                </div>
                <Button onClick={fetchData} disabled={loading}>
                    {loading ? 'Fetching...' : 'Fetch Data'}
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded">
                    Error: {error}
                </div>
            )}

            {data && (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 border-b">Metric</th>
                                <th className="p-3 border-b">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="p-3 border-b">Shop Name</td>
                                <td className="p-3 border-b font-mono">{data.shopName}</td>
                            </tr>
                            <tr>
                                <td className="p-3 border-b">GMV ({data.currency})</td>
                                <td className="p-3 border-b font-mono text-lg font-bold">
                                    {data.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                            {selectedMetric === 'gmv' && data.uniqueCustomers !== undefined && (
                                <tr>
                                    <td className="p-3 border-b">Unique Customers</td>
                                    <td className="p-3 border-b font-mono font-semibold">
                                        {data.uniqueCustomers.toLocaleString()}
                                    </td>
                                </tr>
                            )}

                            {(selectedMetric === 'live_gmv_max' || selectedMetric === 'product_gmv_max') && (
                                <>
                                    <tr>
                                        <td className="p-3 border-b">Cost (Ad Spend)</td>
                                        <td className="p-3 border-b font-mono">
                                            {data.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">ROI</td>
                                        <td className="p-3 border-b font-mono font-bold text-green-600">
                                            {data.roi?.toFixed(2)}
                                        </td>
                                    </tr>
                                </>
                            )}

                            {/* Manual Ads Cost specific rows */}
                            {selectedMetric === 'manual_ads_cost' && (
                                <>
                                    <tr>
                                        <td className="p-3 border-b">Total Ad Spend (MYR)</td>
                                        <td className="p-3 border-b font-mono text-lg font-bold text-orange-600">
                                            {data.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Billed Cost</td>
                                        <td className="p-3 border-b font-mono">
                                            {data.totalBilledCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Campaign Count</td>
                                        <td className="p-3 border-b font-mono">{data.campaignCount}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Total Impressions</td>
                                        <td className="p-3 border-b font-mono">{data.totalImpressions?.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Total Clicks</td>
                                        <td className="p-3 border-b font-mono">{data.totalClicks?.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Avg CPM</td>
                                        <td className="p-3 border-b font-mono">{data.avgCPM?.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Avg CPC</td>
                                        <td className="p-3 border-b font-mono">{data.avgCPC?.toFixed(2)}</td>
                                    </tr>
                                </>
                            )}

                            {/* ROAS specific rows */}
                            {selectedMetric === 'roas' && (
                                <>
                                    <tr>
                                        <td className="p-3 border-b bg-blue-500/10 font-semibold">GMV (Revenue)</td>
                                        <td className="p-3 border-b font-mono text-lg font-bold text-blue-600 bg-blue-500/10">
                                            RM {data.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    {/* Show GMV Max costs only for shop 1 */}
                                    {data.shopNumber === 1 && (
                                        <>
                                            <tr>
                                                <td className="p-3 border-b">Live GMV Max Cost</td>
                                                <td className="p-3 border-b font-mono">
                                                    RM {data.liveGMVMaxCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 border-b">Product GMV Max Cost</td>
                                                <td className="p-3 border-b font-mono">
                                                    RM {data.productGMVMaxCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 border-b">GMV Max Cost (Live + Product)</td>
                                                <td className="p-3 border-b font-mono font-semibold">
                                                    RM {data.gmvMaxCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                    <tr>
                                        <td className="p-3 border-b">Manual Campaign Spend</td>
                                        <td className="p-3 border-b font-mono">
                                            RM {data.manualCampaignSpend?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b bg-orange-500/10 font-semibold">Total Ads Spend</td>
                                        <td className="p-3 border-b font-mono text-lg font-bold text-orange-600 bg-orange-500/10">
                                            RM {data.totalAdsSpend?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">SST (8%)</td>
                                        <td className="p-3 border-b font-mono">
                                            RM {data.sst?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Withholding Tax (8%)</td>
                                        <td className="p-3 border-b font-mono">
                                            RM {data.wht?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b bg-purple-500/10 font-semibold">Total Cost (with SST + WHT)</td>
                                        <td className="p-3 border-b font-mono text-lg font-bold text-purple-600 bg-purple-500/10">
                                            RM {data.totalCostWithTaxes?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b bg-green-500/10 font-semibold text-lg">ROAS</td>
                                        <td className="p-3 border-b font-mono text-2xl font-bold text-green-600 bg-green-500/10">
                                            {data.roas?.toFixed(2)}x
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b bg-blue-500/10 font-semibold text-lg">ACTUAL ROAS</td>
                                        <td className="p-3 border-b font-mono text-2xl font-bold text-blue-600 bg-blue-500/10">
                                            {data.actualRoas?.toFixed(2)}x
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b text-muted-foreground text-sm">ROAS Formula</td>
                                        <td className="p-3 border-b font-mono text-sm text-muted-foreground">
                                            GMV / (Live GMV Max + Product GMV Max + Manual Campaign Spend)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b text-muted-foreground text-sm">ACTUAL ROAS Formula</td>
                                        <td className="p-3 border-b font-mono text-sm text-muted-foreground">
                                            GMV / ((Live GMV Max + Product GMV Max + Manual Campaign Spend) + SST + WHT)
                                        </td>
                                    </tr>
                                </>
                            )}

                            {(selectedMetric === 'gmv' || selectedMetric === 'live_gmv_max' || selectedMetric === 'product_gmv_max') && (
                                <tr>
                                    <td className="p-3 border-b">Order Count</td>
                                    <td className="p-3 border-b font-mono">{data.orderCount}</td>
                                </tr>
                            )}
                            <tr>
                                <td className="p-3 border-b">Date Range</td>
                                <td className="p-3 border-b font-mono">
                                    {format(new Date(data.dateRange.start), 'yyyy-MM-dd')} to {format(new Date(data.dateRange.end), 'yyyy-MM-dd')}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Granular Order Details for GMV */}
            {data && selectedMetric === 'gmv' && data.orders && data.orders.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Granular Order Details (Debug Table)</h2>
                            <p className="text-sm text-muted-foreground">
                                Individual orders breakdown to verify aggregated data matches TikTok Seller Center
                            </p>
                        </div>
                        <Button onClick={exportToCSV} variant="outline" className="ml-4">
                            Export to CSV
                        </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted sticky top-0">
                                <tr>
                                    <th className="p-3 border-b">Order ID</th>
                                    <th className="p-3 border-b">Date</th>
                                    <th className="p-3 border-b">Status</th>
                                    <th className="p-3 border-b text-right">GMV (RM)</th>
                                    <th className="p-3 border-b text-right">Items</th>
                                    <th className="p-3 border-b">Included in Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.orders.map((order: any, idx: number) => (
                                    <tr 
                                        key={idx} 
                                        className={`hover:bg-muted/50 ${
                                            !order.isIncluded ? 'opacity-50 bg-red-50 dark:bg-red-950/20' : ''
                                        }`}
                                    >
                                        <td className="p-3 border-b font-mono text-xs">
                                            {order.id}
                                        </td>
                                        <td className="p-3 border-b font-mono">
                                            {order.createTime 
                                                ? format(new Date(order.createTime * 1000), 'yyyy-MM-dd HH:mm:ss')
                                                : 'N/A'}
                                        </td>
                                        <td className="p-3 border-b">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                order.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                order.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                order.status === 'REFUNDED' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-3 border-b font-mono text-right font-semibold">
                                            {order.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">
                                            {order.itemCount}
                                        </td>
                                        <td className="p-3 border-b">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                order.isIncluded 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {order.isIncluded ? 'Yes' : 'No (Excluded)'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-muted/50 sticky bottom-0">
                                <tr>
                                    <td colSpan={3} className="p-3 border-t font-semibold text-right">
                                        Total (Included Orders):
                                    </td>
                                    <td className="p-3 border-t font-mono text-right font-bold text-lg">
                                        {data.orders
                                            .filter((o: any) => o.isIncluded)
                                            .reduce((sum: number, o: any) => sum + (o.gmv || 0), 0)
                                            .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 border-t font-mono text-right font-semibold">
                                        {data.orders
                                            .filter((o: any) => o.isIncluded)
                                            .reduce((sum: number, o: any) => sum + o.itemCount, 0)}
                                    </td>
                                    <td className="p-3 border-t">
                                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                            {data.orders.filter((o: any) => o.isIncluded).length} orders
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Account Breakdown for Live GMV */}
            {data && selectedMetric === 'live_gmv_max' && data.accounts && data.accounts.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Breakdown by Account</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 border-b">Account</th>
                                    <th className="p-3 border-b text-right">Cost</th>
                                    <th className="p-3 border-b text-right">GMV</th>
                                    <th className="p-3 border-b text-right">Orders</th>
                                    <th className="p-3 border-b text-right">ROI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.accounts.map((account: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/50">
                                        <td className="p-3 border-b font-medium">{account.name}</td>
                                        <td className="p-3 border-b font-mono text-right">
                                            {account.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">
                                            {account.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">{account.orders}</td>
                                        <td className="p-3 border-b font-mono text-right font-bold text-green-600">
                                            {account.roi?.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Campaign Breakdown for Product GMV Max */}
            {data && selectedMetric === 'product_gmv_max' && data.campaigns && data.campaigns.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Breakdown by Campaign</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 border-b">Campaign Name</th>
                                    <th className="p-3 border-b text-right">Cost</th>
                                    <th className="p-3 border-b text-right">GMV</th>
                                    <th className="p-3 border-b text-right">Orders</th>
                                    <th className="p-3 border-b text-right">ROI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.campaigns.map((campaign: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/50">
                                        <td className="p-3 border-b font-medium">
                                            {campaign.campaignName?.includes('[') 
                                                ? campaign.campaignName 
                                                : `[${campaign.campaignName}]`}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">
                                            {campaign.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">
                                            {campaign.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">{campaign.orders}</td>
                                        <td className="p-3 border-b font-mono text-right font-bold text-green-600">
                                            {campaign.roi?.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Account Breakdown for Manual Ads Cost */}
            {data && selectedMetric === 'manual_ads_cost' && data.accounts && data.accounts.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Breakdown by Advertiser Account</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 border-b">Account</th>
                                    <th className="p-3 border-b text-right">Ad Spend</th>
                                    <th className="p-3 border-b text-right">Billed Cost</th>
                                    <th className="p-3 border-b text-right">Campaigns</th>
                                    <th className="p-3 border-b text-right">Impressions</th>
                                    <th className="p-3 border-b text-right">Clicks</th>
                                    <th className="p-3 border-b text-right">CPM</th>
                                    <th className="p-3 border-b text-right">CPC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.accounts.map((account: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/50">
                                        <td className="p-3 border-b font-medium">{account.accountName}</td>
                                        <td className="p-3 border-b font-mono text-right font-bold text-orange-600">
                                            RM {account.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">
                                            RM {account.totalBilledCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">{account.campaignCount}</td>
                                        <td className="p-3 border-b font-mono text-right">{account.totalImpressions?.toLocaleString()}</td>
                                        <td className="p-3 border-b font-mono text-right">{account.totalClicks?.toLocaleString()}</td>
                                        <td className="p-3 border-b font-mono text-right">{account.avgCPM?.toFixed(2)}</td>
                                        <td className="p-3 border-b font-mono text-right">{account.avgCPC?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <p className="text-xs text-muted-foreground mt-8">
                * This page is for debugging purposes only.
            </p>
        </div>
    );
}
