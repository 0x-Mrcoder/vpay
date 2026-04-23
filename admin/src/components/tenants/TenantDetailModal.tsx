import React, { useState } from 'react';
import { type Tenant, adminApi } from '../../api/client';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, FileText, User, CreditCard, Shield, Download, Zap } from 'lucide-react';
import { downloadFile } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

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
    const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'transactions' | 'kyc' | 'payout'>('overview');
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjustmentData, setAdjustmentData] = useState({ amount: '', type: 'debit' as 'credit' | 'debit', narration: '' });

    // Fetch full tenant details (including wallet and stats)
    const { data: detailData, isLoading: loadingDetail } = useQuery({
        queryKey: ['tenant-detail', tenant._id],
        queryFn: () => adminApi.getTenantById(tenant._id),
        enabled: isOpen,
    });

    const fullTenant = detailData?.user || tenant;
    const wallet = detailData?.wallet;
    const stats = detailData?.stats;

    // Fetch transactions for this tenant
    const { data: transactions, isLoading: loadingTxns } = useQuery({
        queryKey: ['tenant-transactions', tenant._id],
        queryFn: () => adminApi.getTransactions({ tenantId: tenant._id }),
        enabled: isOpen && activeTab === 'transactions',
    });

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'transactions', label: 'Transactions', icon: CreditCard },
        { id: 'kyc', label: 'KYC & Documents', icon: Shield },
        { id: 'payout', label: 'Payout Access', icon: Zap },
    ] as const;

    const handleApprovePayout = async () => {
        try {
            await adminApi.approvePayoutRequest(fullTenant._id);
            toast.success('Payout request approved successfully');
            if (fullTenant) {
               fullTenant.payoutRequestStatus = 'approved';
               fullTenant.isPayoutEnabled = true;
            }
        } catch (error) {
            toast.error('Failed to approve payout request');
        }
    };

    const handleRejectPayout = async () => {
        const reason = window.prompt("Reason for rejection:");
        if (reason === null) return;
        try {
            await adminApi.rejectPayoutRequest(fullTenant._id, reason);
            toast.success('Payout request rejected');
            if (fullTenant) {
               fullTenant.payoutRequestStatus = 'rejected';
               fullTenant.isPayoutEnabled = false;
               fullTenant.payoutRequestReason = reason;
            }
        } catch (error) {
            toast.error('Failed to reject payout request');
        }
    };
    
    const handleManualAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustmentData.amount || !adjustmentData.narration) {
            toast.error('Please enter amount and narration');
            return;
        }

        const amountNum = parseFloat(adjustmentData.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setIsAdjusting(true);
            await adminApi.adjustTenantWallet(fullTenant._id, {
                amount: amountNum,
                type: adjustmentData.type,
                narration: adjustmentData.narration
            });
            toast.success(`Wallet ${adjustmentData.type}ed successfully`);
            setAdjustmentData({ amount: '', type: 'debit', narration: '' });
            // Refresh detail data
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to adjust wallet');
        } finally {
            setIsAdjusting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        // Amount is in base units (kobo), so divide by 100
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format((amount || 0) / 100);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${tenant.firstName} ${tenant.lastName}`}
            maxWidth="5xl"
        >
            <div className="flex flex-col h-full">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-200 mb-6 sticky top-0 bg-white z-10">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
                                ? 'text-primary-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-fade-in px-1">
                            {/* Financial Status Section */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                                    Financial Status
                                </h3>
                                {loadingDetail ? (
                                    <div className="flex justify-center py-4 bg-slate-50 rounded-xl">
                                        <RefreshCw className="animate-spin text-slate-400" size={20} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                            <div className="absolute -right-2 -bottom-2 opacity-5 text-green-600 group-hover:scale-110 transition-transform">
                                                <CreditCard size={64} />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Balance</p>
                                            <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(wallet?.balance ?? 0)}</p>
                                            <div className="mt-2 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full w-fit">ACTIVE FUNDS</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                            <div className="absolute -right-2 -bottom-2 opacity-5 text-yellow-600 group-hover:scale-110 transition-transform">
                                                <RefreshCw size={64} />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Balance</p>
                                            <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(wallet?.lockedBalance ?? 0)}</p>
                                            <div className="mt-2 text-[10px] text-yellow-600 font-bold bg-yellow-50 px-2 py-0.5 rounded-full w-fit">HELD IN ESCROW</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                            <div className="absolute -right-2 -bottom-2 opacity-5 text-primary-600 group-hover:scale-110 transition-transform">
                                                <FileText size={64} />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifetime Volume</p>
                                            <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(stats?.totalTransactionAmount ?? 0)}</p>
                                            <div className="mt-2 text-[10px] text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded-full w-fit">{stats?.totalTransactionCount || 0} TOTAL TXNS</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Manual Adjustment Section */}
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                    Manual Wallet Correction
                                </h3>
                                
                                <form onSubmit={handleManualAdjustment} className="space-y-4 relative z-10">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Type</label>
                                            <select 
                                                value={adjustmentData.type}
                                                onChange={(e) => setAdjustmentData({...adjustmentData, type: e.target.value as any})}
                                                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            >
                                                <option value="debit">Debit Amount (-)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Amount (₦)</label>
                                            <input 
                                                type="number" 
                                                placeholder="0.00"
                                                value={adjustmentData.amount}
                                                onChange={(e) => setAdjustmentData({...adjustmentData, amount: e.target.value})}
                                                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Adjustment Narration</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Failed payout recovery reversal..."
                                            value={adjustmentData.narration}
                                            onChange={(e) => setAdjustmentData({...adjustmentData, narration: e.target.value})}
                                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400"
                                        />
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isAdjusting}
                                        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                            adjustmentData.type === 'debit' 
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                        }`}
                                    >
                                        {isAdjusting ? (
                                            <>
                                                <RefreshCw size={16} className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                {adjustmentData.type === 'debit' ? 'Execute Debit' : 'Execute Credit'}
                                            </>
                                        )}
                                    </button>
                                </form>
                                <p className="mt-3 text-xs text-slate-500 font-medium italic text-center">
                                    ⚠️ This action will reflect in the ledger but is hidden from the tenant's view.
                                </p>
                            </div>

                            {/* Payout Access Alert (If Pending) */}
                            {fullTenant.payoutRequestStatus === 'pending' && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                            <Zap size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-amber-900">Tier 3 (Business) Upgrade Pending</p>
                                            <p className="text-xs text-amber-700">This tenant has submitted business documents for review.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setActiveTab('payout');
                                            handleApprovePayout();
                                        }}
                                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
                                    >
                                        Approve T3 Now
                                    </button>
                                </div>
                            )}

                            {/* Business Information */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-primary-500 rounded-full"></div>
                                    Business Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Business Name</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{fullTenant.businessName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{fullTenant.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{fullTenant.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Joined Date</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{new Date(fullTenant.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Location (State / LGA)</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{fullTenant.state || 'N/A'} / {fullTenant.lga || 'N/A'}</p>
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
                                            <Badge variant={fullTenant.status === 'active' ? 'success' : fullTenant.status === 'suspended' ? 'error' : 'neutral'}>
                                                {fullTenant.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center sm:block">
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">KYC Status</p>
                                        <div className="mt-1">
                                            <Badge variant={fullTenant.kyc_status === 'verified' ? 'success' : fullTenant.kyc_status === 'pending' ? 'warning' : 'error'}>
                                                {fullTenant.kyc_status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center sm:block">
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Verification Tier</p>
                                        <div className="mt-1">
                                            <Badge variant={fullTenant.kyc_tier === 't3' ? 'success' : fullTenant.kyc_tier === 't2' ? 'info' : 'neutral'}>
                                                {(fullTenant.kyc_tier || 't1').toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    {fullTenant.webhookUrl && (
                                        <div className="sm:col-span-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Webhook URL</p>
                                            <div className="bg-white px-3 py-2 rounded border border-slate-200 font-mono text-xs text-slate-600 break-all">
                                                {fullTenant.webhookUrl}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 pb-8">
                                {fullTenant.status !== 'active' && (
                                    <button
                                        onClick={() => onStatusChange(fullTenant._id, 'active')}
                                        className="px-4 py-2.5 bg-slate-100 text-slate-900 rounded-xl hover:bg-slate-200 transition-colors text-sm font-bold shadow-sm"
                                    >
                                        Activate Account
                                    </button>
                                )}
                                {fullTenant.status !== 'suspended' && (
                                    <button
                                        onClick={() => onStatusChange(fullTenant._id, 'suspended')}
                                        className="px-4 py-2.5 bg-yellow-50 text-yellow-700 rounded-xl hover:bg-yellow-100 transition-colors text-sm font-bold shadow-sm"
                                    >
                                        Suspend Account
                                    </button>
                                )}
                                <button
                                    onClick={() => onSendMessage(fullTenant)}
                                    className="px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-bold shadow-sm"
                                >
                                    Message
                                </button>
                                <button
                                    onClick={() => onDelete(fullTenant._id)}
                                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-sm font-bold shadow-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}



                    {activeTab === 'transactions' && (
                        <div className="space-y-4 animate-fade-in">
                            {loadingTxns ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="animate-spin text-primary-600" size={24} />
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
                                                        Showing recent 10 transactions. <a href="/transactions" className="text-primary-600 hover:underline">View all</a>
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
                                        <p className="text-sm font-mono font-medium text-slate-900 mt-1">{fullTenant.nin || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">BVN</p>
                                        <p className="text-sm font-mono font-medium text-slate-900 mt-1">{fullTenant.bvn || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">Submitted Documents</h3>
                                <div className="space-y-3">
                                    {/* ID Card */}
                                    {fullTenant.idCardPath ? (
                                        <div className="flex items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm gap-3">
                                            <div className="w-12 h-12 bg-blue-50 rounded overflow-hidden flex items-center justify-center border border-blue-100">
                                                {fullTenant.idCardPath.match(/\.(jpeg|jpg|gif|png)$/) || fullTenant.idCardPath.includes('cloudinary') ? (
                                                    <img src={fullTenant.idCardPath} className="w-full h-full object-cover" alt="ID Card" />
                                                ) : (
                                                    <FileText size={20} className="text-blue-600" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">Identity Document</p>
                                                <p className="text-xs text-slate-500">Provided identification card</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <a href={fullTenant.idCardPath} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200">
                                                    View Full
                                                </a>
                                                <button 
                                                    onClick={() => downloadFile(fullTenant.idCardPath!, `ID_${fullTenant.firstName}_${fullTenant.lastName}`)}
                                                    className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                                                    title="Download"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            <p className="text-xs text-slate-500 italic">No identity document uploaded.</p>
                                        </div>
                                    )}

                                    {/* Selfie */}
                                    {fullTenant.selfiePath && (
                                        <div className="flex items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm gap-3">
                                            <div className="w-12 h-12 bg-purple-50 rounded overflow-hidden flex items-center justify-center border border-purple-100">
                                                <img src={fullTenant.selfiePath} className="w-full h-full object-cover" alt="Selfie" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">Selfie Image</p>
                                                <p className="text-xs text-slate-500">Live portrait for verification</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <a href={fullTenant.selfiePath} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200">
                                                    View Full
                                                </a>
                                                <button 
                                                    onClick={() => downloadFile(fullTenant.selfiePath!, `Selfie_${fullTenant.firstName}_${fullTenant.lastName}`)}
                                                    className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                                                    title="Download"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Utility Bill */}
                                    {fullTenant.utilityBillPath && (
                                        <div className="flex items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm gap-3">
                                            <div className="w-12 h-12 bg-green-50 rounded overflow-hidden flex items-center justify-center border border-green-100">
                                                {fullTenant.utilityBillPath.match(/\.(pdf)$/) ? (
                                                    <FileText size={20} className="text-green-600" />
                                                ) : (
                                                    <img src={fullTenant.utilityBillPath} className="w-full h-full object-cover" alt="Utility Bill" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">Utility Bill</p>
                                                <p className="text-xs text-slate-500">Proof of Address (Nepa/Water)</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <a href={fullTenant.utilityBillPath} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200">
                                                    View Full
                                                </a>
                                                <button 
                                                    onClick={() => downloadFile(fullTenant.utilityBillPath!, `Utility_${fullTenant.firstName}_${fullTenant.lastName}`)}
                                                    className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                                                    title="Download"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* CAC Document */}
                                    {fullTenant.cacDocumentPath && (
                                        <div className="flex items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm gap-3">
                                            <div className="w-12 h-12 bg-primary-50 rounded overflow-hidden flex items-center justify-center border border-primary-100">
                                                {fullTenant.cacDocumentPath.match(/\.(pdf)$/) ? (
                                                    <FileText size={20} className="text-primary-600" />
                                                ) : (
                                                    <img src={fullTenant.cacDocumentPath} className="w-full h-full object-cover" alt="CAC Cert" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">Business Document</p>
                                                <p className="text-xs text-slate-500">CAC Registration Certificate</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <a href={fullTenant.cacDocumentPath} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200">
                                                    View Full
                                                </a>
                                                <button 
                                                    onClick={() => downloadFile(fullTenant.cacDocumentPath!, `CAC_${fullTenant.businessName || fullTenant.firstName}`)}
                                                    className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                                                    title="Download"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                                {fullTenant.kyc_status !== 'verified' && (
                                    <button
                                        onClick={() => onKycStatusChange(fullTenant._id, 'verified')}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                                    >
                                        Approve KYC
                                    </button>
                                )}
                                {fullTenant.kyc_status !== 'rejected' && (
                                    <button
                                        onClick={() => onKycStatusChange(fullTenant._id, 'rejected')}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                    >
                                        Reject KYC
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'payout' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Private Payout API Access</h3>
                                        <p className="text-sm text-slate-500">Manage tenant's ability to trigger programmatic external payouts.</p>
                                    </div>
                                    <Badge variant={fullTenant.payoutRequestStatus === 'approved' ? 'success' : fullTenant.payoutRequestStatus === 'pending' ? 'warning' : 'neutral'}>
                                        {(fullTenant.payoutRequestStatus || 'none').toUpperCase()}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                                        <p className="text-sm font-medium text-slate-900 mt-1">{fullTenant.isPayoutEnabled ? 'Enabled' : 'Disabled'}</p>
                                    </div>
                                    {fullTenant.payoutRequestReason && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wide">Request / Reason</p>
                                            <p className="text-sm font-medium text-slate-900 mt-1">{fullTenant.payoutRequestReason}</p>
                                        </div>
                                    )}
                                    {fullTenant.payoutIpWhitelist && fullTenant.payoutIpWhitelist.length > 0 && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wide">Whitelisted IPs</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {fullTenant.payoutIpWhitelist.map((ip: string, i: number) => (
                                                    <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-medium text-slate-700">
                                                        {ip}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-6 mt-6 border-t border-slate-200">
                                        <div className="flex gap-3">
                                            {(fullTenant.payoutRequestStatus === 'pending' || fullTenant.payoutRequestStatus === 'rejected') && (
                                                <button
                                                    onClick={handleApprovePayout}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                                                >
                                                    Approve Payout Access
                                                </button>
                                            )}
                                            {(fullTenant.payoutRequestStatus === 'pending' || fullTenant.payoutRequestStatus === 'approved') && (
                                                <button
                                                    onClick={handleRejectPayout}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                                                >
                                                    Revoke / Reject Access
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default TenantDetailModal;
