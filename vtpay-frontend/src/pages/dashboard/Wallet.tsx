import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    Wallet as WalletIcon,
    Plus,
    ArrowRight,
    History,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    Clock,
    Lock,
    CreditCard,
    Send
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Wallet: React.FC = () => {
    const [wallet, setWallet] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

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

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            {/* Simplified Header */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <WalletIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Wallet</h1>
                            <p className="text-xs text-gray-500">Manage your funds and transfers</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/dashboard/transactions"
                            className="hidden sm:flex px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors items-center gap-2"
                        >
                            <History className="w-4 h-4" />
                            History
                        </Link>
                        <Link
                            to="/dashboard/payout"
                            className="hidden sm:flex px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Payout
                        </Link>
                        <Link
                            to="/dashboard/virtual-accounts"
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Fund Wallet</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Simplified Main Balance Card */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 md:p-8 rounded-2xl shadow-lg text-white">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <p className="text-green-100 text-sm font-medium mb-2">Total Wallet Balance</p>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                            {formatCurrency(wallet?.balanceNaira || 0)}
                        </h2>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <WalletIcon className="w-6 h-6" />
                    </div>
                </div>

                {/* Balance Breakdown - Simplified */}
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <CheckCircle2 className="w-3 h-3 text-green-300" />
                            <p className="text-green-100 text-xs font-semibold">Cleared</p>
                        </div>
                        <p className="text-lg md:text-xl font-bold">
                            {formatCompactCurrency(wallet?.clearedBalanceNaira || 0)}
                        </p>
                    </div>

                    {pendingBalance > 0 && (
                        <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Clock className="w-3 h-3 text-yellow-300" />
                                <p className="text-green-100 text-xs font-semibold">Pending</p>
                            </div>
                            <p className="text-lg md:text-xl font-bold">
                                {formatCompactCurrency(pendingBalance)}
                            </p>
                        </div>
                    )}


                    <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Lock className="w-3 h-3 text-blue-300" />
                            <p className="text-green-100 text-xs font-semibold">Locked</p>
                        </div>
                        <p className="text-lg md:text-xl font-bold">
                            {formatCompactCurrency(wallet?.lockedBalanceNaira || 0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                            <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Total Received</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCompactCurrency(stats?.totalInflowNaira || 0)}
                    </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Total Sent</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCompactCurrency(stats?.totalOutflowNaira || 0)}
                    </p>
                </div>
            </div>

            {/* Funding Options - Simplified */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div className="mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900">Funding Options</h3>
                    <p className="text-xs text-gray-500 mt-1">Choose how to add funds to your wallet</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Virtual Account - Active */}
                    <Link
                        to="/dashboard/virtual-accounts"
                        className="p-5 rounded-xl border-2 border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                                <CreditCard className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">INSTANT</span>
                        </div>
                        <h4 className="text-base font-bold text-gray-900 mb-1">Virtual Account</h4>
                        <p className="text-sm text-gray-600 mb-4">Transfer from any banking app to your dedicated account number</p>
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                            Get Details
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>

                    {/* Card Payment - Coming Soon */}
                    <div className="p-5 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-60">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Plus className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="px-2.5 py-1 bg-gray-200 text-gray-500 rounded-full text-xs font-bold">SOON</span>
                        </div>
                        <h4 className="text-base font-bold text-gray-700 mb-1">Card Payment</h4>
                        <p className="text-sm text-gray-500 mb-4">Pay with debit or credit card (Mastercard, Visa, Verve)</p>
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
                            Not Available
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
