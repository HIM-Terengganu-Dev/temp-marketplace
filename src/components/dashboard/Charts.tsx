"use client";

import React from 'react';
import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
} from 'recharts';

/* ─── Existing GMV Line Chart ──────────────────────────────────────────────── */
export function GMVLineChart({ data }: { data: { date: string; gmv: number; cost: number }[] }) {
    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `RM${v}`} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="gmv" name="Gross Revenue" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="cost" name="Cost" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ─── Pie Chart ─────────────────────────────────────────────────────────────── */
const COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#a855f7'];

export function ImpressionsPieChart({ data }: { data: { name: string; value: number }[] }) {
    return (
        <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                        labelLine={false}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ─── Performance Chart (GMV Area + ROAS Line) ──────────────────────────────── */
export interface PerformanceDataPoint {
    label: string;   // "HH:00" for hourly, "MMM DD" for daily
    gmv: number;
    spend: number;
    roas: number;
    orders: number;
}

interface PerformanceLineChartProps {
    data: PerformanceDataPoint[];
    height?: number;
}

const formatRM = (v: number) => `RM${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function PerformanceLineChart({ data, height = 280 }: PerformanceLineChartProps) {
    // Detect if spend / roas data is available (not all-zero)
    const hasSpend = data.some((d) => d.spend > 0);
    const hasRoas = data.some((d) => d.roas > 0);

    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: hasRoas ? 12 : 4, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis
                        dataKey="label"
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                    />
                    {/* Left Y-axis: RM values */}
                    <YAxis
                        yAxisId="left"
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatRM}
                        width={72}
                    />
                    {/* Right Y-axis: ROAS — only rendered when data has ROAS values */}
                    {hasRoas && (
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#6b7280"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v.toFixed(1)}x`}
                            width={44}
                        />
                    )}
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#111827',
                            borderColor: '#374151',
                            borderRadius: '10px',
                            color: '#f9fafb',
                            fontSize: 12,
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                        }}
                        itemStyle={{ color: '#d1d5db' }}
                        formatter={(value: unknown, name: unknown) => {
                            const v = typeof value === 'number' ? value : 0;
                            const n = typeof name === 'string' ? name : '';
                            if (n === 'ROAS') return [`${v.toFixed(2)}x`, n];
                            if (n === 'Orders') return [v.toLocaleString(), n];
                            return [`RM ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, n];
                        }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }}
                        iconType="circle"
                        iconSize={8}
                    />
                    {/* GMV — always shown */}
                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="gmv"
                        name="GMV"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#gmvGradient)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#6366f1' }}
                    />
                    {/* Ad Spend — only when data exists */}
                    {hasSpend && (
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="spend"
                            name="Ad Spend"
                            stroke="#a855f7"
                            strokeWidth={1.5}
                            fill="url(#spendGradient)"
                            dot={false}
                            strokeDasharray="4 2"
                        />
                    )}
                    {/* ROAS — only when data exists */}
                    {hasRoas && (
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="roas"
                            name="ROAS"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5, fill: '#22c55e' }}
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
