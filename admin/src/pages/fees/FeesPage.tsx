import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';

interface FeeRule {
    _id: string;
    name: string;
    type: 'flat' | 'percentage' | 'tiered';
    value: number;
    currency: string;
    minAmount?: number;
    maxAmount?: number;
    cap?: number;
    category: 'deposit' | 'transfer' | 'withdrawal' | 'utility';
    paymentMethod?: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

interface RevenuePeriod {
    payin: { fee: number; volume: number; count: number };
    payout: { fee: number; volume: number; count: number };
    totalFee: number;
    totalVolume: number;
}

interface RevenueData {
    day: RevenuePeriod;
    week: RevenuePeriod;
    month: RevenuePeriod;
    year: RevenuePeriod;
}

type Period = 'day' | 'week' | 'month' | 'year';

const fmt = (n: number) =>
    '₦' + (n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FeesPage: React.FC = () => {
    const [fees, setFees] = useState<FeeRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [revenueLoading, setRevenueLoading] = useState(true);
    const [revenue, setRevenue] = useState<RevenueData | null>(null);
    const [activePeriod, setActivePeriod] = useState<Period>('month');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedFee, setSelectedFee] = useState<FeeRule | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [formData, setFormData] = useState<Partial<FeeRule>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchFees();
        fetchRevenue();
    }, []);

    const fetchFees = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getFees();
            setFees(data);
        } catch (error) {
            console.error('Failed to fetch fees:', error);
            toast.error('Failed to fetch fees');
        } finally {
            setLoading(false);
        }
    };

    const fetchRevenue = async () => {
        try {
            setRevenueLoading(true);
            const data = await adminApi.getFeeRevenue();
            setRevenue(data);
        } catch (error) {
            console.error('Failed to fetch revenue:', error);
        } finally {
            setRevenueLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (selectedFee) {
                await adminApi.updateFee(selectedFee._id, formData);
                toast.success('Fee rule updated successfully');
            } else {
                await adminApi.createFee(formData);
                toast.success('Fee rule created successfully');
            }
            setShowCreateModal(false);
            setSelectedFee(null);
            setFormData({});
            fetchFees();
        } catch (error) {
            console.error('Failed to save fee:', error);
            toast.error('Failed to save fee rule');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this fee rule?')) return;
        try {
            await adminApi.deleteFee(id);
            toast.success('Fee rule deleted successfully');
            fetchFees();
        } catch (error) {
            console.error('Failed to delete fee:', error);
            toast.error('Failed to delete fee rule');
        }
    };

    const getCategoryBadge = (category: string) => {
        const badges = {
            deposit: 'bg-primary-100 text-primary-800',
            transfer: 'bg-blue-100 text-blue-800',
            withdrawal: 'bg-orange-100 text-orange-800',
            utility: 'bg-purple-100 text-purple-800',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[category as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
                {category.toUpperCase()}
            </span>
        );
    };

    const filteredFees = fees.filter(fee =>
        filterCategory === 'all' || fee.category === filterCategory
    );

    const periodData: RevenuePeriod = revenue?.[activePeriod] || {
        payin: { fee: 0, volume: 0, count: 0 },
        payout: { fee: 0, volume: 0, count: 0 },
        totalFee: 0,
        totalVolume: 0,
    };

    const periodLabels: Record<Period, string> = {
        day: 'Today',
        week: 'This Week',
        month: 'This Month',
        year: 'This Year',
    };

    const profitMargin = periodData.totalVolume > 0
        ? ((periodData.totalFee / periodData.totalVolume) * 100).toFixed(2)
        : '0.00';

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">Fee Management</h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Configure transaction fees and track revenue analytics</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchRevenue}
                        className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                        ↻ Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm active:scale-95"
                    >
                        + Add Fee Rule
                    </button>
                </div>
            </div>

            {/* Revenue Analytics Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h2 className="text-base md:text-lg font-semibold text-slate-900">Revenue Analytics</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Fee income generated from platform transactions</p>
                        </div>
                        {/* Period Tabs */}
                        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                            {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setActivePeriod(p)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activePeriod === p
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {revenueLoading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
                        <p className="mt-2 text-sm text-slate-500">Loading revenue data...</p>
                    </div>
                ) : (
                    <div className="p-4 md:p-6">
                        <p className="text-xs text-slate-400 mb-4 font-medium uppercase tracking-wider">{periodLabels[activePeriod]}</p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {/* Total Revenue */}
                            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 border border-primary-200">
                                <p className="text-xs font-medium text-primary-700">Total Revenue</p>
                                <p className="text-xl font-bold text-primary-900 mt-1">{fmt(periodData.totalFee)}</p>
                                <p className="text-xs text-primary-600 mt-1">Vol: {fmt(periodData.totalVolume)}</p>
                            </div>

                            {/* Profit Margin */}
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                                <p className="text-xs font-medium text-emerald-700">Profit Margin</p>
                                <p className="text-xl font-bold text-emerald-900 mt-1">{profitMargin}%</p>
                                <p className="text-xs text-emerald-600 mt-1">Fee / Volume</p>
                            </div>

                            {/* Pay-in Revenue */}
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                <p className="text-xs font-medium text-blue-700">Pay-in Fees</p>
                                <p className="text-xl font-bold text-blue-900 mt-1">{fmt(periodData.payin.fee)}</p>
                                <p className="text-xs text-blue-600 mt-1">{periodData.payin.count} deposits</p>
                            </div>

                            {/* Payout Revenue */}
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                                <p className="text-xs font-medium text-orange-700">Payout Fees</p>
                                <p className="text-xl font-bold text-orange-900 mt-1">{fmt(periodData.payout.fee)}</p>
                                <p className="text-xs text-orange-600 mt-1">{periodData.payout.count} withdrawals</p>
                            </div>
                        </div>

                        {/* Breakdown Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Transactions</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Volume</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Fee Collected</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <span className="font-medium text-slate-900">Pay-in (Deposits)</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700">{periodData.payin.count.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">{fmt(periodData.payin.volume)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-blue-700">{fmt(periodData.payin.fee)}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {periodData.payin.volume > 0 ? ((periodData.payin.fee / periodData.payin.volume) * 100).toFixed(2) : '0.00'}%
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                                <span className="font-medium text-slate-900">Payout (Withdrawals)</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700">{periodData.payout.count.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">{fmt(periodData.payout.volume)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-orange-700">{fmt(periodData.payout.fee)}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {periodData.payout.volume > 0 ? ((periodData.payout.fee / periodData.payout.volume) * 100).toFixed(2) : '0.00'}%
                                        </td>
                                    </tr>
                                    <tr className="bg-slate-50 font-semibold">
                                        <td className="px-4 py-3 text-slate-900">Total</td>
                                        <td className="px-4 py-3 text-right text-slate-900">
                                            {(periodData.payin.count + periodData.payout.count).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-900">{fmt(periodData.totalVolume)}</td>
                                        <td className="px-4 py-3 text-right text-primary-700">{fmt(periodData.totalFee)}</td>
                                        <td className="px-4 py-3 text-right text-slate-900">{profitMargin}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* All Periods Summary */}
                        {revenue && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setActivePeriod(p)}
                                        className={`p-3 rounded-xl border text-left transition-all ${activePeriod === p ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                                    >
                                        <p className="text-xs text-slate-500">{periodLabels[p]}</p>
                                        <p className={`text-sm font-bold mt-0.5 ${activePeriod === p ? 'text-primary-700' : 'text-slate-800'}`}>
                                            {fmt(revenue[p].totalFee)}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {(revenue[p].payin.count + revenue[p].payout.count)} txns
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Fee Rules Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Active Rules</p>
                    <h3 className="text-lg md:text-2xl font-bold text-slate-900 mt-1 md:mt-2">
                        {fees.filter(f => f.status === 'active').length}
                    </h3>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <p className="text-xs md:text-sm font-medium text-slate-500">VA Transaction Fees</p>
                    <h3 className="text-lg md:text-2xl font-bold text-primary-600 mt-1 md:mt-2">
                        {fees.filter(f => f.category === 'deposit').length}
                    </h3>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Payout Fees</p>
                    <h3 className="text-lg md:text-2xl font-bold text-orange-600 mt-1 md:mt-2">
                        {fees.filter(f => f.category === 'withdrawal').length}
                    </h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row gap-4">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                        <option value="all">All Categories</option>
                        <option value="deposit">VA Transaction Fees</option>
                        <option value="withdrawal">Payout Fees</option>
                        <option value="transfer">Transfer</option>
                        <option value="utility">Utility</option>
                    </select>
                </div>
            </div>

            {/* Fees Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
                        <p className="mt-2 text-slate-500">Loading fees...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] md:min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                                    <th className="hidden md:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                                    <th className="hidden lg:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conditions</th>
                                    <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredFees.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            No fee rules found. Create your first fee rule.
                                        </td>
                                    </tr>
                                ) : filteredFees.map((fee) => (
                                    <tr key={fee._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">{fee.name}</div>
                                            {fee.paymentMethod && (
                                                <div className="text-xs text-slate-500">Method: {fee.paymentMethod}</div>
                                            )}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            {getCategoryBadge(fee.category)}
                                        </td>
                                        <td className="hidden md:table-cell px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                                            {fee.type}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-slate-900">
                                                {fee.type === 'percentage' ? `${fee.value}%` : `₦${fee.value}`}
                                            </span>
                                            {fee.cap && (
                                                <div className="text-xs text-slate-500">Cap: ₦{fee.cap}</div>
                                            )}
                                        </td>
                                        <td className="hidden lg:table-cell px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {fee.minAmount ? `Min: ₦${fee.minAmount}` : 'No min'}
                                            <br />
                                            {fee.maxAmount ? `Max: ₦${fee.maxAmount}` : 'No max'}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 md:px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${fee.status === 'active' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {fee.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedFee(fee);
                                                        setFormData(fee);
                                                        setShowCreateModal(true);
                                                    }}
                                                    className="text-primary-600 hover:text-primary-900"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(fee._id)}
                                                    className="text-red-600 hover:text-red-900 hidden sm:inline"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex justify-between items-start">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {selectedFee ? 'Edit Fee Rule' : 'Create Fee Rule'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setSelectedFee(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="e.g., Standard Transfer Fee"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                    <select
                                        value={formData.category || 'transfer'}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="deposit">VA Transaction Fee (Pay-in)</option>
                                        <option value="withdrawal">Payout Fee</option>
                                        <option value="transfer">Transfer</option>
                                        <option value="utility">Utility</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                    <select
                                        value={formData.type || 'flat'}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="flat">Flat Amount</option>
                                        <option value="percentage">Percentage</option>
                                        <option value="tiered">Tiered</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.value || ''}
                                        onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cap (Optional)</label>
                                    <input
                                        type="number"
                                        value={formData.cap || ''}
                                        onChange={(e) => setFormData({ ...formData, cap: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Max fee amount"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setSelectedFee(null);
                                        setFormData({});
                                    }}
                                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : (selectedFee ? 'Update Rule' : 'Create Rule')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeesPage;
