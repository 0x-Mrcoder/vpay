import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
    { name: 'Mon', value: 150000 },
    { name: 'Tue', value: 230000 },
    { name: 'Wed', value: 180000 },
    { name: 'Thu', value: 320000 },
    { name: 'Fri', value: 290000 },
    { name: 'Sat', value: 140000 },
    { name: 'Sun', value: 190000 },
];

export const TransactionChart: React.FC = () => {
    return (
        <div className="h-[300px] w-full animate-fade-in">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#0F172A', fontWeight: 600, fontSize: '14px' }}
                        formatter={(value: any) => [value ? `₦${Number(value).toLocaleString()}` : '₦0', 'Volume']}
                        cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#16A34A"
                        fill="url(#colorValue)"
                        strokeWidth={3}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#16A34A' }}
                    />
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
