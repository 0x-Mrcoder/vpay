import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    TrendingDown,
    Eye,
    EyeOff,
    Plus,
    Activity,
    CheckCircle2,
    ArrowRight
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
                    <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            {/* Simplified Header */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-xs text-gray-500">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowBalance(!showBalance)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title={showBalance ? "Hide Balance" : "Show Balance"}
                        >
                            {showBalance ? <Eye className="w-5 h-5 text-gray-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                        </button>
                        <Link
                            to="/dashboard/wallet"
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Fund Wallet</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Available Balance - Main Focus */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 md:p-8 rounded-2xl shadow-lg text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-green-100 text-sm font-medium mb-2">Available Balance</p>
                        <p className="text-3xl md:text-4xl font-bold tracking-tight">
                            {showBalance ? formatCurrency(wallet?.availableBalanceNaira || 0) : '••••••••'}
                        </p>
                        {wallet?.lockedBalanceNaira > 0 && (
                            <p className="text-green-100 text-xs mt-3">
                                + {showBalance ? formatCompactCurrency(wallet?.lockedBalanceNaira || 0) : '••••'} locked
                            </p>
                        )}
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Simplified Metrics - 3 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Money In</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {showBalance ? formatCompactCurrency(walletStats?.totalInflowNaira || 0) : '••••••'}
                    </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Money Out</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {showBalance ? formatCompactCurrency(walletStats?.totalOutflowNaira || 0) : '••••••'}
                    </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Activity className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Transactions</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {walletStats?.totalTransactions || 0}
                    </p>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Latest activity on your account</p>
                    </div>
                    <Link
                        to="/dashboard/transactions"
                        className="px-3 py-2 text-sm font-semibold text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                        View all
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="divide-y divide-gray-50">
                    {transactions.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Activity className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-900 font-semibold">No transactions yet</p>
                            <p className="text-sm text-gray-500 mt-1">Your transaction history will appear here</p>
                        </div>
                    ) : (
                        transactions.slice(0, 10).map((txn) => (
                            <div
                                key={txn.id}
                                className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${txn.type === 'credit'
                                            ? 'bg-green-50 text-green-600'
                                            : 'bg-gray-50 text-gray-600'
                                        }`}>
                                        {txn.type === 'credit' ? (
                                            <ArrowDownLeft className="w-5 h-5" />
                                        ) : (
                                            <ArrowUpRight className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 capitalize">{txn.type}</p>
                                        <p className="text-xs text-gray-400 font-mono">{txn.reference}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-gray-900'
                                        }`}>
                                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amountNaira)}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {new Date(txn.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Account Status - Only if verification needed */}
            {(user?.kycLevel === 0 || user?.kycLevel === undefined) && (
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-900">Complete Your Verification</h3>
                            <p className="text-xs text-amber-700 mt-1">
                                Verify your account to unlock higher transaction limits and additional features.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/dashboard/verification"
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                        Verify Now
                    </Link>
                </div>
            )}
        </div>
    );
};
