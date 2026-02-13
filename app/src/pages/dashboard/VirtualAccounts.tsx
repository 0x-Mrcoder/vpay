import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    Check,
    Plus,
    Loader2,
    ArrowUpRight,
    Search,
    CreditCard,
    Calendar,
    AlertCircle,
    ShieldAlert,
    CheckCircle2,
    Copy,
    RefreshCw,
    X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export const VirtualAccounts: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [newAccountData, setNewAccountData] = useState({
        bankType: '999998', // Default to PalmPay
        bvn: '',
        accountName: '',
        email: '',
        identityType: 'individual'
    });

    useEffect(() => {
        fetchAccounts();
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

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setCreateError('');

        try {
            await api.post('/virtual-accounts', newAccountData);
            await fetchAccounts();
            setShowCreateModal(false);
            setNewAccountData({
                bankType: '999998',
                bvn: '',
                accountName: '',
                email: '',
                identityType: 'individual'
            });
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

    const handleToggleStatus = async (account: any) => {
        const newStatus = account.status === 'active' ? false : true;
        // Optimistic update
        setAccounts(prev => prev.map(acc =>
            acc.id === account.id ? { ...acc, status: newStatus ? 'active' : 'inactive' } : acc
        ));

        try {
            await api.patch(`/virtual-accounts/${account.accountNumber}/status`, { status: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
            // Revert on error
            setAccounts(prev => prev.map(acc =>
                acc.id === account.id ? { ...acc, status: account.status } : acc
            ));
            // You might want to show a toast here
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-fade-in pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">Virtual Accounts</h1>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Manage your dedicated collection accounts</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                        onClick={fetchAccounts}
                        className="flex-1 sm:flex-none p-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-primary-200 transition-all shadow-sm flex items-center justify-center gap-2 group"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={`group-hover:text-primary-600 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        disabled={(user?.kycLevel ?? 0) < 3 || user?.status === 'suspended'}
                        className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                    >
                        <Plus size={20} />
                        Create Account
                    </button>
                </div>
            </div>

            {/* Suspension Alert */}
            {user?.status === 'suspended' && (
                <div className="p-4 md:p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 shadow-sm animate-fade-in">
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
                <div className="p-4 md:p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 shadow-sm animate-fade-in">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-amber-900">Verification Required</h4>
                        <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                            You need to complete Tier 3 verification to create virtual accounts. Please complete your KYC to unlock full features.
                        </p>
                        <Link to="/dashboard/verification" className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 hover:text-amber-700 mt-3 px-4 py-2 bg-white rounded-lg border border-amber-200 transition-colors shadow-sm">
                            Complete Verification
                            <CheckCircle2 size={14} />
                        </Link>
                    </div>
                </div>
            )}

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative flex-1 w-full sm:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search accounts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 size={40} className="text-primary-500 animate-spin" />
                        <p className="text-gray-500 font-medium">Loading your accounts...</p>
                    </div>
                </div>
            ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CreditCard size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No virtual accounts yet</h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">Create your first virtual account to start receiving payments instantly.</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Number</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created On</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                                                    {account.bankName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{account.bankName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]" title={account.alias || account.accountName}>
                                                {account.alias || account.accountName}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 group/copy cursor-pointer w-fit" onClick={() => copyToClipboard(account.accountNumber, account.id)}>
                                                <span className="text-sm font-mono font-medium text-gray-700 group-hover/copy:text-primary-700 transition-colors">
                                                    {account.accountNumber}
                                                </span>
                                                {copiedId === account.id ? (
                                                    <Check size={14} className="text-green-500" />
                                                ) : (
                                                    <Copy size={14} className="text-gray-300 group-hover/copy:text-primary-500 transition-colors" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={account.status === 'active'}
                                                    onChange={() => handleToggleStatus(account)}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                                <span className={`ml-3 text-xs font-semibold uppercase tracking-wider ${account.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {account.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </label>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span className="text-sm text-gray-600 font-medium">
                                                    {new Date(account.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => navigate(`/dashboard/virtual-accounts/${account.accountNumber}`)}
                                                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                    title="View Details"
                                                >
                                                    <ArrowUpRight size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}



            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between bg-white">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">New Account</h2>
                                <p className="text-sm text-gray-500 mt-1">Create a dedicated virtual bank account</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all flex items-center justify-center"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                            {createError && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800 font-medium leading-relaxed">{createError}</p>
                                </div>
                            )}

                            <form onSubmit={handleCreateAccount} className="space-y-6">
                                {/* Identity Type - Hidden as it's always Individual now */}
                                <input type="hidden" value="individual" />

                                <div className="space-y-5">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                                            Account Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newAccountData.accountName}
                                            onChange={(e) => setNewAccountData({ ...newAccountData, accountName: e.target.value })}
                                            placeholder="e.g. John Doe"
                                            className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-gray-400"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={newAccountData.email}
                                            onChange={(e) => setNewAccountData({ ...newAccountData, email: e.target.value })}
                                            placeholder="e.g. name@example.com"
                                            className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-gray-400"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                                            BVN <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newAccountData.bvn}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setNewAccountData({ ...newAccountData, bvn: val });
                                            }}
                                            placeholder="Enter 11-digit BVN"
                                            className={`w-full px-4 py-3.5 bg-white border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-gray-400 ${(newAccountData.bvn.length > 0 && newAccountData.bvn.length !== 11) ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                                                }`}
                                            required
                                            maxLength={11}
                                        />
                                        {newAccountData.bvn.length > 0 && newAccountData.bvn.length !== 11 && (
                                            <p className="text-xs text-red-500 mt-1.5 font-medium">BVN must be exactly 11 digits</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating || newAccountData.bvn.length !== 11}
                                        className="flex-[2] py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-200 hover:shadow-primary-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                                    >
                                        {isCreating ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                Create Account
                                                <ArrowUpRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
