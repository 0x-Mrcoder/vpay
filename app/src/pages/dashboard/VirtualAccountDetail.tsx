import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    ArrowLeft,
    ArrowUpRight,
    ArrowDownLeft,
    Calendar,
    XCircle,
    Copy,
    Check,
    RefreshCw,
    Wallet,
    Hash
} from 'lucide-react';

export const VirtualAccountDetail: React.FC = () => {
    const { accountNumber } = useParams<{ accountNumber: string }>();
    const navigate = useNavigate();
    const [account, setAccount] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Filter states
    const [dateRange, setDateRange] = useState('all');

    useEffect(() => {
        if (accountNumber) {
            fetchAccountDetails();
        }
    }, [accountNumber]);

    const fetchAccountDetails = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch all accounts first to find the current one
            const accountsRes = await api.get('/virtual-accounts');
            console.log('Accounts Response:', accountsRes.data);

            const allAccounts = accountsRes.data.data || [];
            const foundAccount = allAccounts.find((acc: any) => String(acc.accountNumber) === String(accountNumber));

            if (foundAccount) {
                setAccount(foundAccount);

                // 2. Only fetch transactions if we found the account
                try {
                    const transactionsRes = await api.get(`/virtual-accounts/${accountNumber}/transactions`);
                    setTransactions(transactionsRes.data.data || []);
                } catch (txError) {
                    console.error('Error fetching transactions:', txError);
                    // Don't fail the whole page if transactions fail, just show empty
                    setTransactions([]);
                }
            } else {
                console.warn(`Account ${accountNumber} not found in list of ${allAccounts.length} accounts`);
            }

        } catch (error) {
            console.error('Error fetching account details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
        }).format(amount);
    };

    // Calculate Stats
    const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalTransactions = transactions.length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <XCircle size={32} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Account Not Found</h2>
                <p className="text-gray-500 mt-2 mb-6">The virtual account you are looking for does not exist.</p>
                <button
                    onClick={() => navigate('/dashboard/virtual-accounts')}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard/virtual-accounts')}
                        className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all flex items-center justify-center shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                            {account.accountName}
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {account.status}
                            </span>
                        </h1>
                        <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                            {account.bankName} • {account.accountNumber}
                            <button
                                onClick={() => copyToClipboard(account.accountNumber, 'header-acc')}
                                className="text-gray-400 hover:text-primary-600 transition-colors"
                            >
                                {copiedId === 'header-acc' ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchAccountDetails}
                        className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={48} className="text-primary-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Volume</p>
                    <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalVolume)}</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-400">
                        <span>Lifetime volume</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Hash size={48} className="text-primary-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Transactions</p>
                    <h3 className="text-2xl font-bold text-gray-900">{totalTransactions}</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-400">
                        <span className="text-green-600 flex items-center gap-1">
                            <ArrowDownLeft size={12} /> {transactions.filter(t => t.type === 'credit').length}
                        </span>
                        <span>•</span>
                        <span className="text-red-500 flex items-center gap-1">
                            <ArrowUpRight size={12} /> {transactions.filter(t => t.type === 'debit').length}
                        </span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar size={48} className="text-primary-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Created On</p>
                    <h3 className="text-xl font-bold text-gray-900">
                        {new Date(account.created_at || new Date()).toLocaleDateString('en-NG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-400">
                        <span>Active since creation</span>
                    </div>
                </div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
                        <p className="text-sm text-gray-500">All running transactions on this account</p>
                    </div>

                    {/* Filters - simplified for now */}
                    <div className="flex items-center gap-2">
                        <select
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                                        No transactions found for this account
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {tx.type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                </div>
                                                <span className={`text-sm font-semibold capitalize ${tx.type === 'credit' ? 'text-green-700' : 'text-gray-700'
                                                    }`}>
                                                    {tx.type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 group/copy cursor-pointer w-fit" onClick={() => copyToClipboard(tx.reference || tx.id, tx.id)}>
                                                <span className="text-sm font-mono font-medium text-gray-600 group-hover/copy:text-primary-600 transition-colors">
                                                    {tx.reference || 'N/A'}
                                                </span>
                                                {copiedId === tx.id ? (
                                                    <Check size={12} className="text-green-500" />
                                                ) : (
                                                    <Copy size={12} className="text-gray-300 group-hover/copy:text-primary-500 opacity-0 group-hover/copy:opacity-100 transition-all" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'
                                                }`}>
                                                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {new Date(tx.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(tx.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${tx.status === 'success' ? 'bg-green-100 text-green-700' :
                                                tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
