import React, { useState, useEffect } from 'react';
import { adminApi, type Tenant } from '../../api/client';
import toast from 'react-hot-toast';
import { PageSkeleton } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import FilterPanel, { type FilterConfig } from '../../components/common/FilterPanel';
import { exportToCSV } from '../../utils/exportUtils';
import Badge from '../../components/common/Badge';
import TenantDetailModal from '../../components/tenants/TenantDetailModal';

const TenantsPage: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Record<string, any>>({ status: 'all' });
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);
    const [showSendMessage, setShowSendMessage] = useState(false);
    const [messageData, setMessageData] = useState({ subject: '', message: '' });
    const [isSending, setIsSending] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getAllTenants();
            setTenants(data);
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (tenantId: string, newStatus: 'active' | 'suspended' | 'inactive') => {
        try {
            await adminApi.updateTenantStatus(tenantId, newStatus);
            const updatedTenants = tenants.map(t =>
                t._id === tenantId ? { ...t, status: newStatus } : t
            );
            setTenants(updatedTenants);

            if (selectedTenant && selectedTenant._id === tenantId) {
                setSelectedTenant({ ...selectedTenant, status: newStatus });
            }
            toast.success(`Tenant status updated to ${newStatus}`);
        } catch (error) {
            console.error('Failed to update tenant status:', error);
            toast.error('Failed to update tenant status');
        }
    };

    const handleDeleteTenant = (tenantId: string) => {
        setTenantToDelete(tenantId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!tenantToDelete) return;

        try {
            await adminApi.deleteTenant(tenantToDelete);
            setTenants(tenants.filter(t => t._id !== tenantToDelete));
            if (selectedTenant?._id === tenantToDelete) {
                setShowDetails(false);
                setSelectedTenant(null);
            }
            setShowDeleteConfirm(false);
            setTenantToDelete(null);
            toast.success('Tenant deleted successfully');
        } catch (error) {
            console.error('Failed to delete tenant:', error);
            toast.error('Failed to delete tenant');
        }
    };

    const handleKycStatusChange = async (id: string, kyc_status: 'pending' | 'verified' | 'rejected') => {
        try {
            await adminApi.updateTenantKycStatus(id, kyc_status);
            toast.success(`KYC status updated to ${kyc_status}`);
            fetchTenants();
            if (selectedTenant?._id === id) {
                setSelectedTenant({ ...selectedTenant, kyc_status: kyc_status as any });
            }
        } catch (error) {
            console.error('Failed to update KYC status:', error);
            toast.error('Failed to update KYC status');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenant) return;

        try {
            setIsSending(true);
            await adminApi.sendSingleEmail({
                userId: selectedTenant._id,
                subject: messageData.subject,
                message: messageData.message
            });
            toast.success('Message sent successfully');
            setShowSendMessage(false);
            setMessageData({ subject: '', message: '' });
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };



    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(filteredTenants.map(t => t._id));
            setSelectedIds(allIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkStatusChange = async (status: 'active' | 'suspended') => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to mark ${selectedIds.size} tenants as ${status}?`)) return;

        try {
            setIsBulkActionLoading(true);
            const promises = Array.from(selectedIds).map(id => adminApi.updateTenantStatus(id, status));
            await Promise.all(promises);

            toast.success(`Successfully updated ${selectedIds.size} tenants to ${status}`);
            setSelectedIds(new Set());
            fetchTenants();
        } catch (error) {
            console.error('Bulk update error:', error);
            toast.error('Failed to update some tenants');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE ${selectedIds.size} tenants? This action cannot be undone.`)) return;

        try {
            setIsBulkActionLoading(true);
            const promises = Array.from(selectedIds).map(id => adminApi.deleteTenant(id));
            await Promise.all(promises);

            toast.success(`Successfully deleted ${selectedIds.size} tenants`);
            setSelectedIds(new Set());
            fetchTenants();
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast.error('Failed to delete some tenants');
        } finally {
            setIsBulkActionLoading(false);
        }
    };



    const handleExport = () => {
        const dataToExport = selectedIds.size > 0
            ? filteredTenants.filter(t => selectedIds.has(t._id))
            : filteredTenants;

        const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Business Name', 'KYC Status', 'Status', 'Created At'];

        exportToCSV(
            dataToExport,
            headers,
            `tenants_export_${new Date().toISOString().split('T')[0]}.csv`,
            (t) => [
                t.firstName,
                t.lastName,
                t.email,
                t.phone,
                t.businessName || 'N/A',
                t.kyc_status,
                t.status,
                new Date(t.createdAt).toLocaleDateString()
            ]
        );
    };

    const getKycStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
            verified: 'success',
            pending: 'warning',
            rejected: 'error'
        };
        const variant = variants[status] || 'neutral';
        const label = status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : status === 'rejected' ? 'Rejected' : status;

        return <Badge variant={variant}>{label}</Badge>;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'error' | 'neutral'> = {
            active: 'success',
            suspended: 'error',
            inactive: 'neutral'
        };
        const variant = variants[status] || 'neutral';
        return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
    };

    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch = (tenant.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (tenant.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (tenant.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (tenant.businessName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesStatus = activeFilters.status === 'all' || tenant.status === activeFilters.status;
        return matchesSearch && matchesStatus;
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredTenants.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTenants = filteredTenants.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set()); // Clear selection on filter change
    }, [searchQuery, activeFilters]);

    // Filter configurations
    const filterConfigs: FilterConfig[] = [
        {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Suspended', value: 'suspended' },
                { label: 'Inactive', value: 'inactive' },
            ],
        },
    ];

    const handleFilterChange = (key: string, value: any) => {
        setActiveFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setActiveFilters({ status: 'all' });
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">Tenants Management</h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Control tenant access, status, and limits</p>
                </div>
                <div className="w-full sm:w-auto">
                    <button
                        onClick={handleExport}
                        className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm active:scale-95"
                    >
                        {selectedIds.size > 0 ? `Export Selected (${selectedIds.size})` : 'Export CSV'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Total Tenants</p>
                    <h3 className="text-lg md:text-2xl font-bold text-slate-900 mt-1">{tenants.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Active</p>
                    <h3 className="text-lg md:text-2xl font-bold text-green-600 mt-1">
                        {tenants.filter(t => t.status === 'active').length}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Suspended</p>
                    <h3 className="text-lg md:text-2xl font-bold text-red-600 mt-1">
                        {tenants.filter(t => t.status === 'suspended').length}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">KYC Verified</p>
                    <h3 className="text-lg md:text-2xl font-bold text-slate-900 mt-1">
                        {tenants.filter(t => t.kyc_status === 'verified').length}
                    </h3>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <SearchBar
                            placeholder="Search by email, name, or business..."
                            onSearch={setSearchQuery}
                            initialValue={searchQuery}
                        />
                    </div>
                    <FilterPanel
                        filters={filterConfigs}
                        activeFilters={activeFilters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                    />
                </div>
            </div>


            {/* Bulk Action Bar */}
            {
                selectedIds.size > 0 && (
                    <div className="bg-green-50 px-6 py-4 rounded-xl shadow-sm border border-green-200 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-down">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-lg text-green-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="font-semibold text-green-900">
                                {selectedIds.size} {selectedIds.size === 1 ? 'tenant' : 'tenants'} selected
                            </span>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-sm text-green-700 hover:text-green-800 underline ml-2"
                            >
                                Clear Selection
                            </button>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => handleBulkStatusChange('active')}
                                disabled={isBulkActionLoading}
                                className="flex-1 sm:flex-none px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 font-medium text-sm transition-colors"
                            >
                                Mark Active
                            </button>
                            <button
                                onClick={() => handleBulkStatusChange('suspended')}
                                disabled={isBulkActionLoading}
                                className="flex-1 sm:flex-none px-4 py-2 bg-white border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 font-medium text-sm transition-colors"
                            >
                                Suspend
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkActionLoading}
                                className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm shadow-sm transition-colors"
                            >
                                {isBulkActionLoading ? 'Processing...' : 'Delete Selected'}
                            </button>
                        </div>
                    </div >
                )
            }

            {/* Tenants Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <PageSkeleton />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] md:min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-12">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
                                            checked={filteredTenants.length > 0 && selectedIds.size === filteredTenants.length}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="hidden lg:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Business
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        KYC Level
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {paginatedTenants.map((tenant) => (
                                    <tr
                                        key={tenant._id}
                                        className={`hover:bg-slate-50 transition-colors ${selectedIds.has(tenant._id) ? 'bg-green-50/50' : ''}`}
                                    >
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
                                                checked={selectedIds.has(tenant._id)}
                                                onChange={() => handleSelectRow(tenant._id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{tenant.firstName} {tenant.lastName}</div>
                                                <div className="text-xs text-slate-500">{tenant.email}</div>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell px-4 md:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900">{tenant.businessName || 'N/A'}</div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            {getKycStatusBadge(tenant.kyc_status)}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(tenant.status)}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(tenant.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedTenant(tenant);
                                                        setShowDetails(true);
                                                    }}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTenant(tenant._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && filteredTenants.length > 0 && (
                    <div className="p-4 border-t border-slate-200">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredTenants.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedTenant && (
                <TenantDetailModal
                    isOpen={showDetails}
                    onClose={() => setShowDetails(false)}
                    tenant={selectedTenant}
                    onStatusChange={handleStatusChange}
                    onKycStatusChange={handleKycStatusChange}
                    onDelete={handleDeleteTenant}
                    onSendMessage={() => setShowSendMessage(true)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                            <div className="text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Tenant</h3>
                                <p className="text-sm text-slate-500 mb-6">
                                    Are you sure you want to delete this tenant? This action cannot be undone and will delete all associated data including wallets and transactions.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setTenantToDelete(null);
                                        }}
                                        className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                                    >
                                        No, Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                    >
                                        Yes, Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Send Message Modal */}
            {
                showSendMessage && selectedTenant && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex justify-between items-start">
                                    <h2 className="text-xl font-bold text-slate-900">Send Message to {selectedTenant.firstName}</h2>
                                    <button
                                        onClick={() => setShowSendMessage(false)}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleSendMessage} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="Enter subject"
                                        value={messageData.subject}
                                        onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                    <textarea
                                        required
                                        rows={6}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="Type your message here..."
                                        value={messageData.message}
                                        onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowSendMessage(false)}
                                        className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                        disabled={isSending}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                        disabled={isSending}
                                    >
                                        {isSending ? 'Sending...' : 'Send Message'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default TenantsPage;
