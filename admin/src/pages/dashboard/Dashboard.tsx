import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import BarChart from '../../components/charts/BarChart';

import Badge from '../../components/common/Badge';

const Dashboard: React.FC = () => {
    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth() + 1);

    const { data: stats, isLoading: loading, refetch } = useQuery({
        queryKey: ['dashboard-stats', selectedYear, selectedMonth],
        queryFn: () => adminApi.getStats({ year: selectedYear, month: selectedMonth }),
        refetchInterval: 30000,
        staleTime: 10000,
    });

    const years = [2024, 2025, 2026];
    const months = [
        { val: 1, name: 'January' }, { val: 2, name: 'February' }, { val: 3, name: 'March' },
        { val: 4, name: 'April' }, { val: 5, name: 'May' }, { val: 6, name: 'June' },
        { val: 7, name: 'July' }, { val: 8, name: 'August' }, { val: 9, name: 'September' },
        { val: 10, name: 'October' }, { val: 11, name: 'November' }, { val: 12, name: 'December' }
    ];

    const { data: cronStatus } = useQuery({
        queryKey: ['cron-status'],
        queryFn: adminApi.getSystemStatus,
        refetchInterval: 60000,
    });

    const { data: connectivity } = useQuery({
        queryKey: ['connectivity'],
        queryFn: adminApi.verifyConnectivity,
        refetchInterval: 120000,
    });

    const CronStatusBadge = () => {
        const isRunning = cronStatus?.isRunning;
        return (
            <Badge variant={isRunning ? 'success' : 'error'}>
                {isRunning ? 'RUNNING' : 'STOPPED'}
            </Badge>
        );
    };

    const ConnectivityBadge = () => {
        const isSuccess = connectivity?.success;
        return (
            <Badge variant={isSuccess ? 'success' : 'error'}>
                {isSuccess ? 'CONNECTED' : 'DISCONNECTED'}
            </Badge>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
            notation: 'compact',
            compactDisplay: 'short'
        }).format(amount / 100);
    };

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">Payment Operations Dashboard</h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Real-time financial monitoring and control</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Period Selectors */}
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none border-none py-1 px-2 cursor-pointer"
                        >
                            {months.map(m => (
                                <option key={m.val} value={m.val}>{m.name}</option>
                            ))}
                        </select>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none border-none py-1 px-2 cursor-pointer"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => refetch()}
                        className="flex-none p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-md shadow-primary-200 active:scale-95 flex items-center justify-center"
                        title="Refresh Data"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Financial Summaries Grid */}
            <div className="space-y-6">
                {/* Daily Overview */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="w-2 h-6 bg-primary-500 rounded-full"></div>
                        Today's Overview
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Inflow</p>
                            <h3 className="text-2xl font-bold text-primary-600 mt-2">
                                {formatCurrency(stats?.transactions?.dailyInflow || 0)}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary-500 bg-primary-50 w-fit px-2 py-0.5 rounded-full">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                                </span>
                                LIVE
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Outflow</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-2">
                                {formatCurrency(stats?.transactions?.dailyOutflow || 0)}
                            </h3>
                        </div>
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Success Rate</p>
                            <h3 className="text-2xl font-bold text-green-600 mt-2">
                                {stats?.transactions?.successCount > 0
                                    ? Math.round((stats.transactions.successCount / (stats.transactions.successCount + stats.transactions.failedCount)) * 100)
                                    : 100}%
                            </h3>
                        </div>
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Fee</p>
                            <h3 className="text-2xl font-bold text-blue-600 mt-2">
                                {formatCurrency(stats?.transactions?.dailyFee || 0)}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Monthly & Yearly Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Card */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{months.find(m => m.val === selectedMonth)?.name} {selectedYear}</h3>
                                <p className="text-xs text-slate-500 font-medium">Filtered monthly performance</p>
                            </div>
                            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Inflow</p>
                                <p className="text-2xl font-bold text-primary-600">{formatCurrency(stats?.transactions?.monthlyInflow || 0)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Outflow</p>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.transactions?.monthlyOutflow || 0)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Yearly Card */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Annual Summary ({selectedYear})</h3>
                                <p className="text-xs text-slate-500 font-medium">Year-to-date performance</p>
                            </div>
                            <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                </svg>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Annual Inflow</p>
                                <p className="text-2xl font-bold text-primary-600">{formatCurrency(stats?.transactions?.yearlyInflow || 0)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Annual Outflow</p>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.transactions?.yearlyOutflow || 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quarterly Summary */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="w-2 h-6 bg-slate-400 rounded-full"></div>
                        Quarterly Performance ({selectedYear})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
                            const qData = stats?.transactions?.quarters?.[q.toLowerCase()];
                            return (
                                <div key={q} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{q} Summary</p>
                                        <div className="mt-4">
                                            <p className="text-[10px] font-bold text-primary-600 uppercase mb-1">Inflow</p>
                                            <p className="text-xl font-bold text-slate-900 tracking-tight">{formatCurrency(qData?.inflow || 0)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Outflow</p>
                                        <p className="text-sm font-semibold text-slate-600">{formatCurrency(qData?.outflow || 0)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Operational Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0 text-yellow-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Pending</p>
                            <p className="text-lg font-bold text-slate-900">{stats?.transactions?.pendingCount || 0}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 text-red-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Failed</p>
                            <p className="text-lg font-bold text-slate-900">{stats?.transactions?.failedCount || 0}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 text-green-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Successful</p>
                            <p className="text-lg font-bold text-slate-900">{stats?.transactions?.successCount || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Analytics Section */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
                <BarChart
                    title="Total Transactions (All Time)"
                    data={{
                        labels: ['Successful', 'Pending', 'Failed'],
                        datasets: [
                            {
                                label: 'Transaction Count',
                                data: [
                                    stats?.transactions?.successCount || 0,
                                    stats?.transactions?.pendingCount || 0,
                                    stats?.transactions?.failedCount || 0
                                ],
                                backgroundColor: [
                                    '#22c55e', // Success - Green
                                    '#eab308', // Pending - Yellow
                                    '#ef4444', // Failed - Red
                                ],
                            }
                        ]
                    }}
                />
            </div>


            {/* System Health Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
                {/* System Infrastructure */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">System Infrastructure</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-2xl border border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900">PalmPay Connectivity</span>
                                <span className="text-[10px] text-slate-500">Upstream API Status</span>
                            </div>
                            <ConnectivityBadge />
                        </div>

                        <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-2xl border border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900">Automation Engine</span>
                                <span className="text-[10px] text-slate-500">Cron Job Scheduler</span>
                            </div>
                            <CronStatusBadge />
                        </div>

                        <div className="pt-2">
                            <div className="bg-primary-50 p-3 rounded-2xl border border-primary-100">
                                <p className="text-[10px] text-primary-700 font-medium leading-relaxed">
                                    System background workers are monitoring settlement clearance and vault synchronization.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Tenants */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">Tenants Overview</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl">
                            <span className="text-sm text-slate-500 font-medium">Total Tenants</span>
                            <span className="text-base font-bold text-slate-900">{stats?.tenants?.total || 0}</span>
                        </div>
                        <div className="flex justify-between items-center px-2">
                            <span className="text-sm text-slate-500">Active</span>
                            <span className="text-sm font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{stats?.tenants?.active || 0}</span>
                        </div>
                        <div className="flex justify-between items-center px-2">
                            <span className="text-sm text-slate-500">Suspended</span>
                            <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{stats?.tenants?.suspended || 0}</span>
                        </div>
                        <div className="flex justify-between items-center px-2 border-t border-slate-50 pt-2">
                            <span className="text-sm text-slate-500">Admin Users</span>
                            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{stats?.tenants?.admins || 0}</span>
                        </div>
                        <div className="flex justify-between items-center px-2">
                            <span className="text-sm text-slate-500">Pending</span>
                            <span className="text-sm font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">{stats?.tenants?.pending || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table (DF Table) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Transactions</h3>
                        <button
                            onClick={() => window.location.href = '/transactions'}
                            className="px-4 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-xs font-bold transition-all"
                        >
                            View All
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="hidden md:table-cell px-4 md:px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Reference</th>
                                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Type</th>
                                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Fee</th>
                                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats?.recentTransactions?.length > 0 ? (
                                    stats.recentTransactions.map((txn: any) => (
                                        <tr key={txn._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="hidden md:table-cell px-4 md:px-6 py-4 text-sm font-medium text-slate-900 font-mono">{txn.reference}</td>
                                            <td className="px-4 md:px-6 py-4 text-sm text-slate-600 capitalize">{txn.category}</td>
                                            <td className="px-4 md:px-6 py-4 text-sm font-semibold text-slate-900">{formatCurrency(txn.amount)}</td>
                                            <td className="px-4 md:px-6 py-4 text-sm font-semibold text-purple-600">{formatCurrency(txn.fee || 0)}</td>
                                            <td className="px-4 md:px-6 py-4">
                                                <Badge variant={
                                                    txn.status === 'success' ? 'success' :
                                                        txn.status === 'pending' ? 'warning' : 'error'
                                                }>
                                                    {txn.status.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 text-sm text-slate-500">
                                                {new Date(txn.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                            No recent transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
        </div>
    );
};

export default Dashboard;
