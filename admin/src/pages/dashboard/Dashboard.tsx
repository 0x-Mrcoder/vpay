import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import BarChart from '../../components/charts/BarChart';

import Badge from '../../components/common/Badge';

const Dashboard: React.FC = () => {
    const { data: stats, isLoading: loading, refetch } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: adminApi.getStats,
        refetchInterval: 30000,
        staleTime: 10000,
    });

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
        }).format(amount / 100);
    };

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">Payment Operations Dashboard</h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Real-time financial monitoring and control</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm active:scale-95"
                >
                    Refresh Data
                </button>
            </div>

            {/* Critical Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Inflow */}
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs md:text-sm font-medium text-slate-500">Total Inflow (Today)</p>
                            <h3 className="text-xl md:text-2xl font-bold text-primary-600 mt-1 md:mt-2 tracking-tight">
                                {formatCurrency(stats?.transactions?.totalInflow || 0)}
                            </h3>
                            <p className="text-[10px] md:text-xs text-primary-600 font-bold mt-1">Live from server</p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Total Outflow */}
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs md:text-sm font-medium text-slate-500">Total Outflow (Today)</p>
                            <h3 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 md:mt-2 tracking-tight">
                                {formatCurrency(stats?.transactions?.totalOutflow || 0)}
                            </h3>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Live from server</p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Pending Transactions */}
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs md:text-sm font-medium text-slate-500">Pending Transactions</p>
                            <h3 className="text-xl md:text-2xl font-bold text-yellow-600 mt-1 md:mt-2 tracking-tight">
                                {stats?.transactions?.pendingCount || 0}
                            </h3>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Needs processing</p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Failed Transactions */}
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs md:text-sm font-medium text-slate-500">Failed Transactions</p>
                            <h3 className="text-xl md:text-2xl font-bold text-red-600 mt-1 md:mt-2 tracking-tight">
                                {stats?.transactions?.failedCount || 0}
                            </h3>
                            <p className="text-[10px] md:text-xs text-red-600 font-bold mt-1">Needs attention</p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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
                            <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{stats?.tenants?.active || 0}</span>
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
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            No recent transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
