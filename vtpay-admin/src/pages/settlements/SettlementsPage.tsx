import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';
import { AlertCircle, Settings, DollarSign, Plus } from 'lucide-react';

import { GlobalSettlementConfig } from '../../components/settlements/GlobalSettlementConfig';

// --- Types ---
interface Settlement {
    _id: string;
    userId: {
        _id: string;
        email: string;
        firstName: string;
        lastName: string;
        businessName?: string;
    };
    amount: number;
    status: 'pending' | 'processing' | 'success' | 'failed';
    category: string;
    reference: string;
    externalRef?: string;
    narration: string;
    createdAt: string;
}

interface Dispute {
    _id: string;
    settlementReference: string;

    amount?: number;
    reason: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
    adminNote?: string;
    createdAt: string;
    resolvedBy?: string;
}

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        pending: 'bg-blue-100 text-blue-800',
        processing: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
        // Dispute statuses
        OPEN: 'bg-red-100 text-red-800',
        IN_PROGRESS: 'bg-blue-100 text-blue-800',
        RESOLVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-gray-100 text-gray-800',
        // Priority
        LOW: 'bg-slate-100 text-slate-800',
        MEDIUM: 'bg-orange-100 text-orange-800',
        HIGH: 'bg-red-100 text-red-800',
    };

    const getStatusDisplay = (status: string) => {
        if (status === 'pending') return 'RUNNING';
        return status.toUpperCase().replace('_', ' ');
    };

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
            {getStatusDisplay(status)}
        </span>
    );
};

const SettlementsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'settlements' | 'disputes' | 'settings'>('settlements');

    // Settlements State
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [settlementsLoading, setSettlementsLoading] = useState(true);
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
    const [showSettlementDetails, setShowSettlementDetails] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    // Cron Status State
    const [cronStatus, setCronStatus] = useState<any>(null);

    // Disputes State
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [disputesLoading, setDisputesLoading] = useState(false);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [newDisputeData, setNewDisputeData] = useState({
        settlementReference: '',
        reason: '',
        amount: '',
        priority: 'MEDIUM',
    });

    // Settings State
    const [systemSettings, setSystemSettings] = useState<any>(null);
    const [settingsLoading, setSettingsLoading] = useState(false);


    // Initial Fetch
    useEffect(() => {
        fetchSettlements();
        fetchDisputes(); // Fetch disputes on mount for stats
        fetchCronStatus();
    }, [filterStatus]);

    // Statistics Calculation
    const stats = React.useMemo(() => {
        const totalSettled = settlements
            .filter(s => s.status === 'success')
            .reduce((sum, s) => sum + s.amount, 0);

        const totalPending = settlements
            .filter(s => s.status === 'pending')
            .reduce((sum, s) => sum + s.amount, 0);

        const totalDisputed = disputes
            .reduce((sum, d) => sum + (d.amount || 0), 0);

        return { totalSettled, totalPending, totalDisputed };
    }, [settlements, disputes]);

    // Fetch handlers
    const fetchCronStatus = async () => {
        try {
            const status = await adminApi.getSystemStatus();
            setCronStatus(status);
        } catch (error) {
            console.error('Failed to fetch cron status');
        }
    };

    const fetchSettlements = async () => {
        try {
            setSettlementsLoading(true);
            const params: any = {};
            if (filterStatus !== 'all') params.status = filterStatus;

            const data = await adminApi.getSettlements(params);
            setSettlements(data);
        } catch (error) {
            console.error('Failed to fetch settlements:', error);
        } finally {
            setSettlementsLoading(false);
        }
    };

    const fetchDisputes = async () => {
        try {
            setDisputesLoading(true);
            const data = (await adminApi.getDisputes()) || [];
            setDisputes(data);
        } catch (error) {
            console.error('Failed to fetch disputes:', error);
            // toast.error('Failed to load disputes');
        } finally {
            setDisputesLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            setSettingsLoading(true);
            const data = await adminApi.getSystemSettings();
            setSystemSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setSettingsLoading(false);
        }
    };




    // Tab Change Handler
    useEffect(() => {
        if (activeTab === 'disputes') fetchDisputes();
        if (activeTab === 'settings') fetchSettings();
    }, [activeTab]);

    // --- Actions ---

    // Settlement Actions
    const handleProcessSettlement = async (id: string) => {
        try {
            await adminApi.processSettlement(id);
            toast.success('Settlement processing started');
            fetchSettlements();
            setShowSettlementDetails(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to process');
        }
    };

    const handleRetrySettlement = async (id: string) => {
        try {
            await adminApi.retrySettlement(id);
            toast.success('Retrying settlement...');
            fetchSettlements();
            setShowSettlementDetails(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to retry');
        }
    };

    // Dispute Actions
    const handleCreateDispute = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminApi.createDispute({
                ...newDisputeData,
                amount: newDisputeData.amount ? parseFloat(newDisputeData.amount) * 100 : undefined
            });
            toast.success('Dispute logged successfully');
            setShowDisputeModal(false);
            setNewDisputeData({ settlementReference: '', reason: '', amount: '', priority: 'MEDIUM' });
            fetchDisputes();
        } catch (error: any) {
            toast.error('Failed to create dispute');
        }
    };

    const handleUpdateDisputeStatus = async (id: string, status: string) => {
        try {
            await adminApi.updateDispute(id, { status });
            toast.success(`Dispute ${status.toLowerCase()}`);
            fetchDisputes();
        } catch (error) {
            toast.error('Failed to update dispute');
        }
    };

    // Settings Actions
    const handleToggleWeekendSettlement = async (enabled: boolean) => {
        try {
            const updated = {
                ...systemSettings,
                globalSettlement: {
                    ...systemSettings.globalSettlement,
                    weekendSettlementEnabled: enabled
                }
            };
            await adminApi.updateSystemSettings(updated);
            setSystemSettings(updated);
            toast.success(`Weekend settlement ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            toast.error('Failed to update settings');
        }
    };

    const formatAmount = (amount: number) => `₦${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">Settlements & Payouts</h1>
                        {cronStatus && (
                            <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${cronStatus.isRunning ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                <span className={`w-2 h-2 rounded-full ${cronStatus.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                {cronStatus.isRunning ? 'SYSTEM RUNNING' : 'SYSTEM STOPPED'}
                            </span>
                        )}
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Manage global settlements and resolve disputes</p>
                    {cronStatus?.lastRun && (
                        <p className="text-xs text-slate-400 mt-1">Last Payment Run: {new Date(cronStatus.lastRun).toLocaleString()}</p>
                    )}
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Total Settled</p>
                    <h3 className="text-lg md:text-2xl font-bold text-green-600 mt-1">
                        {formatAmount(stats.totalSettled)}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Pending Settlements</p>
                    <h3 className="text-lg md:text-2xl font-bold text-blue-600 mt-1">
                        {formatAmount(stats.totalPending)}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Total Disputes</p>
                    <h3 className="text-lg md:text-2xl font-bold text-red-600 mt-1">
                        {formatAmount(stats.totalDisputed)}
                    </h3>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('settlements')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'settlements'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <DollarSign className="w-4 h-4" />
                        Settlements
                    </button>
                    <button
                        onClick={() => setActiveTab('disputes')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'disputes'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <AlertCircle className="w-4 h-4" />
                        Disputes
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'settings'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>
                </nav>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {/* 1. SETTLEMENTS TAB */}
                {activeTab === 'settlements' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-slate-900">All Settlements</h3>
                            <div className="flex gap-2">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="success">Success</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <button
                                    onClick={fetchSettlements}
                                    className="text-slate-600 hover:text-green-600 p-2 rounded-full hover:bg-slate-100"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {settlementsLoading ? (
                                <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tenant</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {settlements.map((s) => (
                                                <tr key={s._id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-slate-900">{s.reference}</div>
                                                        <div className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-slate-900">{s.userId?.businessName || s.userId?.firstName || 'Unknown User'}</div>
                                                        <div className="text-xs text-slate-500">{s.userId?.email || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                                                        {formatAmount(s.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <StatusBadge status={s.status} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => { setSelectedSettlement(s); setShowSettlementDetails(true); }}
                                                            className="text-green-600 hover:text-green-900"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. DISPUTES TAB */}
                {activeTab === 'disputes' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="text-lg font-medium text-slate-900">Settlement Disputes</h3>
                            <button
                                onClick={() => setShowDisputeModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Log Dispute
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {disputesLoading ? (
                                <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
                            ) : disputes.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">No disputes found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reason</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {disputes.map((d) => (
                                                <tr key={d._id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <StatusBadge status={d.priority} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-slate-900">{d.settlementReference}</div>
                                                        {d.amount && <div className="text-xs text-slate-500">{formatAmount(d.amount)}</div>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-slate-900 max-w-xs truncate">{d.reason}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <StatusBadge status={d.status} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2">
                                                            {d.status === 'OPEN' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleUpdateDisputeStatus(d._id, 'IN_PROGRESS')}
                                                                        className="text-blue-600 hover:text-blue-900"
                                                                    >
                                                                        Start
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateDisputeStatus(d._id, 'REJECTED')}
                                                                        className="text-slate-500 hover:text-slate-800"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            {d.status === 'IN_PROGRESS' && (
                                                                <button
                                                                    onClick={() => handleUpdateDisputeStatus(d._id, 'RESOLVED')}
                                                                    className="text-green-600 hover:text-green-900"
                                                                >
                                                                    Resolve
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Global Settlement Configuration */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-medium text-slate-900 mb-4">Global Auto-Settlement Configuration</h3>
                            <GlobalSettlementConfig onSuccess={() => toast.success('Configuration saved')} />
                        </div>



                        {/* Weekend Settlements Toggle */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-medium text-slate-900 mb-4">Global Settlement Configuration</h3>

                            {settingsLoading || !systemSettings ? (
                                <div className="p-4 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div></div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-slate-900">Weekend Settlements</h4>
                                            <p className="text-sm text-slate-500">Allow settlements to process on Saturday and Sunday.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={systemSettings?.globalSettlement?.weekendSettlementEnabled ?? true}
                                                onChange={(e) => handleToggleWeekendSettlement(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </label>
                                    </div>
                                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div className="flex gap-2 text-yellow-800">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            <p className="text-sm">
                                                Changes to settlement schedules will apply to all <strong>future</strong> settlement cycles. Existing pending settlements will not be affected.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* Settlement Details */}
            {showSettlementDetails && selectedSettlement && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Settlement Details</h2>
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div><span className="text-slate-500">Ref:</span> <div className="font-medium">{selectedSettlement.reference}</div></div>
                                <div><span className="text-slate-500">Amount:</span> <div className="font-medium">{formatAmount(selectedSettlement.amount)}</div></div>
                                <div><span className="text-slate-500">Date:</span> <div className="font-medium">{new Date(selectedSettlement.createdAt).toLocaleString()}</div></div>
                                <div><span className="text-slate-500">Status:</span> <div><StatusBadge status={selectedSettlement.status} /></div></div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setShowSettlementDetails(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Close</button>
                                {selectedSettlement.status === 'failed' && (
                                    <button onClick={() => handleRetrySettlement(selectedSettlement._id)} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Retry</button>
                                )}
                                {selectedSettlement.status === 'pending' && (
                                    <button onClick={() => handleProcessSettlement(selectedSettlement._id)} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Process</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Dispute Modal */}
            {showDisputeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Log New Dispute</h2>
                        <form onSubmit={handleCreateDispute} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Settlement/Transaction Ref</label>
                                <input
                                    required
                                    className="w-full px-4 py-2 border rounded-lg"
                                    value={newDisputeData.settlementReference}
                                    onChange={e => setNewDisputeData({ ...newDisputeData, settlementReference: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Reason</label>
                                <textarea
                                    required
                                    className="w-full px-4 py-2 border rounded-lg"
                                    rows={3}
                                    value={newDisputeData.reason}
                                    onChange={e => setNewDisputeData({ ...newDisputeData, reason: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount (Optional)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 border rounded-lg"
                                        value={newDisputeData.amount}
                                        onChange={e => setNewDisputeData({ ...newDisputeData, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Priority</label>
                                    <select
                                        className="w-full px-4 py-2 border rounded-lg"
                                        value={newDisputeData.priority}
                                        onChange={e => setNewDisputeData({ ...newDisputeData, priority: e.target.value as any })}
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowDisputeModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Log Dispute</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettlementsPage;
