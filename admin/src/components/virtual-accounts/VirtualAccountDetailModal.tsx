import React, { useState } from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import { RefreshCw, CreditCard, User, History } from 'lucide-react';

interface VirtualAccountDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: any;
}

const VirtualAccountDetailModal: React.FC<VirtualAccountDetailModalProps> = ({
    isOpen,
    onClose,
    account
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch transactions for this virtual account
    const { data, isLoading } = useQuery({
        queryKey: ['va-transactions', account?.accountNumber, currentPage],
        queryFn: () => adminApi.getTransactions({ 
            virtualAccount: account.accountNumber,
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage
        }),
        enabled: !!account && isOpen,
    });

    const transactions = data?.transactions || [];
    const totalTxns = data?.pagination?.total || 0;

    if (!account) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Account Details: ${account.accountNumber}`}
            maxWidth="4xl"
        >
            <div className="space-y-6">
                {/* Account Summary Header */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                                <CreditCard size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{account.bankName}</h3>
                                <p className="text-sm font-bold text-primary-600 tracking-wider uppercase">{account.accountName}</p>
                            </div>
                        </div>
                        <div className="flex flex-col md:items-end justify-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Received</p>
                            <p className="text-2xl font-black text-slate-900">₦{(account.totalVolume / 100).toLocaleString()}</p>
                            <div className="mt-1">
                                <Badge variant={account.status === 'active' ? 'success' : 'error'}>
                                    {account.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned To</p>
                                <p className="text-sm font-bold text-slate-900">{account.userId?.firstName} {account.userId?.lastName}</p>
                                <p className="text-xs text-slate-500">{account.userId?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                                <History size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Created</p>
                                <p className="text-sm font-bold text-slate-900">
                                    {new Date(account.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Transactions List */}
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <RefreshCw className={`text-primary-600 ${isLoading ? 'animate-spin' : ''}`} size={20} />
                        Account Transactions
                    </h3>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <RefreshCw className="animate-spin text-primary-600" size={32} />
                        </div>
                    ) : transactions.length > 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-600">Reference</th>
                                        <th className="px-6 py-4 font-bold text-slate-600">Type</th>
                                        <th className="px-6 py-4 font-bold text-slate-600 text-right">Amount</th>
                                        <th className="px-6 py-4 font-bold text-slate-600">Status</th>
                                        <th className="px-6 py-4 font-bold text-slate-600 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map((txn: any) => (
                                        <tr key={txn._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-slate-600">{txn.reference}</div>
                                                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{txn.narration}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={txn.type === 'credit' ? 'success' : 'error'}>
                                                    {txn.type.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className={`px-6 py-4 font-bold text-right ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {txn.type === 'credit' ? '+' : '-'}₦{(txn.amount / 100).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={txn.status === 'success' ? 'success' : txn.status === 'pending' ? 'warning' : 'error'}>
                                                    {txn.status.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-right text-xs">
                                                {new Date(txn.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            {/* Simple Pagination */}
                            {totalTxns > itemsPerPage && (
                                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Showing {transactions.length} of {totalTxns} transactions
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                                        >
                                            Previous
                                        </button>
                                        <button 
                                            disabled={transactions.length < itemsPerPage}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                            <History className="mx-auto text-slate-300 mb-3" size={48} />
                            <h4 className="text-slate-900 font-bold">No Transactions Found</h4>
                            <p className="text-slate-500 text-sm mt-1">This virtual account has no transaction history yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default VirtualAccountDetailModal;
