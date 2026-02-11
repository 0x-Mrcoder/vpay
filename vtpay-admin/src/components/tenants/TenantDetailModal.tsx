import React, { useState } from 'react';
import { type Tenant, adminApi } from '../../api/client';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, FileText, User, CreditCard, Shield } from 'lucide-react';

interface TenantDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenant: Tenant;
    onStatusChange: (id: string, status: 'active' | 'suspended') => void;
    onKycStatusChange: (id: string, status: 'pending' | 'verified' | 'rejected') => void;
    onDelete: (id: string) => void;
    onSendMessage: (tenant: Tenant) => void;
}

const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
    isOpen,
    onClose,
    tenant,
    onStatusChange,
    onKycStatusChange,
    onDelete,
    onSendMessage
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'transactions' | 'kyc'>('overview');

    // Fetch transactions for this tenant
    const { data: transactions, isLoading: loadingTxns } = useQuery({
        queryKey: ['tenant-transactions', tenant._id],
        queryFn: () => adminApi.getTransactions({ userId: tenant._id }),
        enabled: isOpen && activeTab === 'transactions',
    });
    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'transactions', label: 'Transactions', icon: CreditCard },
        { id: 'kyc', label: 'KYC & Documents', icon: Shield },
    ] as const;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${tenant.firstName} ${tenant.lastName}`}
            maxWidth="2xl"
        >
            <div className="flex flex-col h-full">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-200 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
                                ? 'text-green-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px]">
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Business Information */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                                    Business Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Business Name</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{tenant.businessName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{tenant.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{tenant.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Joined Date</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{new Date(tenant.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Account Status */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                    Account Status
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-center sm:block">
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Account Status</p>
                                        <div className="mt-1">
                                            <Badge variant={tenant.status === 'active' ? 'success' : tenant.status === 'suspended' ? 'error' : 'neutral'}>
                                                {tenant.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center sm:block">
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">KYC Status</p>
                                        <div className="mt-1">
                                            <Badge variant={tenant.kyc_status === 'verified' ? 'success' : tenant.kyc_status === 'pending' ? 'warning' : 'error'}>
                                                {tenant.kyc_status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    {tenant.webhookUrl && (
                                        <div className="sm:col-span-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Webhook URL</p>
                                            <div className="bg-white px-3 py-2 rounded border border-slate-200 font-mono text-xs text-slate-600 break-all">
                                                {tenant.webhookUrl}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                                {tenant.status !== 'active' && (
                                    <button
                                        onClick={() => onStatusChange(tenant._id, 'active')}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                    >
                                        Activate Account
                                    </button>
                                )}
                                {tenant.status !== 'suspended' && (
                                    <button
                                        onClick={() => onStatusChange(tenant._id, 'suspended')}
                                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                                    >
                                        Suspend Account
                                    </button>
                                )}
                                <button
                                    onClick={() => onSendMessage(tenant)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                >
                                    Send Message
                                </button>
                                <button
                                    onClick={() => onDelete(tenant._id)}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium ml-auto"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    )}



                    {activeTab === 'transactions' && (
                        <div className="space-y-4 animate-fade-in">
                            {loadingTxns ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="animate-spin text-green-600" size={24} />
                                </div>
                            ) : transactions && transactions.length > 0 ? (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-medium text-slate-600">Reference</th>
                                                <th className="px-4 py-3 font-medium text-slate-600">Amount</th>
                                                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                                                <th className="px-4 py-3 font-medium text-slate-600 text-right">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {transactions.slice(0, 10).map((txn: any) => (
                                                <tr key={txn._id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono text-xs">{txn.reference}</td>
                                                    <td className="px-4 py-3 font-medium">₦{txn.amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={txn.status === 'success' ? 'success' : txn.status === 'pending' ? 'warning' : 'error'}>
                                                            {txn.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 text-right">
                                                        {new Date(txn.createdAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {transactions.length > 10 && (
                                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-3 text-center text-xs text-slate-500">
                                                        Showing recent 10 transactions. <a href="/transactions" className="text-green-600 hover:underline">View all</a>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <FileText className="mx-auto text-slate-400 mb-2" size={32} />
                                    <p className="text-slate-500">No transactions found for this tenant.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'kyc' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-900 mb-3">KYC Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">NIN</p>
                                        <p className="text-sm font-mono font-medium text-slate-900 mt-1">{tenant.nin || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">BVN</p>
                                        <p className="text-sm font-mono font-medium text-slate-900 mt-1">{tenant.bvn || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">Submitted Documents</h3>
                                {tenant.idCardPath ? (
                                    <div className="flex items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900">{tenant.idCardPath}</p>
                                            <p className="text-xs text-slate-500">Identity Document</p>
                                        </div>
                                        <button className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200">
                                            View
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                        <p className="text-slate-500 italic">No identity document uploaded.</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                                {tenant.kyc_status !== 'verified' && (
                                    <button
                                        onClick={() => onKycStatusChange(tenant._id, 'verified')}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                    >
                                        Approve KYC
                                    </button>
                                )}
                                {tenant.kyc_status !== 'rejected' && (
                                    <button
                                        onClick={() => onKycStatusChange(tenant._id, 'rejected')}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                    >
                                        Reject KYC
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default TenantDetailModal;
