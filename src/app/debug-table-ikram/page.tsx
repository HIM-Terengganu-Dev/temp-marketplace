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
    const [selectedShop, setSelectedShop] = useState("1");

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
            const url = `/api/tiktok/gmv-ikram?startDate=${startDate}&endDate=${endDate}&shopNumber=${selectedShop}`;
            
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
                                <td className="p-3 border-b bg-blue-500/10 font-semibold">GMV (Revenue - Includes Cancelled & Refunded)</td>
                                <td className="p-3 border-b font-mono text-lg font-bold text-blue-600 bg-blue-500/10">
                                    {data.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })} {data.currency}
                                </td>
                            </tr>
                            {data.uniqueCustomers !== undefined && (
                                <tr>
                                    <td className="p-3 border-b">Unique Customers</td>
                                    <td className="p-3 border-b font-mono font-semibold">
                                        {data.uniqueCustomers.toLocaleString()}
                                    </td>
                                </tr>
                            )}
                            <tr>
                                <td className="p-3 border-b">Order Count (All Orders)</td>
                                <td className="p-3 border-b font-mono">{data.orderCount}</td>
                            </tr>
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

            <p className="text-xs text-muted-foreground mt-8">
                * This page is for debugging purposes only. Revenue calculation includes cancelled and refunded orders.
            </p>
        </div>
    );
}

