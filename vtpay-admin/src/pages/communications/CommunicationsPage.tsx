import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';

interface Communication {
    _id: string;
    recipientType: 'all' | 'active' | 'specific';
    recipientCount: number;
    subject: string;
    message: string;
    sentAt: string;
}

const CommunicationsPage: React.FC = () => {
    const [recipientType, setRecipientType] = useState<'all' | 'active' | 'specific'>('all');
    const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [tenants, setTenants] = useState<any[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [recentCommunications, setRecentCommunications] = useState<Communication[]>([]);
    const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
    const [showMessageModal, setShowMessageModal] = useState(false);

    useEffect(() => {
        fetchTenants();
        fetchRecentCommunications();
    }, []);

    const fetchTenants = async () => {
        try {
            const data = await adminApi.getAllTenants();
            setTenants(data);
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        }
    };

    const fetchRecentCommunications = async () => {
        try {
            const data = await adminApi.getRecentCommunications();
            setRecentCommunications(data);
        } catch (error) {
            console.error('Failed to fetch recent communications:', error);
        }
    };

    const toggleTenantSelection = (tenantId: string) => {
        setSelectedTenants(prev =>
            prev.includes(tenantId)
                ? prev.filter(id => id !== tenantId)
                : [...prev, tenantId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedTenants.length === filteredTenantsForSelection.length) {
            setSelectedTenants([]);
        } else {
            setSelectedTenants(filteredTenantsForSelection.map(t => t._id));
        }
    };

    const filteredTenantsForSelection = tenants.filter(tenant =>
        (tenant.email?.toLowerCase() || '').includes(userSearchQuery.toLowerCase()) ||
        (tenant.firstName?.toLowerCase() || '').includes(userSearchQuery.toLowerCase()) ||
        (tenant.lastName?.toLowerCase() || '').includes(userSearchQuery.toLowerCase()) ||
        (tenant.businessName?.toLowerCase() || '').includes(userSearchQuery.toLowerCase())
    );

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (recipientType === 'specific' && selectedTenants.length === 0) {
            toast.error('Please select at least one tenant');
            return;
        }

        setSending(true);

        try {
            await adminApi.sendBulkEmail({
                recipientType,
                selectedTenants,
                subject,
                message,
            });
            toast.success('Email sent successfully!');
            setSubject('');
            setMessage('');
            setRecipientType('all');
            setSelectedTenants([]);
            // Refresh recent communications
            fetchRecentCommunications();
        } catch (error) {
            console.error('Failed to send email:', error);
            toast.error('Failed to send email');
        } finally {
            setSending(false);
        }
    };

    const handleViewMessage = (communication: Communication) => {
        setSelectedCommunication(communication);
        setShowMessageModal(true);
    };

    const getRecipientLabel = (type: string) => {
        const labels = {
            all: 'All Tenants',
            active: 'Active Tenants',
            specific: 'Selected Tenants'
        };
        return labels[type as keyof typeof labels] || type;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">Communications</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">Send email announcements and notifications to tenants</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compose Email Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
                        <form onSubmit={handleSend} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Recipients</label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="recipientType"
                                            value="all"
                                            checked={recipientType === 'all'}
                                            onChange={(e) => setRecipientType(e.target.value as any)}
                                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-sm text-slate-700">All Tenants</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="recipientType"
                                            value="active"
                                            checked={recipientType === 'active'}
                                            onChange={(e) => setRecipientType(e.target.value as any)}
                                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-sm text-slate-700">Active Tenants Only</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="recipientType"
                                            value="specific"
                                            checked={recipientType === 'specific'}
                                            onChange={(e) => setRecipientType(e.target.value as any)}
                                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-sm text-slate-700">Specific Tenants</span>
                                    </label>
                                </div>
                            </div>

                            {recipientType === 'specific' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <label className="block text-sm font-medium text-slate-700">Select Tenants ({selectedTenants.length} selected)</label>
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={userSearchQuery}
                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                            className="w-full sm:w-64 px-3 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>

                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="max-h-64 overflow-y-auto overflow-x-auto">
                                            <table className="w-full text-sm text-left min-w-[500px]">
                                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 w-10">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedTenants.length > 0 && selectedTenants.length === filteredTenantsForSelection.length}
                                                                onChange={toggleSelectAll}
                                                                className="rounded text-green-600 focus:ring-green-500"
                                                            />
                                                        </th>
                                                        <th className="px-4 py-2 font-medium text-slate-600">Name / Business</th>
                                                        <th className="px-4 py-2 font-medium text-slate-600">Email</th>
                                                        <th className="px-4 py-2 font-medium text-slate-600">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredTenantsForSelection.length > 0 ? (
                                                        filteredTenantsForSelection.map(tenant => (
                                                            <tr
                                                                key={tenant._id}
                                                                className={`hover:bg-slate-50 cursor-pointer ${selectedTenants.includes(tenant._id) ? 'bg-green-50' : ''}`}
                                                                onClick={() => toggleTenantSelection(tenant._id)}
                                                            >
                                                                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedTenants.includes(tenant._id)}
                                                                        onChange={() => toggleTenantSelection(tenant._id)}
                                                                        className="rounded text-green-600 focus:ring-green-500"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <div className="font-medium text-slate-900">
                                                                        {tenant.businessName || `${tenant.firstName} ${tenant.lastName}`}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2 text-slate-600">{tenant.email}</td>
                                                                <td className="px-4 py-2">
                                                                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                                                        }`}>
                                                                        {tenant.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                                                No users found matching your search.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Select the users you want to receive this communication.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Enter email subject"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Message Body</label>
                                <textarea
                                    required
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-64 resize-none"
                                    placeholder="Type your message here..."
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                >
                                    {sending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            Send Email
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sidebar / Info */}
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 md:p-6 rounded-xl border border-blue-100">
                        <h3 className="text-base md:text-lg font-medium text-blue-900 mb-2">Email Guidelines</h3>
                        <ul className="space-y-2 text-xs md:text-sm text-blue-800">
                            <li className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                Keep subject lines clear and concise.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                Use professional language in your messages.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                Double-check recipient selection before sending.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                Avoid sending sensitive information via email.
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-medium text-slate-900 mb-4">Recent Communications</h3>
                        <div className="space-y-4">
                            {recentCommunications.length > 0 ? (
                                recentCommunications.slice(0, 5).map((comm) => (
                                    <div
                                        key={comm._id}
                                        className="pb-4 border-b border-slate-100 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                                        onClick={() => handleViewMessage(comm)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-sm font-medium text-slate-900 truncate pr-2">{comm.subject}</p>
                                            <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(comm.sentAt)}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 line-clamp-2">
                                            {comm.message}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
                                                {getRecipientLabel(comm.recipientType)}
                                            </span>
                                            <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-600 rounded-full">
                                                {comm.recipientCount} Recipients
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-slate-500">No recent communications</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Message View Modal */}
            {showMessageModal && selectedCommunication && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedCommunication.subject}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                            {getRecipientLabel(selectedCommunication.recipientType)}
                                        </span>
                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded-full">
                                            {selectedCommunication.recipientCount} Recipients
                                        </span>
                                        <span className="text-xs text-slate-500">• {new Date(selectedCommunication.sentAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowMessageModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <h3 className="text-sm font-medium text-slate-500 mb-2">Message Content</h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap">
                                {selectedCommunication.message}
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end">
                            <button
                                onClick={() => setShowMessageModal(false)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunicationsPage;
