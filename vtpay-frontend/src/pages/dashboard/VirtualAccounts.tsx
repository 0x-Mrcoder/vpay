import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    Plus,
    Copy,
    AlertCircle,
    CreditCard,
    X,
    ChevronDown,
    Check,
    RefreshCw,
    ShieldAlert,
    CheckCircle2,
    Search,
    Filter,
    Eye,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const VirtualAccounts: React.FC = () => {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [supportedBanks, setSupportedBanks] = useState<Array<{ code: string; name: string }>>([]);
    const [isBanksLoading, setIsBanksLoading] = useState(false);
    const [newAccountData, setNewAccountData] = useState({
        bankType: '',
        bvn: '',
        accountName: '',
        email: '',
        phone: '',
        reference: ''
    });

    // Detail View State
    const [selectedAccount, setSelectedAccount] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [accountTransactions, setAccountTransactions] = useState<any[]>([]);
    const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                fetchAccounts(),
                fetchSupportedBanks()
            ]);
        };
        init();
    }, []);

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/virtual-accounts');
            setAccounts(response.data.data || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSupportedBanks = async () => {
        setIsBanksLoading(true);
        try {
            const response = await api.get('/virtual-accounts/supported-banks');
            const banks = response.data.data || [];
            setSupportedBanks(banks);
            // Set default bank if available
            if (banks.length > 0 && !newAccountData.bankType) {
                setNewAccountData(prev => ({ ...prev, bankType: banks[0].code }));
            }
        } catch (error) {
            console.error('Error fetching supported banks:', error);
            // Fallback to default banks if API fails
            setSupportedBanks([]);
        } finally {
            setIsBanksLoading(false);
        }
    };

    const fetchAccountTransactions = async (accountNumber: string) => {
        setIsTransactionsLoading(true);
        try {
            const response = await api.get(`/virtual-accounts/${accountNumber}/transactions`);
            setAccountTransactions(response.data.data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setAccountTransactions([]);
        } finally {
            setIsTransactionsLoading(false);
        }
    };

    const handleViewAccount = (account: any) => {
        setSelectedAccount(account);
        setShowDetailModal(true);
        fetchAccountTransactions(account.accountNumber);
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setCreateError('');

        try {
            await api.post('/virtual-accounts', newAccountData);
            await fetchAccounts();
            setShowCreateModal(false);
            setNewAccountData({ bankType: supportedBanks[0]?.code || '', bvn: '', accountName: '', email: '', phone: '', reference: '' });
        } catch (err: any) {
            console.error('Create account error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to create account';
            setCreateError(errorMessage);
        } finally {
            setIsCreating(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredAccounts = accounts.filter(account =>
        (account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            account.accountNumber.includes(searchTerm) ||
            account.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (account.alias && account.alias.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        account.accountName !== 'Internal Settlement Account'
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="text-green-600 animate-spin" />
                    <p className="text-gray-600 font-medium">Loading accounts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1400px] animate-fade-in p-4 md:p-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Virtual Accounts</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your dedicated bank accounts for receiving payments</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                        onClick={fetchAccounts}
                        className="flex-1 sm:flex-none p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        <span className="sm:hidden font-semibold">Refresh</span>
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        disabled={(user?.kycLevel ?? 0) < 3 || user?.status === 'suspended'}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} />
                        Create Account
                    </button>
                </div>
            </div>

            {/* Suspension Alert */}
            {user?.status === 'suspended' && (
                <div className="p-4 md:p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 flex-shrink-0">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-red-900">Account Suspended</h4>
                        <p className="text-sm text-red-800 mt-1 leading-relaxed">
                            Your account is currently suspended. You cannot create new virtual accounts or perform transactions. Please contact support for assistance.
                        </p>
                    </div>
                </div>
            )}

            {/* KYC Alert */}
            {user?.status !== 'suspended' && (user?.kycLevel ?? 0) < 3 && (
                <div className="p-4 md:p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-amber-900">Verification Required</h4>
                        <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                            You need to complete Tier 3 verification to create virtual accounts. This helps us comply with financial regulations and keep your account secure.
                        </p>
                        <Link to="/dashboard/verification" className="inline-flex items-center gap-2 text-sm font-bold text-amber-900 hover:text-amber-700 mt-3 px-4 py-2 bg-white rounded-lg border border-amber-200 transition-colors">
                            Complete Verification Now
                            <CheckCircle2 size={16} />
                        </Link>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search accounts by name, number or bank..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex-1 sm:flex-none px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2">
                        <Filter size={16} />
                        Filter
                    </button>
                </div>
            </div>

            {/* Accounts Table/List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                <th className="p-4">Account Details</th>
                                <th className="p-4">Bank Name</th>
                                <th className="p-4">Account Number</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CreditCard size={32} className="text-gray-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">No accounts found</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {searchTerm ? 'Try adjusting your search term' : 'Create your first virtual account to get started'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredAccounts.map((account) => (
                                    <tr key={account.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center font-bold text-lg">
                                                    {account.bankName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{account.alias || account.accountName}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">REF: {account.reference || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-medium text-gray-700">{account.bankName}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
                                                    {account.accountNumber}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(account.accountNumber, account.id)}
                                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                    title="Copy"
                                                >
                                                    {copiedId === account.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {account.status === 'active' && <CheckCircle2 size={12} className="mr-1.5" />}
                                                {account.status}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs text-gray-500 font-medium">
                                                {new Date(account.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleViewAccount(account)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-50">
                    {filteredAccounts.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CreditCard size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No accounts found</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {searchTerm ? 'Try adjusting your search' : 'Create your first virtual account'}
                            </p>
                        </div>
                    ) : (
                        filteredAccounts.map((account) => (
                            <div key={account.id} className="p-4 active:bg-gray-50 transition-colors" onClick={() => handleViewAccount(account)}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center font-bold">
                                            {account.bankName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{account.alias || account.accountName}</p>
                                            <p className="text-[10px] text-gray-500">{account.bankName}</p>
                                        </div>
                                    </div>
                                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {account.status}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-gray-900">
                                            {account.accountNumber}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(account.accountNumber, account.id);
                                            }}
                                            className="p-1 text-gray-400 hover:text-green-600"
                                        >
                                            {copiedId === account.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        {new Date(account.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
                        <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-lg md:text-xl font-extrabold text-gray-900">New Virtual Account</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Generate a dedicated bank account</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-900 transition-all p-2 hover:bg-gray-100 rounded-xl"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 md:p-6 overflow-y-auto">
                            {createError && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800 font-medium">{createError}</p>
                                </div>
                            )}

                            <form onSubmit={handleCreateAccount} className="space-y-5">
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 block">Select Bank Provider</label>
                                    <div className="relative">
                                        <select
                                            value={newAccountData.bankType}
                                            onChange={(e) => setNewAccountData({ ...newAccountData, bankType: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all appearance-none cursor-pointer"
                                            disabled={isBanksLoading}
                                            required
                                        >
                                            {isBanksLoading ? (
                                                <option>Loading banks...</option>
                                            ) : supportedBanks.length === 0 ? (
                                                <option>No banks available</option>
                                            ) : (
                                                <>
                                                    <option value="">Select a bank</option>
                                                    {supportedBanks.map((bank) => (
                                                        <option key={bank.code} value={bank.code}>
                                                            {bank.name}
                                                        </option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 block">Account Name</label>
                                    <input
                                        type="text"
                                        value={newAccountData.accountName}
                                        onChange={(e) => setNewAccountData({ ...newAccountData, accountName: e.target.value })}
                                        placeholder="e.g. John Doe"
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 block">Email Address</label>
                                    <input
                                        type="email"
                                        value={newAccountData.email}
                                        onChange={(e) => setNewAccountData({ ...newAccountData, email: e.target.value })}
                                        placeholder="e.g. john.doe@example.com"
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 block">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={newAccountData.phone}
                                        onChange={(e) => setNewAccountData({ ...newAccountData, phone: e.target.value })}
                                        placeholder="e.g. 08012345678"
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 block">Reference (Optional)</label>
                                    <input
                                        type="text"
                                        value={newAccountData.reference}
                                        onChange={(e) => setNewAccountData({ ...newAccountData, reference: e.target.value })}
                                        placeholder="e.g. cust_ref_12345"
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 block">BVN</label>
                                    <input
                                        type="text"
                                        value={newAccountData.bvn}
                                        onChange={(e) => setNewAccountData({ ...newAccountData, bvn: e.target.value })}
                                        placeholder="Enter your 11-digit BVN"
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all"
                                        required
                                        minLength={11}
                                        maxLength={11}
                                    />
                                </div>

                                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        className="flex-1 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all order-2 sm:order-1"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2 order-1 sm:order-2"
                                    >
                                        {isCreating ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Creating...
                                            </>
                                        ) : 'Generate Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up max-h-[95vh] flex flex-col">
                        <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-lg md:text-xl font-extrabold text-gray-900">{selectedAccount.alias || selectedAccount.accountName}</h2>
                                <p className="text-xs text-gray-500 mt-0.5">{selectedAccount.bankName} • {selectedAccount.accountNumber}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-gray-400 hover:text-gray-900 transition-all p-2 hover:bg-gray-100 rounded-xl"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 md:p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Account Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${selectedAccount.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                                        <p className="font-bold text-gray-900 capitalize">{selectedAccount.status}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Created On</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-400" />
                                        <p className="font-bold text-gray-900">
                                            {new Date(selectedAccount.createdAt).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <RefreshCw size={16} className="text-green-600" />
                                    Recent Transactions
                                </h3>
                                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                    {isTransactionsLoading ? (
                                        <div className="p-12 flex flex-col items-center gap-3">
                                            <Loader2 size={32} className="text-green-600 animate-spin" />
                                            <p className="text-xs text-gray-500 font-medium">Fetching transactions...</p>
                                        </div>
                                    ) : accountTransactions.length === 0 ? (
                                        <div className="p-12 text-center bg-gray-50/50">
                                            <p className="text-sm text-gray-500">No transactions found for this account.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold tracking-wider">
                                                    <tr>
                                                        <th className="p-4">Type</th>
                                                        <th className="p-4">Amount</th>
                                                        <th className="p-4">Date</th>
                                                        <th className="p-4">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {accountTransactions.map((txn: any) => (
                                                        <tr key={txn.reference} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-2">
                                                                    {txn.type === 'credit' ? (
                                                                        <ArrowDownLeft size={14} className="text-green-500" />
                                                                    ) : (
                                                                        <ArrowUpRight size={14} className="text-red-500" />
                                                                    )}
                                                                    <span className="capitalize font-bold text-gray-900">{txn.type}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 font-mono font-bold text-gray-900">
                                                                {formatCurrency(txn.amount)}
                                                            </td>
                                                            <td className="p-4 text-xs text-gray-500">
                                                                {new Date(txn.date).toLocaleDateString()}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${txn.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                                    }`}>
                                                                    {txn.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
