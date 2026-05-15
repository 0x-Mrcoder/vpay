import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';
import { PageSkeleton } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import FilterPanel, { type FilterConfig } from '../../components/common/FilterPanel';
import { exportToCSV } from '../../utils/exportUtils';
import Badge from '../../components/common/Badge';
import { CreditCard, User, Building2 } from 'lucide-react';
import VirtualAccountDetailModal from '../../components/virtual-accounts/VirtualAccountDetailModal';

const VirtualAccountsPage: React.FC = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Record<string, any>>({ status: 'all', bank: 'all' });
    const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getAllVirtualAccounts();
            setAccounts(data);
        } catch (error) {
            console.error('Failed to fetch virtual accounts:', error);
            toast.error('Failed to load virtual accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleAccountClick = (account: any) => {
        setSelectedAccount(account);
        setIsModalOpen(true);
    };

    const handleStatusChange = async (e: React.MouseEvent, accountId: string, newStatus: 'active' | 'frozen') => {
        e.stopPropagation();
        try {
            await adminApi.updateVirtualAccountStatus(accountId, newStatus);
            setAccounts(accounts.map(acc => 
                acc._id === accountId ? { ...acc, status: newStatus } : acc
            ));
            toast.success(`Account ${newStatus === 'frozen' ? 'frozen' : 'unfrozen'} successfully`);
        } catch (error) {
            console.error('Status update error:', error);
            toast.error('Failed to update account status');
        }
    };

    const handleExport = () => {
        const headers = ['User', 'Bank', 'Account Name', 'Account Number', 'Status', 'Balance', 'Created At'];
        exportToCSV(
            filteredAccounts,
            headers,
            `virtual_accounts_${new Date().toISOString().split('T')[0]}.csv`,
            (acc) => [
                acc.userId?.email || 'N/A',
                acc.bankName,
                acc.accountName,
                acc.accountNumber,
                acc.status,
                (acc.balance / 100).toFixed(2),
                new Date(acc.createdAt).toLocaleDateString()
            ]
        );
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'error' | 'neutral' | 'info' | 'warning'> = {
            active: 'success',
            frozen: 'error',
            pending: 'warning'
        };
        const variant = variants[status] || 'neutral';
        return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
    };

    const filteredAccounts = accounts.filter(acc => {
        const matchesSearch = 
            acc.accountNumber?.includes(searchQuery) ||
            acc.accountName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acc.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = activeFilters.status === 'all' || acc.status === activeFilters.status;
        const matchesBank = activeFilters.bank === 'all' || acc.bankName === activeFilters.bank;
        
        return matchesSearch && matchesStatus && matchesBank;
    });

    const uniqueBanks = Array.from(new Set(accounts.map(acc => acc.bankName).filter(Boolean)));

    const filterConfigs: FilterConfig[] = [
        {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Frozen', value: 'frozen' },
            ],
        },
        {
            key: 'bank',
            label: 'Bank',
            type: 'select',
            options: [
                { label: 'All Banks', value: 'all' },
                ...uniqueBanks.map(bank => ({ label: bank, value: bank }))
            ],
        },
    ];

    const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
    const paginatedAccounts = filteredAccounts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="text-primary-600" />
                        Virtual Accounts
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Monitor and manage all system virtual accounts</p>
                </div>
                <button
                    onClick={handleExport}
                    className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                >
                    Export CSV
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Total Accounts</p>
                    <h3 className="text-lg md:text-2xl font-bold text-slate-900 mt-1">{accounts.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Active</p>
                    <h3 className="text-lg md:text-2xl font-bold text-green-600 mt-1">
                        {accounts.filter(a => a.status === 'active').length}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Frozen</p>
                    <h3 className="text-lg md:text-2xl font-bold text-red-600 mt-1">
                        {accounts.filter(a => a.status === 'frozen').length}
                    </h3>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <SearchBar
                            placeholder="Search by number, name or user email..."
                            onSearch={setSearchQuery}
                            initialValue={searchQuery}
                        />
                    </div>
                    <FilterPanel
                        filters={filterConfigs}
                        activeFilters={activeFilters}
                        onFilterChange={(key, val) => setActiveFilters(prev => ({ ...prev, [key]: val }))}
                        onClearFilters={() => setActiveFilters({ status: 'all', bank: 'all' })}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <PageSkeleton />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Bank Details</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total Received</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {paginatedAccounts.map((acc) => (
                                    <tr 
                                        key={acc._id} 
                                        onClick={() => handleAccountClick(acc)}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                                    <User size={16} className="text-slate-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {acc.userId?.firstName} {acc.userId?.lastName}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{acc.userId?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} className="text-slate-400" />
                                                <span className="text-sm font-medium text-slate-900">{acc.bankName}</span>
                                            </div>
                                            <div className="text-sm text-slate-500 font-mono mt-1">{acc.accountNumber}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">{acc.accountName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                            ₦{(acc.totalVolume / 100).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(acc.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(acc.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={(e) => handleStatusChange(e, acc._id, acc.status === 'frozen' ? 'active' : 'frozen')}
                                                className={`text-sm font-semibold transition-colors ${
                                                    acc.status === 'frozen' ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'
                                                }`}
                                            >
                                                {acc.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && filteredAccounts.length > 0 && (
                    <div className="p-4 border-t border-slate-200">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredAccounts.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </div>
                )}
            </div>

            <VirtualAccountDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                account={selectedAccount}
            />
        </div>
    );
};

export default VirtualAccountsPage;
