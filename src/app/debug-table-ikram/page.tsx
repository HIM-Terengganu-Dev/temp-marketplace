"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function DebugTableIkramPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Default to verification date
    const [startDate, setStartDate] = useState("2025-12-25");
    const [endDate, setEndDate] = useState("2025-12-25");
    const [selectedMetric, setSelectedMetric] = useState("gross_revenue");
    const [selectedShop, setSelectedShop] = useState("1");

    const METRICS = [
        { id: 'gross_revenue', name: 'Total GMV Max' },
        { id: 'live_gmv_max', name: 'LIVE GMV MAX (Marketing API)' },
        { id: 'product_gmv_max', name: 'Product GMV Max (Marketing API)' },
        { id: 'manual_ads_cost', name: 'TTAM (Marketing API)' },
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
            if (selectedMetric === 'gross_revenue') {
                // Fetch Gross Revenue from both LIVE and PRODUCT GMV Max
                const [liveRes, productRes] = await Promise.all([
                    fetch(`/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=LIVE_GMV_MAX`),
                    fetch(`/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=PRODUCT_GMV_MAX`)
                ]);

                if (!liveRes.ok || !productRes.ok) {
                    throw new Error('Failed to fetch Gross Revenue data');
                }

                const liveData = await liveRes.json();
                const productData = await productRes.json();

                // Combine the data
                const totalGrossRevenue = (liveData.gmv || 0) + (productData.gmv || 0);
                const totalCost = (liveData.cost || 0) + (productData.cost || 0);
                const totalOrders = (liveData.orderCount || 0) + (productData.orderCount || 0);
                const totalCampaigns = (liveData.campaignCount || 0) + (productData.campaignCount || 0);
                const roi = totalCost > 0 ? totalGrossRevenue / totalCost : 0;

                // Combine account breakdowns
                const liveAccounts = liveData.accounts || [];
                const productAccounts = productData.accounts || [];
                
                // Merge accounts by name
                const accountMap = new Map();
                [...liveAccounts, ...productAccounts].forEach((account: any) => {
                    const key = account.name || account.accountName || 'Other';
                    if (!accountMap.has(key)) {
                        accountMap.set(key, {
                            name: key,
                            cost: 0,
                            grossRevenue: 0,
                            orders: 0,
                            campaigns: 0
                        });
                    }
                    const existing = accountMap.get(key);
                    existing.cost += account.cost || 0;
                    existing.grossRevenue += account.gmv || 0;
                    existing.orders += account.orders || 0;
                    existing.campaigns += account.campaigns || account.campaignCount || 0;
                });

                const combinedAccounts = Array.from(accountMap.values()).map(acc => ({
                    ...acc,
                    roi: acc.cost > 0 ? acc.grossRevenue / acc.cost : 0
                })).sort((a, b) => b.grossRevenue - a.grossRevenue);

                setData({
                    shopName: 'DrSamhanWellness',
                    grossRevenue: totalGrossRevenue,
                    cost: totalCost,
                    orders: totalOrders,
                    roi: roi,
                    campaignCount: totalCampaigns,
                    currency: 'MYR',
                    dateRange: { start: startDate, end: endDate },
                    liveGMVMax: {
                        grossRevenue: liveData.gmv || 0,
                        cost: liveData.cost || 0,
                        orders: liveData.orderCount || 0,
                        campaigns: liveData.campaignCount || 0
                    },
                    productGMVMax: {
                        grossRevenue: productData.gmv || 0,
                        cost: productData.cost || 0,
                        orders: productData.orderCount || 0,
                        campaigns: productData.campaignCount || 0
                    },
                    accounts: combinedAccounts
                });
                setLoading(false);
                return;
            } else if (selectedMetric === 'live_gmv_max') {
                url = `/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=LIVE_GMV_MAX`;
            } else if (selectedMetric === 'product_gmv_max') {
                url = `/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=PRODUCT_GMV_MAX`;
            } else if (selectedMetric === 'manual_ads_cost') {
                url = `/api/tiktok/manual-campaign-spend?startDate=${startDate}&endDate=${endDate}`;
            } else if (selectedMetric === 'roas') {
                // For ROAS, use gmv-ikram endpoint (includes cancelled and refunded orders)
                const [gmvRes, roasRes] = await Promise.all([
                    fetch(`/api/tiktok/gmv-ikram?startDate=${startDate}&endDate=${endDate}&shopNumber=${selectedShop}`),
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
            console.log('API Response for product_gmv_max:', result);
            console.log('Campaigns data:', result.campaigns);
            setData(result);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold">Debug Table (Ikram)</h1>
            <p className="text-sm text-muted-foreground">
                Revenue includes cancelled and refunded orders
            </p>

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
                            {/* Total GMV Max specific display */}
                            {selectedMetric === 'gross_revenue' ? (
                                <>
                                    <tr>
                                        <td className="p-3 border-b bg-blue-500/10 font-semibold">Total GMV Max</td>
                                        <td className="p-3 border-b font-mono text-lg font-bold text-blue-600 bg-blue-500/10">
                                            MYR {data.grossRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Total Cost</td>
                                        <td className="p-3 border-b font-mono">
                                            MYR {data.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Total Orders</td>
                                        <td className="p-3 border-b font-mono">{data.orders}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">ROI</td>
                                        <td className="p-3 border-b font-mono font-bold text-green-600">
                                            {data.roi?.toFixed(2)}x
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Total Campaigns</td>
                                        <td className="p-3 border-b font-mono">{data.campaignCount}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b font-semibold">LIVE GMV MAX - Gross Revenue</td>
                                        <td className="p-3 border-b font-mono font-semibold">
                                            MYR {data.liveGMVMax?.grossRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">LIVE GMV MAX - Cost</td>
                                        <td className="p-3 border-b font-mono">
                                            MYR {data.liveGMVMax?.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">LIVE GMV MAX - Orders</td>
                                        <td className="p-3 border-b font-mono">{data.liveGMVMax?.orders}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">LIVE GMV MAX - Campaigns</td>
                                        <td className="p-3 border-b font-mono">{data.liveGMVMax?.campaigns}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b font-semibold">Product GMV Max - Gross Revenue</td>
                                        <td className="p-3 border-b font-mono font-semibold">
                                            MYR {data.productGMVMax?.grossRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Product GMV Max - Cost</td>
                                        <td className="p-3 border-b font-mono">
                                            MYR {data.productGMVMax?.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Product GMV Max - Orders</td>
                                        <td className="p-3 border-b font-mono">{data.productGMVMax?.orders}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b">Product GMV Max - Campaigns</td>
                                        <td className="p-3 border-b font-mono">{data.productGMVMax?.campaigns}</td>
                                    </tr>
                                </>
                            ) : (
                                <>
                                    {selectedMetric === 'roas' && (
                                        <tr>
                                            <td className="p-3 border-b bg-blue-500/10 font-semibold">GMV (Revenue - Includes Cancelled & Refunded)</td>
                                            <td className="p-3 border-b font-mono text-lg font-bold bg-blue-500/10">
                                                {data.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}
                                    {(selectedMetric === 'live_gmv_max' || selectedMetric === 'product_gmv_max') && (
                                        <tr>
                                            <td className="p-3 border-b bg-blue-500/10 font-semibold">GMV ({data.currency})</td>
                                            <td className="p-3 border-b font-mono text-lg font-bold bg-blue-500/10">
                                                {data.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}
                                </>
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

                            {/* TTAM (Marketing API) specific rows */}
                            {selectedMetric === 'manual_ads_cost' && (
                                <>
                                    <tr>
                                        <td className="p-3 border-b">TTAM (Total Ad Spend) (MYR)</td>
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
                                        <td className="p-3 border-b bg-blue-500/10 font-semibold">GMV (Revenue - Includes Cancelled & Refunded)</td>
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
                                            GMV (with cancelled/refunded) / (Live GMV Max + Product GMV Max + Manual Campaign Spend)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 border-b text-muted-foreground text-sm">ACTUAL ROAS Formula</td>
                                        <td className="p-3 border-b font-mono text-sm text-muted-foreground">
                                            GMV (with cancelled/refunded) / ((Live GMV Max + Product GMV Max + Manual Campaign Spend) + SST + WHT)
                                        </td>
                                    </tr>
                                </>
                            )}

                            {(selectedMetric === 'live_gmv_max' || selectedMetric === 'product_gmv_max' || selectedMetric === 'gross_revenue') && (
                                <tr>
                                    <td className="p-3 border-b">Order Count</td>
                                    <td className="p-3 border-b font-mono">
                                        {data.orderCount || data.orders}
                                    </td>
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

            {/* Account Breakdown for Gross Revenue */}
            {data && selectedMetric === 'gross_revenue' && data.accounts && data.accounts.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Breakdown by Advertiser Account</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 border-b">Account</th>
                                    <th className="p-3 border-b text-right">Gross Revenue</th>
                                    <th className="p-3 border-b text-right">Cost</th>
                                    <th className="p-3 border-b text-right">Orders</th>
                                    <th className="p-3 border-b text-right">Campaigns</th>
                                    <th className="p-3 border-b text-right">ROI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.accounts.map((account: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/50">
                                        <td className="p-3 border-b font-medium">{account.name}</td>
                                        <td className="p-3 border-b font-mono text-right font-bold text-blue-600">
                                            MYR {account.grossRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">
                                            MYR {account.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border-b font-mono text-right">{account.orders}</td>
                                        <td className="p-3 border-b font-mono text-right">{account.campaigns}</td>
                                        <td className="p-3 border-b font-mono text-right font-bold text-green-600">
                                            {account.roi?.toFixed(2)}x
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Campaign Breakdown for Product GMV Max */}
            {data && selectedMetric === 'product_gmv_max' && (
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Breakdown by Campaign</h2>
                    {data.campaigns && data.campaigns.length > 0 ? (
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
                    ) : (
                        <div className="border rounded-lg p-4 bg-muted/20">
                            <p className="text-sm text-muted-foreground">
                                No campaign data available. {data.campaigns ? `Campaigns array exists but is empty.` : 'Campaigns data not found in response.'}
                            </p>
                        </div>
                    )}
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
                * This page is for debugging purposes only. Revenue calculation includes cancelled and refunded orders.
            </p>
        </div>
    );
}
