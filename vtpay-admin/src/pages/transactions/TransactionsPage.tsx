import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';
import SearchBar from '../../components/common/SearchBar';
import FilterPanel, { type FilterConfig } from '../../components/common/FilterPanel';
import Modal from '../../components/common/Modal';
import { exportToCSV } from '../../utils/exportUtils';
import Badge from '../../components/common/Badge';

// Transaction types
interface Transaction {
    _id: string;
    type: 'credit' | 'debit';
    category: 'deposit' | 'transfer' | 'withdrawal' | 'refund' | 'fee';
    status: 'pending' | 'success' | 'failed';
    amount: number;
    userId: {
        _id: string;
        email: string;
        firstName: string;
        lastName: string;
        businessName?: string;
    };
    reference: string;
    externalRef?: string;
    narration: string;
    flagged: boolean;
    isCleared?: boolean;
    clearedAt?: string;
    createdAt: string;
    updatedAt: string;
}

const CountdownTimer = ({ createdAt, isCleared }: { createdAt: string; isCleared?: boolean }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    React.useEffect(() => {
        if (isCleared) return;

        const calculateTimeLeft = () => {
            const created = new Date(createdAt).getTime();
            const settlementTime = created + (24 * 60 * 60 * 1000) + (5 * 60 * 1000); // 24h 5m
            const now = new Date().getTime();
            const difference = settlementTime - now;

            if (difference <= 0) {
                return 'Processing...';
            }

            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            return `${hours}h ${minutes}m ${seconds}s`;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        setTimeLeft(calculateTimeLeft()); // Initial call

        return () => clearInterval(timer);
    }, [createdAt, isCleared]);

    if (isCleared) {
        return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Settled</span>;
    }

    if (timeLeft === 'Processing...') {
        return <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full animate-pulse">Processing...</span>;
    }

    return <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">{timeLeft}</span>;
};

const TransactionsPage: React.FC = () => {
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Record<string, any>>({
        type: 'all',
        status: 'all'
    });

    const { data: transactionData, isLoading: loading, refetch } = useQuery({
        queryKey: ['transactions', activeFilters],
        queryFn: async () => {
            const params: any = {};
            if (activeFilters.type !== 'all') params.type = activeFilters.type;
            if (activeFilters.status !== 'all') params.status = activeFilters.status;
            return await adminApi.getTransactions(params);
        },
        refetchInterval: 15000,
        staleTime: 5000,
    });

    const transactions: Transaction[] = transactionData?.transactions || [];

    const handleFlag = async (id: string, currentFlagged: boolean) => {
        try {
            setIsActionLoading(true);
            await adminApi.flagTransaction(id, !currentFlagged);
            toast.success(`Transaction ${!currentFlagged ? 'flagged' : 'unflagged'} successfully`);
            refetch();
            setShowDetails(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update transaction flag');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleVerify = async (id: string) => {
        try {
            setIsActionLoading(true);
            await adminApi.verifyTransaction(id);
            toast.success('Transaction verified manually');
            refetch();
            setShowDetails(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to verify transaction');
        } finally {
            setIsActionLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
            success: 'success',
            pending: 'warning',
            failed: 'error'
        };
        const variant = variants[status] || 'neutral';
        return (
            <Badge variant={variant}>
                {status.toUpperCase()}
            </Badge>
        );
    };

    const getTypeBadge = (category: string) => {
        const variants: Record<string, 'info' | 'warning' | 'error' | 'neutral' | 'success'> = {
            deposit: 'info',
            transfer: 'info', // Using info (blue) for transfer
            withdrawal: 'warning',
            refund: 'error',
            fee: 'neutral'
        };
        const variant = variants[category] || 'neutral';
        return <Badge variant={variant}>{category.toUpperCase()}</Badge>;
    };

    const formatAmount = (amount: number) => {
        return `₦${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    };

    const filteredTransactions = transactions.filter((txn) => {
        const matchesSearch =
            txn.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
            txn.userId.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (txn.userId.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            txn.narration.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = activeFilters.type === 'all' || txn.type === activeFilters.type;
        const matchesStatus = activeFilters.status === 'all' || txn.status === activeFilters.status;
        return matchesSearch && matchesType && matchesStatus;
    });

    const filterConfigs: FilterConfig[] = [
        {
            key: 'type',
            label: 'Type',
            type: 'select',
            options: [
                { label: 'All Types', value: 'all' },
                { label: 'Deposit', value: 'deposit' },
                { label: 'Transfer', value: 'transfer' },
                { label: 'DVA', value: 'dva' },
                { label: 'Withdrawal', value: 'withdrawal' },
            ],
        },
        {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
                { label: 'All Status', value: 'all' },
                { label: 'Success', value: 'success' },
                { label: 'Pending', value: 'pending' },
                { label: 'Failed', value: 'failed' },
            ],
        },
    ];

    const handleFilterChange = (key: string, value: any) => {
        setActiveFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setActiveFilters({ type: 'all', status: 'all' });
    };



    const handleExportCSV = () => {
        const headers = ['Reference', 'External Ref', 'Tenant', 'Email', 'Type', 'Category', 'Amount', 'Status', 'Flagged', 'Narration', 'Date'];

        exportToCSV(
            filteredTransactions,
            headers,
            `transactions_${new Date().toISOString().split('T')[0]}.csv`,
            (txn) => [
                txn.reference,
                txn.externalRef || 'N/A',
                txn.userId.businessName || `${txn.userId.firstName} ${txn.userId.lastName}`,
                txn.userId.email,
                txn.type.toUpperCase(),
                txn.category.toUpperCase(),
                (txn.amount / 100).toFixed(2),
                txn.status.toUpperCase(),
                txn.flagged ? 'Yes' : 'No',
                txn.narration,
                new Date(txn.createdAt).toLocaleString()
            ]
        );
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">Transactions & Ledger</h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Source of truth for all money movement</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleExportCSV}
                        className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm active:scale-95"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm active:scale-95"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Total Transactions</p>
                    <h3 className="text-lg md:text-2xl font-bold text-slate-900 mt-1">{transactions.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Success Rate</p>
                    <h3 className="text-lg md:text-2xl font-bold text-green-600 mt-1">
                        {transactions.length > 0
                            ? ((transactions.filter((t) => t.status === 'success').length / transactions.length) * 100).toFixed(1)
                            : '0.0'}%
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Pending</p>
                    <h3 className="text-lg md:text-2xl font-bold text-yellow-600 mt-1">
                        {transactions.filter((t) => t.status === 'pending').length}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Flagged</p>
                    <h3 className="text-lg md:text-2xl font-bold text-red-600 mt-1">
                        {transactions.filter((t) => t.flagged).length}
                    </h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="sm:col-span-2 lg:col-span-2">
                        <SearchBar
                            placeholder="Search by reference, tenant, or description..."
                            onSearch={setSearchQuery}
                            initialValue={searchQuery}
                        />
                    </div>
                    <div className="sm:col-span-3 lg:col-span-3">
                        <FilterPanel
                            filters={filterConfigs}
                            activeFilters={activeFilters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={handleClearFilters}
                        />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
                        <p className="mt-2 text-slate-500">Loading transactions...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] md:min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Reference
                                    </th>
                                    <th className="hidden lg:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Tenant
                                    </th>
                                    <th className="hidden md:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="hidden lg:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Settlement
                                    </th>
                                    <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredTransactions.map((txn) => (
                                    <tr
                                        key={txn._id}
                                        className={`hover:bg-slate-50 transition-colors ${txn.flagged ? 'bg-red-50' : ''}`}
                                    >
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {txn.flagged && (
                                                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">{txn.reference}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{txn.externalRef}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell px-4 md:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900">{txn.userId.businessName || `${txn.userId.firstName} ${txn.userId.lastName}`}</div>
                                            <div className="text-xs text-slate-500">{txn.userId.email}</div>
                                        </td>
                                        <td className="hidden md:table-cell px-4 md:px-6 py-4 whitespace-nowrap">{getTypeBadge(txn.category)}</td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-slate-900">{formatAmount(txn.amount)}</div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">{getStatusBadge(txn.status)}</td>
                                        <td className="hidden lg:table-cell px-4 md:px-6 py-4 whitespace-nowrap">
                                            {(txn.category === 'deposit' || txn.category === 'transfer') && txn.type === 'credit' ? (
                                                <CountdownTimer createdAt={txn.createdAt} isCleared={txn.isCleared} />
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(txn.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => {
                                                    setSelectedTransaction(txn);
                                                    setShowDetails(true);
                                                }}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                <span className="hidden sm:inline">View Details</span>
                                                <span className="sm:hidden">View</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Transaction Details Modal */}
            {/* Transaction Details Modal */}
            <Modal
                isOpen={showDetails}
                onClose={() => setShowDetails(false)}
                title="Transaction Details"
                maxWidth="2xl"
            >
                {selectedTransaction && (
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Transaction Information</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Category</span>
                                            {getTypeBadge(selectedTransaction.category)}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Status</span>
                                            {getStatusBadge(selectedTransaction.status)}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Amount</span>
                                            <span className="text-sm font-semibold text-slate-900">
                                                {formatAmount(selectedTransaction.amount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Tenant</span>
                                            <div className="text-right">
                                                <div className="text-sm text-slate-900">{selectedTransaction.userId.businessName || `${selectedTransaction.userId.firstName} ${selectedTransaction.userId.lastName}`}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Email</span>
                                            <span className="text-sm text-slate-900">{selectedTransaction.userId.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">External Ref</span>
                                            <span className="text-sm font-mono text-slate-900">{selectedTransaction.externalRef || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Flagged</span>
                                            <span className={`text-sm font-medium ${selectedTransaction.flagged ? 'text-red-600' : 'text-green-600'}`}>
                                                {selectedTransaction.flagged ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Date</span>
                                            <span className="text-sm text-slate-900">{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Narration */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Narration</h3>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedTransaction.narration}</p>
                                </div>
                            </div>

                            {/* Right Column - Raw Data */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">Technical Details</h3>
                                <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto h-full max-h-[300px]">
                                    <pre className="text-xs text-green-400 font-mono">
                                        {JSON.stringify(selectedTransaction, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => handleFlag(selectedTransaction._id, selectedTransaction.flagged)}
                                disabled={isActionLoading}
                                className={`px-4 py-2 border rounded-lg transition-colors text-sm font-medium disabled:opacity-50 ${selectedTransaction.flagged
                                    ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                                    : 'border-yellow-600 text-yellow-600 hover:bg-yellow-50'
                                    }`}
                            >
                                {selectedTransaction.flagged ? 'Remove Flag' : 'Flag Transaction'}
                            </button>
                            <button
                                onClick={() => handleVerify(selectedTransaction._id)}
                                disabled={isActionLoading || selectedTransaction.status === 'success'}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                Verify Manually
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TransactionsPage;
