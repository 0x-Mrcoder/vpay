import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    Eye,
    EyeOff,
    Plus,
    CheckCircle2,
    CreditCard,
    Info,
    Clock,
    ShieldAlert,
    ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Overview: React.FC = () => {
    const { user } = useAuth();
    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [walletStats, setWalletStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showBalance, setShowBalance] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [walletRes, txnsRes, statsRes] = await Promise.all([
                    api.get('/wallet'),
                    api.get('/wallet/transactions?limit=10'),
                    api.get('/wallet/stats')
                ]);
                setWallet(walletRes.data.data);
                setTransactions(txnsRes.data.data.transactions || []);
                setWalletStats(statsRes.data.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatCompactCurrency = (amount: number) => {
        if (amount >= 1000000) {
            return `₦${(amount / 1000000).toFixed(1)}M`;
        }
        if (amount >= 1000) {
            return `₦${(amount / 1000).toFixed(1)}K`;
        }
        return formatCurrency(amount);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
            {/* Verification Banner */}
            {(user?.kycLevel || 0) < 2 && (
                <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-primary-600 flex items-center justify-center flex-shrink-0 animate-pulse-slow">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Verify your identity</h3>
                            <p className="text-primary-800 text-sm font-medium mt-0.5">
                                Upgrade your account to unlock higher limits and unrestricted features.
                            </p>
                        </div>
                    </div>

                    <Link
                        to="/dashboard/verification"
                        className="w-full md:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap relative z-10"
                    >
                        Verify Account
                        <ChevronRight size={18} />
                    </Link>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-gray-500 mt-1">
                        Overview of your account activity
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowBalance(!showBalance)}
                        className="p-2.5 hover:bg-white bg-gray-50 text-gray-500 rounded-xl transition-all border border-transparent hover:border-gray-200 hover:shadow-sm"
                        title={showBalance ? "Hide Balances" : "Show Balances"}
                    >
                        {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                    <Link
                        to="/dashboard/wallet"
                        className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-200 hover:shadow-primary-300 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Fund Wallet
                    </Link>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Balances</h3>

                {/* 3 Colored Cards Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Total Deposits (Money In) */}
                    <div className="bg-cyan-50 p-6 rounded-3xl border border-cyan-100 flex flex-col justify-between h-40 group relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="text-cyan-900 font-semibold text-sm">Total Deposits</span>
                            </div>
                            <div className="group-hover:opacity-100 opacity-0 transition-opacity absolute top-6 right-6" title="Total amount deposited into your wallet">
                                <Info size={16} className="text-cyan-400" />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {showBalance ? formatCompactCurrency(walletStats?.totalInflowNaira || 0) : '••••••'}
                            </p>
                            <p className="text-xs text-cyan-700 mt-1 font-medium">All time deposits</p>
                        </div>
                    </div>

                    {/* Card 2: Locked Balance */}
                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex flex-col justify-between h-40">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                <Wallet size={20} />
                            </div>
                            <span className="text-amber-900 font-semibold text-sm">Locked Balance</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {showBalance ? formatCurrency(wallet?.lockedBalanceNaira || 0) : '••••••'}
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Available Balance (Primary Highlight) */}
                    <div className="bg-gray-100 p-6 rounded-3xl border-2 border-gray-200 flex flex-col justify-between h-40 relative overflow-hidden">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                                <CheckCircle2 size={20} />
                            </div>
                            <span className="text-gray-900 font-semibold text-sm">Available Balance</span>
                        </div>
                        <div className="relative z-10">
                            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                {showBalance ? formatCurrency(wallet?.availableBalanceNaira || 0) : '••••••••'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Active Virtual Accounts</p>
                        <p className="text-xl font-bold text-gray-900">{walletStats?.activeVirtualAccounts || 0}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <ArrowUpRight size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Withdrawal</p>
                        <p className="text-xl font-bold text-gray-900">{formatCompactCurrency(walletStats?.totalOutflowNaira || 0)}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Pending Settlements</p>
                        <p className="text-xl font-bold text-gray-900">{walletStats?.pendingSettlements || 0}</p>
                    </div>
                </div>
            </div>

            {/* Recent Transactions List (Full width below) */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
                    <Link to="/dashboard/transactions" className="text-primary-600 font-medium hover:text-primary-700 text-sm">View All</Link>
                </div>

                <div className="space-y-4">
                    {transactions.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No recent transactions</p>
                    ) : (
                        transactions.slice(0, 5).map((txn) => (
                            <div key={txn.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {txn.type === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{txn.type === 'credit' ? 'Deposit' : 'Withdrawal'}</p>
                                        <p className="text-xs text-gray-500">{new Date(txn.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className={`font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                                    {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amountNaira)}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
