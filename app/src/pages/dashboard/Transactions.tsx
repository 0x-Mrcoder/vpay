import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Calendar,
    MoreHorizontal,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { VerificationAlert } from '../../components/dashboard/VerificationAlert';

export const Transactions: React.FC = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: '',
        startDate: '',
        endDate: '',
        search: '',
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const isVerified = (user?.kycLevel ?? 0) >= 3;

    useEffect(() => {
        if (isVerified) {
            fetchTransactions();
        } else {
            setIsLoading(false);
        }
    }, [filters, page, isVerified]);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            let query = `/transactions?limit=15&page=${page}`;
            if (filters.type) query += `&type=${filters.type}`;
            if (filters.startDate) query += `&startDate=${filters.startDate}`;
            if (filters.endDate) query += `&endDate=${filters.endDate}`;
            if (filters.search) query += `&search=${filters.search}`;

            const response = await api.get(query);
            setTransactions(response.data.data.transactions || []);
            setTotalPages(response.data.data.totalPages || 1);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setPage(1);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'success':
                return {
                    className: 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
                    icon: <CheckCircle2 size={12} />
                };
            case 'pending':
                return {
                    className: 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-700',
                    icon: <Clock size={12} />
                };
            case 'failed':
                return {
                    className: 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
                    icon: <XCircle size={12} />
                };
            default:
                return {
                    className: 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700',
                    icon: <Clock size={12} />
                };
        }
    };

    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

    const handleTransactionClick = (txn: any) => {
        setSelectedTransaction(txn);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Transactions</h1>
                    <p className="text-sm text-gray-500 mt-1">Monitor and manage all your financial activities</p>
                </div>
                {isVerified && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                            onClick={fetchTransactions}
                            className="flex-1 sm:flex-none p-2.5 rounded-xl border border-gray-200 hover:border-primary-200 hover:bg-primary-50 transition-all duration-200 text-gray-700 flex items-center justify-center gap-2 group"
                            title="Refresh"
                        >
                            <RefreshCw size={18} className={`group-hover:text-primary-600 ${isLoading ? 'animate-spin' : ''}`} />
                            <span className="sm:hidden font-semibold">Refresh</span>
                        </button>
                        <button className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-gray-200 hover:border-primary-200 hover:bg-primary-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 group">
                            <Download size={18} className="group-hover:text-primary-600" />
                            Export CSV
                        </button>
                    </div>
                )}
            </div>

            {!isVerified ? (
                <VerificationAlert />
            ) : (
                <>
                    {/* Filters Bar */}
                    <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    name="search"
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                    placeholder="Search by reference or narration..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all text-sm font-medium"
                                />
                            </div>

                            {/* Filter Controls */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1 sm:flex-none">
                                    <select
                                        name="type"
                                        value={filters.type}
                                        onChange={handleFilterChange}
                                        className="w-full sm:w-auto appearance-none pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all bg-white text-sm font-medium cursor-pointer"
                                    >
                                        <option value="">All Types</option>
                                        <option value="credit">Credit</option>
                                        <option value="debit">Debit</option>
                                    </select>
                                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                </div>

                                <div className="flex flex-1 items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl border border-gray-200 bg-white overflow-x-auto focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-100 transition-all">
                                    <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={filters.startDate}
                                        onChange={handleFilterChange}
                                        className="text-xs md:text-sm outline-none border-none bg-transparent font-medium text-gray-700 placeholder-gray-400"
                                    />
                                    <span className="text-gray-400 text-[10px] uppercase font-bold">to</span>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={filters.endDate}
                                        onChange={handleFilterChange}
                                        className="text-xs md:text-sm outline-none border-none bg-transparent font-medium text-gray-700 placeholder-gray-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table/List */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={6} className="p-6">
                                                    <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                                        <Search size={32} className="text-gray-300" />
                                                    </div>
                                                    <h3 className="text-gray-900 font-bold">No transactions found</h3>
                                                    <p className="text-sm text-gray-500">Try adjusting your filters or search terms</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((txn) => {
                                            const status = getStatusStyles(txn.status);
                                            return (
                                                <tr
                                                    key={txn.id}
                                                    className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                                                    onClick={() => handleTransactionClick(txn)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${txn.type === 'credit'
                                                                ? 'bg-green-100 text-green-600'
                                                                : 'bg-blue-50 text-blue-600'
                                                                }`}>
                                                                {txn.type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 capitalize">{txn.type}</p>
                                                                <p className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate font-medium" title={txn.narration}>
                                                                    {txn.narration || 'No description'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className={`text-sm font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                                                            {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amountNaira)}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-mono text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 group-hover:border-gray-200 transition-colors">
                                                            {txn.reference}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={status.className}>
                                                            {status.icon}
                                                            {txn.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-xs font-medium text-gray-700">
                                                            {new Date(txn.createdAt).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                                            {new Date(txn.createdAt).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                                                            <MoreHorizontal size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-4 animate-pulse space-y-3">
                                        <div className="flex justify-between">
                                            <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                                            <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                                        </div>
                                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                                    </div>
                                ))
                            ) : transactions.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                            <Search size={32} className="text-gray-300" />
                                        </div>
                                        <h3 className="text-gray-900 font-bold">No transactions found</h3>
                                        <p className="text-sm text-gray-500">Try adjusting your filters</p>
                                    </div>
                                </div>
                            ) : (
                                transactions.map((txn) => {
                                    const status = getStatusStyles(txn.status);
                                    return (
                                        <div
                                            key={txn.id}
                                            className="p-4 active:bg-gray-50 transition-colors"
                                            onClick={() => handleTransactionClick(txn)}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${txn.type === 'credit'
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-blue-50 text-blue-600'
                                                        }`}>
                                                        {txn.type === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 capitalize text-sm">{txn.type}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono">{txn.reference}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                                                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amountNaira)}
                                                    </p>
                                                    <div className={`${status.className} mt-1 !py-0.5 !px-2 !text-[10px] inline-flex`}>
                                                        {txn.status}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-gray-500 truncate flex-1 mr-4">
                                                    {txn.narration || 'No description'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 flex-shrink-0">
                                                    {new Date(txn.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-4 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-sm text-gray-500 font-medium">
                                Showing page <span className="text-gray-900 font-bold">{page}</span> of <span className="text-gray-900 font-bold">{totalPages}</span>
                            </p>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1 || isLoading}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-white hover:border-primary-300 hover:text-primary-600 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold text-gray-600"
                                >
                                    <ChevronLeft size={18} />
                                    <span>Prev</span>
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages || isLoading}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-white hover:border-primary-300 hover:text-primary-600 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold text-gray-600"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Transaction Details Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedTransaction(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 space-y-6" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedTransaction(null)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <XCircle size={24} />
                        </button>

                        {/* Title */}
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
                            <p className="text-sm text-gray-500">View complete summary of this transaction</p>
                        </div>

                        {/* Amount & Status Panel */}
                        <div className="bg-gray-50 rounded-2xl p-6 flex flex-col items-center justify-center border border-gray-100">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${selectedTransaction.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                {selectedTransaction.type === 'credit' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                            </div>
                            <h2 className={`text-3xl font-extrabold ${selectedTransaction.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                                {selectedTransaction.type === 'credit' ? '+' : '-'}{formatCurrency(selectedTransaction.amountNaira)}
                            </h2>
                            <div className={`mt-2 ${getStatusStyles(selectedTransaction.status).className}`}>
                                {getStatusStyles(selectedTransaction.status).icon}
                                <span className="uppercase tracking-wide">{selectedTransaction.status}</span>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-sm text-gray-500 font-medium">Reference</span>
                                <span className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">{selectedTransaction.reference}</span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-sm text-gray-500 font-medium">Date & Time</span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {new Date(selectedTransaction.createdAt).toLocaleString('en-US', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-sm text-gray-500 font-medium">Type</span>
                                <span className="text-sm font-bold capitalize text-gray-900">{selectedTransaction.type}</span>
                            </div>

                            <div className="flex justify-between items-start py-3 border-b border-gray-100">
                                <span className="text-sm text-gray-500 font-medium">Narration</span>
                                <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{selectedTransaction.narration}</span>
                            </div>

                            {/* Sender/Beneficiary Details from Metadata */}
                            {selectedTransaction.metadata && (
                                <>
                                    <div className="pt-2 pb-1">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            {selectedTransaction.type === 'credit' ? 'Sender Details' : 'Beneficiary Details'}
                                        </h4>
                                        <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                                            {(selectedTransaction.metadata.payerName || selectedTransaction.metadata.accountName) && (
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-gray-500">Name</span>
                                                    <span className="text-sm font-bold text-gray-900">{selectedTransaction.metadata.payerName || selectedTransaction.metadata.accountName}</span>
                                                </div>
                                            )}
                                            {(selectedTransaction.metadata.payerAccount || selectedTransaction.metadata.accountNumber) && (
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-gray-500">Account Number</span>
                                                    <span className="text-sm font-mono text-gray-900">{selectedTransaction.metadata.payerAccount || selectedTransaction.metadata.accountNumber}</span>
                                                </div>
                                            )}
                                            {(selectedTransaction.metadata.payerBankName || selectedTransaction.metadata.bankName) && (
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-gray-500">Bank</span>
                                                    <span className="text-sm font-bold text-gray-900">{selectedTransaction.metadata.payerBankName || selectedTransaction.metadata.bankName}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-2">
                            <button className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                                <Download size={18} />
                                Download Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
