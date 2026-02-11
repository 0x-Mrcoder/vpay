import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';

interface HelpMessage {
    _id: string;
    userId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    subject: string;
    message: string;
    status: 'pending' | 'in_progress' | 'resolved';
    createdAt: string;
}

const HelpMessages: React.FC = () => {
    const [messages, setMessages] = useState<HelpMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedMessage, setSelectedMessage] = useState<HelpMessage | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getHelpMessages();
            setMessages(data);
        } catch (error) {
            console.error('Failed to fetch help messages:', error);
            toast.error('Failed to fetch help messages');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            setIsUpdating(true);
            await adminApi.updateHelpMessageStatus(id, newStatus);

            const updatedMessages = messages.map(msg =>
                msg._id === id ? { ...msg, status: newStatus as any } : msg
            );
            setMessages(updatedMessages);

            if (selectedMessage && selectedMessage._id === id) {
                setSelectedMessage({ ...selectedMessage, status: newStatus as any });
            }

            toast.success(`Status updated to ${newStatus}`);
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            pending: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
            in_progress: { text: 'In Progress', color: 'bg-blue-100 text-blue-800' },
            resolved: { text: 'Resolved', color: 'bg-green-100 text-green-800' },
        };
        const badge = badges[status as keyof typeof badges] || { text: status, color: 'bg-gray-100 text-gray-800' };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>{badge.text}</span>;
    };

    const filteredMessages = messages.filter(msg => {
        const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;
        return matchesStatus;
    });

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">Help & Support</h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Manage user support requests & tickets</p>
                </div>
                <button
                    onClick={fetchMessages}
                    className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm active:scale-95"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Stats & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Total Messages</p>
                    <h3 className="text-lg md:text-2xl font-bold text-slate-900 mt-1">{messages.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Pending</p>
                    <h3 className="text-lg md:text-2xl font-bold text-yellow-600 mt-1">
                        {messages.filter(m => m.status === 'pending').length}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Resolved</p>
                    <h3 className="text-lg md:text-2xl font-bold text-green-600 mt-1">
                        {messages.filter(m => m.status === 'resolved').length}
                    </h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">Filter by Status:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Messages Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
                        <p className="mt-2 text-slate-500">Loading messages...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] md:min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Subject
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Status
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
                                {filteredMessages.map((msg) => (
                                    <tr key={msg._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">
                                                    {msg.userId ? `${msg.userId.firstName} ${msg.userId.lastName}` : 'Unknown User'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {msg.userId ? msg.userId.email : ''}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="text-sm text-slate-900 truncate max-w-xs">{msg.subject}</div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(msg.status)}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(msg.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => {
                                                    setSelectedMessage(msg);
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
                                {filteredMessages.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            No messages found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {showDetails && selectedMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedMessage.subject}</h2>
                                    <p className="text-sm text-slate-500">
                                        From: {selectedMessage.userId ? `${selectedMessage.userId.firstName} ${selectedMessage.userId.lastName}` : 'Unknown'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-2">Message Content</h3>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap">
                                    {selectedMessage.message}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-2">Update Status</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        onClick={() => handleStatusChange(selectedMessage._id, 'pending')}
                                        disabled={isUpdating || selectedMessage.status === 'pending'}
                                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${selectedMessage.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 cursor-default'
                                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(selectedMessage._id, 'in_progress')}
                                        disabled={isUpdating || selectedMessage.status === 'in_progress'}
                                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${selectedMessage.status === 'in_progress'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200 cursor-default'
                                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        In Progress
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(selectedMessage._id, 'resolved')}
                                        disabled={isUpdating || selectedMessage.status === 'resolved'}
                                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${selectedMessage.status === 'resolved'
                                            ? 'bg-green-100 text-green-800 border border-green-200 cursor-default'
                                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        Resolved
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end">
                            <button
                                onClick={() => setShowDetails(false)}
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

export default HelpMessages;
