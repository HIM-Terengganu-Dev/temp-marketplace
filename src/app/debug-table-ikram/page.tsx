"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DebugTableIkramPage() {
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

    // Get yesterday's date in GMT+8 timezone
    const getYesterdayGMT8 = () => {
        const now = new Date();
        // Convert to GMT+8 timezone
        const gmt8Date = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
        // Subtract one day
        gmt8Date.setDate(gmt8Date.getDate() - 1);
        // Format as YYYY-MM-DD
        const year = gmt8Date.getFullYear();
        const month = String(gmt8Date.getMonth() + 1).padStart(2, '0');
        const day = String(gmt8Date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Default to today's date (GMT+8)
    const [startDate, setStartDate] = useState(getTodayGMT8());
    const [endDate, setEndDate] = useState(getTodayGMT8());
    const [selectedMetric, setSelectedMetric] = useState("gross_revenue");
    const [selectedShop, setSelectedShop] = useState("1");
    
    // Track expanded accounts for granular campaign view
    const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
    
    // Track expanded campaigns for live session view (LIVE GMV MAX only)
    const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
    
    // Store live sessions data for each campaign (fetched on-demand)
    const [campaignLiveSessions, setCampaignLiveSessions] = useState<Record<string, any[]>>({});
    
    // Track loading state for live sessions
    const [loadingLiveSessions, setLoadingLiveSessions] = useState<Set<string>>(new Set());

    // Function to jump to yesterday
    const jumpToYesterday = () => {
        const yesterday = getYesterdayGMT8();
        setStartDate(yesterday);
        setEndDate(yesterday);
        setData(null); // Clear data when date changes
        setExpandedAccounts(new Set()); // Clear expanded accounts
        setExpandedCampaigns(new Set()); // Clear expanded campaigns
        setCampaignLiveSessions({}); // Clear live sessions data
    };

    // Toggle account expansion for campaign details
    const toggleAccountExpansion = (accountName: string) => {
        setExpandedAccounts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accountName)) {
                newSet.delete(accountName);
            } else {
                newSet.add(accountName);
            }
            return newSet;
        });
    };

    // Toggle campaign expansion for live session details (LIVE GMV MAX only)
    const toggleCampaignExpansion = async (campaignId: string) => {
        const isCurrentlyExpanded = expandedCampaigns.has(campaignId);
        
        setExpandedCampaigns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(campaignId)) {
                newSet.delete(campaignId);
            } else {
                newSet.add(campaignId);
            }
            return newSet;
        });
        
        // If expanding and we don't have live sessions data yet, fetch it
        if (!isCurrentlyExpanded && !campaignLiveSessions[campaignId]) {
            setLoadingLiveSessions(prev => new Set(prev).add(campaignId));
            
            try {
                const res = await fetch(
                    `/api/tiktok/gmv-max/rooms?startDate=${startDate}&endDate=${endDate}&campaignId=${campaignId}&shopNumber=${selectedShop}`
                );
                
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to fetch live sessions');
                }
                
                const result = await res.json();
                setCampaignLiveSessions(prev => ({
                    ...prev,
                    [campaignId]: result.liveSessions || []
                }));
            } catch (error: any) {
                console.error('Error fetching live sessions:', error);
                setCampaignLiveSessions(prev => ({
                    ...prev,
                    [campaignId]: []
                }));
            } finally {
                setLoadingLiveSessions(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(campaignId);
                    return newSet;
                });
            }
        }
    };

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
                    fetch(`/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=LIVE_GMV_MAX&shopNumber=${selectedShop}`),
                    fetch(`/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=PRODUCT_GMV_MAX&shopNumber=${selectedShop}`)
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
                url = `/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=LIVE_GMV_MAX&shopNumber=${selectedShop}`;
            } else if (selectedMetric === 'product_gmv_max') {
                url = `/api/tiktok/gmv-max?startDate=${startDate}&endDate=${endDate}&promotion_type=PRODUCT_GMV_MAX&shopNumber=${selectedShop}`;
            } else if (selectedMetric === 'manual_ads_cost') {
                url = `/api/tiktok/manual-campaign-spend?startDate=${startDate}&endDate=${endDate}&shopNumber=${selectedShop}`;
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
                            setExpandedAccounts(new Set()); // Clear expanded accounts
                            setExpandedCampaigns(new Set()); // Clear expanded campaigns
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
                    <div className="relative">
                    <input
                        type="date"
                        value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setData(null); // Clear data on date change
                                setExpandedAccounts(new Set()); // Clear expanded accounts
                                setExpandedCampaigns(new Set()); // Clear expanded campaigns
                            }}
                            className="border rounded p-2 bg-background pr-8 w-full"
                            id="start-date-input-ikram"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const input = document.getElementById('start-date-input-ikram') as HTMLInputElement;
                                if (input) {
                                    if (input.showPicker) {
                                        input.showPicker();
                                    } else {
                                        input.focus();
                                        input.click();
                                    }
                                }
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity bg-transparent border-0 p-0"
                            aria-label="Open date picker"
                        >
                            <Calendar className="h-4 w-4 text-gray-600" />
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <div className="relative">
                    <input
                        type="date"
                        value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setData(null); // Clear data on date change
                                setExpandedAccounts(new Set()); // Clear expanded accounts
                                setExpandedCampaigns(new Set()); // Clear expanded campaigns
                            }}
                            className="border rounded p-2 bg-background pr-8 w-full"
                            id="end-date-input-ikram"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const input = document.getElementById('end-date-input-ikram') as HTMLInputElement;
                                if (input) {
                                    if (input.showPicker) {
                                        input.showPicker();
                                    } else {
                                        input.focus();
                                        input.click();
                                    }
                                }
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity bg-transparent border-0 p-0"
                            aria-label="Open date picker"
                        >
                            <Calendar className="h-4 w-4 text-gray-600" />
                        </button>
                    </div>
                </div>
                <Button onClick={jumpToYesterday} variant="outline" disabled={loading}>
                    Yesterday
                </Button>
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
                    <p className="text-sm text-muted-foreground">Click on an account to view campaign-level details</p>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 border-b w-8"></th>
                                    <th className="p-3 border-b">Account</th>
                                    <th className="p-3 border-b text-right">Cost</th>
                                    <th className="p-3 border-b text-right">GMV</th>
                                    <th className="p-3 border-b text-right">Orders</th>
                                    <th className="p-3 border-b text-right">ROI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.accounts.map((account: any, idx: number) => {
                                    const isExpanded = expandedAccounts.has(account.name);
                                    const accountCampaigns = data.campaigns?.filter((c: any) => c.accountName === account.name) || [];
                                    
                                    return (
                                        <>
                                            <tr 
                                                key={idx} 
                                                className="hover:bg-muted/50 cursor-pointer transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAccountExpansion(account.name);
                                                }}
                                            >
                                                <td className="p-3 border-b">
                                                    {accountCampaigns.length > 0 ? (
                                                        isExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        )
                                                    ) : (
                                                        <span className="w-4"></span>
                                                    )}
                                                </td>
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
                                            {isExpanded && accountCampaigns.length > 0 && (
                                                <tr key={`${idx}-expanded`}>
                                                    <td colSpan={6} className="p-0 bg-muted/20">
                                                        <div className="p-4">
                                                            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                                                                Campaigns for {account.name} ({accountCampaigns.length})
                                                                {selectedMetric === 'live_gmv_max' && (
                                                                    <span className="text-xs text-muted-foreground ml-2">(Click campaign to view live sessions)</span>
                                                                )}
                                                            </h3>
                                                            <div className="border rounded-lg overflow-hidden bg-background">
                                                                <table className="w-full text-xs">
                                                                    <thead className="bg-muted/50">
                                                                        <tr>
                                                                            <th className="p-2 border-b w-6"></th>
                                                                            <th className="p-2 border-b text-left">Campaign Name</th>
                                                                            <th className="p-2 border-b text-right">Cost</th>
                                                                            <th className="p-2 border-b text-right">GMV</th>
                                                                            <th className="p-2 border-b text-right">Orders</th>
                                                                            <th className="p-2 border-b text-right">ROI</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {accountCampaigns.map((campaign: any, campIdx: number) => {
                                                                            const isCampaignExpanded = expandedCampaigns.has(campaign.campaignId);
                                                                            const liveSessions = campaignLiveSessions[campaign.campaignId] || [];
                                                                            const isLoadingSessions = loadingLiveSessions.has(campaign.campaignId);
                                                                            const hasLiveSessions = selectedMetric === 'live_gmv_max';
                                                                            
                                                                            const handleCampaignClick = async (e: React.MouseEvent<HTMLTableRowElement>) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                
                                                                                if (selectedMetric === 'live_gmv_max' && campaign.campaignId) {
                                                                                    await toggleCampaignExpansion(campaign.campaignId);
                                                                                }
                                                                            };
                                                                            
                                                                            return (
                                                                                <React.Fragment key={campIdx}>
                                                                                    <tr 
                                                                                        className={`hover:bg-muted/30 ${selectedMetric === 'live_gmv_max' ? 'cursor-pointer select-none' : ''}`}
                                                                                        onClick={handleCampaignClick}
                                                                                        style={selectedMetric === 'live_gmv_max' ? { userSelect: 'none' } : {}}
                                                                                    >
                                                                                        <td className="p-2 border-b">
                                                                                            {selectedMetric === 'live_gmv_max' ? (
                                                                                                isCampaignExpanded ? (
                                                                                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                                                                                ) : (
                                                                                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                                                                )
                                                                                            ) : (
                                                                                                <span className="w-3"></span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="p-2 border-b font-medium text-xs">
                                                                                            {campaign.campaignName}
                                                                                        </td>
                                                                                        <td className="p-2 border-b font-mono text-right">
                                                                                            {campaign.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                        </td>
                                                                                        <td className="p-2 border-b font-mono text-right">
                                                                                            {campaign.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                        </td>
                                                                                        <td className="p-2 border-b font-mono text-right">{campaign.orders}</td>
                                                                                        <td className="p-2 border-b font-mono text-right font-bold text-green-600">
                                                                                            {campaign.roi?.toFixed(2)}
                                                                                        </td>
                                                                                    </tr>
                                                                                    {isCampaignExpanded && selectedMetric === 'live_gmv_max' && (
                                                                                        <tr>
                                                                                            <td colSpan={6} className="p-0 bg-muted/10">
                                                                                                <div className="p-3">
                                                                                                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
                                                                                                        Live Sessions (Livestream Rooms) for {campaign.campaignName} ({liveSessions.length})
                                                                                                    </h4>
                                                                                                    {isLoadingSessions ? (
                                                                                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                                                                                            Loading live sessions...
                                                                                                        </div>
                                                                                                    ) : liveSessions.length > 0 ? (
                                                                                                        <div className="border rounded overflow-hidden bg-background">
                                                                                                            <table className="w-full text-[10px]">
                                                                                                                <thead className="bg-muted/30">
                                                                                                                    <tr>
                                                                                                                        <th className="p-1.5 border-b text-left">Live Name</th>
                                                                                                                        <th className="p-1.5 border-b text-left">Room ID</th>
                                                                                                                        <th className="p-1.5 border-b text-left">Launched Time</th>
                                                                                                                        <th className="p-1.5 border-b text-left">Status</th>
                                                                                                                        <th className="p-1.5 border-b text-left">Duration</th>
                                                                                                                        <th className="p-1.5 border-b text-right">Cost</th>
                                                                                                                        <th className="p-1.5 border-b text-right">GMV</th>
                                                                                                                        <th className="p-1.5 border-b text-right">Orders</th>
                                                                                                                        <th className="p-1.5 border-b text-right">ROI</th>
                                                                                                                    </tr>
                                                                                                                </thead>
                                                                                                                <tbody>
                                                                                                                    {liveSessions.map((session: any, sessIdx: number) => (
                                                                                                                    <tr key={sessIdx} className="hover:bg-muted/20">
                                                                                                                        <td className="p-1.5 border-b text-[10px]">
                                                                                                                            {session.liveName || 'N/A'}
                                                                                                                        </td>
                                                                                                                        <td className="p-1.5 border-b font-mono text-[10px]">
                                                                                                                            {session.roomId || 'N/A'}
                                                                                                                        </td>
                                                                                                                        <td className="p-1.5 border-b font-mono text-[10px]">
                                                                                                                            {session.launchedTime ? format(new Date(session.launchedTime), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                                                                                                                        </td>
                                                                                                                        <td className="p-1.5 border-b text-[10px]">
                                                                                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                                                                                                                session.liveStatus === 'ONGOING' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                                                                                                session.liveStatus === 'END' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' :
                                                                                                                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                                                                                                            }`}>
                                                                                                                                {session.liveStatus || 'N/A'}
                                                                                                                            </span>
                                                                                                                        </td>
                                                                                                                        <td className="p-1.5 border-b text-[10px]">
                                                                                                                            {session.liveDuration || 'N/A'}
                                                                                                                        </td>
                                                                                                                        <td className="p-1.5 border-b font-mono text-right">
                                                                                                                            {session.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                                                        </td>
                                                                                                                        <td className="p-1.5 border-b font-mono text-right">
                                                                                                                            {session.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                                                        </td>
                                                                                                                        <td className="p-1.5 border-b font-mono text-right">{session.orders}</td>
                                                                                                                        <td className="p-1.5 border-b font-mono text-right font-bold text-green-600">
                                                                                                                            {session.roi?.toFixed(2)}
                                                                                                                        </td>
                                                                                                                    </tr>
                                                                                                                ))}
                                                                                                                </tbody>
                                                                                                            </table>
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                                                                                            No live sessions found for this campaign in the selected date range.
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    )}
                                                                                </React.Fragment>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
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

            {/* Campaign Breakdown for Product GMV Max - Aggregated by Account */}
            {data && selectedMetric === 'product_gmv_max' && (
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Breakdown by Account (Aggregated from Campaigns)</h2>
                    <p className="text-sm text-muted-foreground">Click on an account to view campaign-level details</p>
                    {data.campaigns && data.campaigns.length > 0 ? (() => {
                        // Aggregate campaigns by account name
                        const accountAggregates: Record<string, { cost: number; gmv: number; orders: number; campaignCount: number }> = {};
                        
                        data.campaigns.forEach((campaign: any) => {
                            const accountName = campaign.accountName || 'Other';
                            if (!accountAggregates[accountName]) {
                                accountAggregates[accountName] = {
                                    cost: 0,
                                    gmv: 0,
                                    orders: 0,
                                    campaignCount: 0
                                };
                            }
                            accountAggregates[accountName].cost += campaign.cost || 0;
                            accountAggregates[accountName].gmv += campaign.gmv || 0;
                            accountAggregates[accountName].orders += campaign.orders || 0;
                            accountAggregates[accountName].campaignCount += 1;
                        });

                        // Convert to array and calculate ROI
                        const accountRows = Object.entries(accountAggregates).map(([accountName, data]) => ({
                            accountName: accountName,
                            cost: data.cost,
                            gmv: data.gmv,
                            orders: data.orders,
                            campaignCount: data.campaignCount,
                            roi: data.cost > 0 ? data.gmv / data.cost : 0
                        })).sort((a, b) => b.gmv - a.gmv); // Sort by GMV descending

                        return (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="p-3 border-b w-8"></th>
                                            <th className="p-3 border-b">Account</th>
                                            <th className="p-3 border-b text-right">Cost</th>
                                            <th className="p-3 border-b text-right">GMV</th>
                                            <th className="p-3 border-b text-right">Orders</th>
                                            <th className="p-3 border-b text-right">Campaigns</th>
                                            <th className="p-3 border-b text-right">ROI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accountRows.map((account, idx: number) => {
                                            const isExpanded = expandedAccounts.has(account.accountName);
                                            const accountCampaigns = data.campaigns.filter((c: any) => c.accountName === account.accountName);
                                            
                                            return (
                                                <>
                                                    <tr 
                                                        key={idx} 
                                                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                                                        onClick={() => toggleAccountExpansion(account.accountName)}
                                                    >
                                                        <td className="p-3 border-b">
                                                            {accountCampaigns.length > 0 ? (
                                                                isExpanded ? (
                                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                )
                                                            ) : (
                                                                <span className="w-4"></span>
                                                            )}
                                                        </td>
                                                <td className="p-3 border-b font-medium">[{account.accountName}]</td>
                                                <td className="p-3 border-b font-mono text-right">
                                                    {account.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-3 border-b font-mono text-right">
                                                    {account.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-3 border-b font-mono text-right">{account.orders}</td>
                                                <td className="p-3 border-b font-mono text-right">{account.campaignCount}</td>
                                                <td className="p-3 border-b font-mono text-right font-bold text-green-600">
                                                    {account.roi?.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && accountCampaigns.length > 0 && (
                                                        <tr key={`${idx}-expanded`}>
                                                            <td colSpan={7} className="p-0 bg-muted/20">
                                                                <div className="p-4">
                                                                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                                                                        Campaigns for [{account.accountName}] ({accountCampaigns.length})
                                                                    </h3>
                                                                    <div className="border rounded-lg overflow-hidden bg-background">
                                                                        <table className="w-full text-xs">
                                                                            <thead className="bg-muted/50">
                                                                                <tr>
                                                                                    <th className="p-2 border-b text-left">Campaign Name</th>
                                                                                    <th className="p-2 border-b text-right">Cost</th>
                                                                                    <th className="p-2 border-b text-right">GMV</th>
                                                                                    <th className="p-2 border-b text-right">Orders</th>
                                                                                    <th className="p-2 border-b text-right">ROI</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {accountCampaigns.map((campaign: any, campIdx: number) => (
                                                                                    <tr key={campIdx} className="hover:bg-muted/30">
                                                                                        <td className="p-2 border-b font-medium text-xs">
                                                                                            {campaign.campaignName}
                                                                                        </td>
                                                                                        <td className="p-2 border-b font-mono text-right">
                                                                                            {campaign.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                        </td>
                                                                                        <td className="p-2 border-b font-mono text-right">
                                                                                            {campaign.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                        </td>
                                                                                        <td className="p-2 border-b font-mono text-right">{campaign.orders}</td>
                                                                                        <td className="p-2 border-b font-mono text-right font-bold text-green-600">
                                                                                            {campaign.roi?.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })() : (
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
