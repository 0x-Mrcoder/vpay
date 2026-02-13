import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    Wallet as WalletIcon,
    Plus,
    ArrowRight,
    History,
    ArrowUpRight,
    ArrowDownLeft,
    CreditCard,
    Send,
    Lock,
    Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { VerificationAlert } from '../../components/dashboard/VerificationAlert';

export const Wallet: React.FC = () => {
    const { user } = useAuth();
    const [wallet, setWallet] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if ((user?.kycLevel ?? 0) >= 3) {
            fetchData();
        } else {
            setIsLoading(false);
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const [walletRes, statsRes] = await Promise.all([
                api.get('/wallet'),
                api.get('/wallet/stats')
            ]);
            setWallet(walletRes.data.data);
            setStats(statsRes.data.data);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatCompactCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium">Loading wallet...</p>
                </div>
            </div>
        );
    }

    const pendingBalance = (wallet?.balanceNaira || 0) - (wallet?.clearedBalanceNaira || 0) - (wallet?.lockedBalanceNaira || 0);
    const isVerified = (user?.kycLevel ?? 0) >= 3;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Wallet</h1>
                    <p className="text-gray-500 mt-1">
                        Manage your funds and transfers
                    </p>
                </div>
                {isVerified && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            to="/dashboard/transactions"
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-2"
                        >
                            <History className="w-4 h-4" />
                            <span className="hidden sm:inline">History</span>
                        </Link>
                        <Link
                            to="/dashboard/payout"
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            <span className="hidden sm:inline">Payout</span>
                        </Link>
                        <Link
                            to="/dashboard/virtual-accounts"
                            className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-200 hover:shadow-primary-300 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Fund Wallet</span>
                        </Link>
                    </div>
                )}
            </div>

            {!isVerified ? (
                <VerificationAlert />
            ) : (
                <>
                    {/* Main Balance Card - Primary Gold Theme */}
                    <div className="bg-primary-500 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-primary-200 relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div className="space-y-2 w-full md:w-auto">
                                <div className="flex items-center gap-2 text-primary-100">
                                    <WalletIcon className="w-5 h-5" />
                                    <span className="font-medium text-sm tracking-wide uppercase">Total Balance</span>
                                </div>
                                <h2 className={`font-extrabold tracking-tight break-all md:break-normal ${(wallet?.balanceNaira || 0).toString().length > 10
                                    ? 'text-3xl md:text-4xl'
                                    : 'text-4xl md:text-5xl'
                                    }`}>
                                    {formatCurrency(wallet?.balanceNaira || 0)}
                                </h2>
                            </div>

                            {/* Balance Breakdown Pills */}
                            <div className="flex flex-wrap gap-3">
                                {/* Cleared Balance - High Visibility (White) */}
                                <div className="px-5 py-3 bg-white rounded-2xl shadow-sm flex flex-col items-start min-w-[120px]">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Cleared</span>
                                    </div>
                                    <span className="font-extrabold text-2xl text-gray-900 tracking-tight">{formatCompactCurrency(wallet?.clearedBalanceNaira || 0)}</span>
                                </div>

                                {/* Locked Balance - Distinct (Darker/Contrast) */}
                                <div className="px-5 py-3 bg-primary-800/40 backdrop-blur-md rounded-2xl border border-primary-400/30 flex flex-col items-start min-w-[120px]">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Lock className="w-3 h-3 text-primary-200" />
                                        <span className="text-primary-100 text-xs font-bold uppercase tracking-wider">Locked</span>
                                    </div>
                                    <span className="font-extrabold text-2xl text-white tracking-tight">{formatCompactCurrency(wallet?.lockedBalanceNaira || 0)}</span>
                                </div>

                                {pendingBalance > 0 && (
                                    <div className="px-5 py-3 bg-yellow-400/90 text-yellow-900 rounded-2xl shadow-sm flex flex-col items-start min-w-[120px]">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Clock className="w-3 h-3 text-yellow-800" />
                                            <span className="text-yellow-900/80 text-xs font-bold uppercase tracking-wider">Pending</span>
                                        </div>
                                        <span className="font-extrabold text-2xl text-yellow-950 tracking-tight">{formatCompactCurrency(pendingBalance)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group">
                            <div className="space-y-1">
                                <p className="text-gray-500 font-medium text-sm">Total Received</p>
                                <p className="text-2xl font-bold text-gray-900 group-hover:text-cyan-600 transition-colors">
                                    {formatCompactCurrency(stats?.totalInflowNaira || 0)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                                <ArrowDownLeft className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group">
                            <div className="space-y-1">
                                <p className="text-gray-500 font-medium text-sm">Total Sent</p>
                                <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {formatCompactCurrency(stats?.totalOutflowNaira || 0)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <ArrowUpRight className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Funding Options */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Funding Options</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Virtual Account - Active */}
                            <Link
                                to="/dashboard/virtual-accounts"
                                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-primary-200 hover:shadow-md transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <CreditCard size={100} className="text-primary-500 rotate-12" />
                                </div>

                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-4 group-hover:scale-110 transition-transform">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 mb-1">Virtual Account</h4>
                                    <p className="text-gray-500 text-sm mb-4">Instant funding via bank transfer to your dedicated account.</p>
                                    <div className="flex items-center gap-2 text-primary-600 font-bold text-sm bg-primary-50 w-fit px-3 py-1.5 rounded-lg">
                                        Fund Now <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>

                            {/* Card Payment - Coming Soon */}
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 opacity-70 relative overflow-hidden cursor-not-allowed">
                                <div className="absolute top-4 right-4">
                                    <span className="px-3 py-1 bg-gray-200 text-gray-500 rounded-full text-xs font-bold uppercase tracking-wide">Coming Soon</span>
                                </div>

                                <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400 mb-4">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <h4 className="text-lg font-bold text-gray-700 mb-1">Card Payment</h4>
                                <p className="text-gray-500 text-sm mb-4">Fund your wallet using your debit or credit card directly.</p>
                                <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                                    Not available yet
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
