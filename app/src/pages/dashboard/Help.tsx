import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Send, MessageSquare, CheckCircle2, AlertCircle, History, Clock, CheckCircle, HelpCircle, Mail } from 'lucide-react';

interface HelpMessage {
    _id: string;
    subject: string;
    message: string;
    status: 'pending' | 'in_progress' | 'resolved';
    createdAt: string;
}

export const Help: React.FC = () => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [messages, setMessages] = useState<HelpMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const response = await api.get('/help/my-messages');
            if (response.data.success) {
                setMessages(response.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.post('/help', {
                subject,
                message,
            });
            setSuccess('Your message has been sent successfully. We will get back to you shortly.');
            setSubject('');
            setMessage('');
            fetchMessages();
        } catch (err: any) {
            console.error('Failed to send help message:', err);
            setError(err.response?.data?.message || 'Failed to send message. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'resolved':
                return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle size={12} /> Resolved</span>;
            case 'in_progress':
                return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700"><Clock size={12} /> In Progress</span>;
            default:
                return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700"><Clock size={12} /> Pending</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Help Center</h1>
                    <p className="text-gray-500 mt-2 text-sm max-w-xl">
                        Have a question or run into an issue? Send us a message and we'll help you out.
                    </p>
                </div>
                <div className="p-3 bg-white rounded-xl text-primary-600 shadow-sm border border-gray-100">
                    <HelpCircle size={32} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Form Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <div className="p-2.5 bg-primary-100 text-primary-700 rounded-xl">
                                <Send size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Send a Message</h3>
                                <p className="text-xs text-gray-500">We typically respond within 24 hours</p>
                            </div>
                        </div>
                        <div className="p-6 md:p-8">
                            {success && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
                                    <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                                    <p className="text-sm text-green-800 font-medium">{success}</p>
                                </div>
                            )}

                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-fade-in">
                                    <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                                    <p className="text-sm text-red-800 font-medium">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 bg-gray-50 text-sm"
                                        placeholder="What is this about?"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                                    <textarea
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 bg-gray-50 text-sm resize-none"
                                        placeholder="Describe your issue or question in detail..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                        rows={6}
                                    ></textarea>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="w-full sm:w-auto px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Send Message
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Message History */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl">
                                    <History size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Message History</h3>
                                    <p className="text-xs text-gray-500">Track your support requests</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchMessages}
                                className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                title="Refresh messages"
                            >
                                <History size={20} />
                            </button>
                        </div>
                        <div className="p-6 md:p-8">
                            {isLoadingMessages ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                                </div>
                            ) : messages.length > 0 ? (
                                <div className="space-y-4">
                                    {messages.map((msg) => (
                                        <div key={msg._id} className="p-5 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all group bg-gray-50/50 hover:bg-white">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                                <span className="font-bold text-gray-900 text-sm md:text-base group-hover:text-primary-700 transition-colors">{msg.subject}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-medium text-gray-400">
                                                        {new Date(msg.createdAt).toLocaleDateString()}
                                                    </span>
                                                    {getStatusBadge(msg.status)}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{msg.message}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                        <MessageSquare size={32} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-400">No messages yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Contact Info */}
                <div className="space-y-6">
                    <div className="bg-gray-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <MessageSquare size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/10">
                                <MessageSquare size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Live Chat</h3>
                            <p className="text-gray-400 text-sm mb-8 font-medium leading-relaxed">Chat with our support team in real-time for instant assistance.</p>
                            <button className="w-full py-3.5 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-lg transform active:scale-95 text-sm flex items-center justify-center gap-2">
                                Start Chat
                            </button>
                        </div>
                    </div>

                    <div className="bg-primary-600 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Mail size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/10">
                                <Mail size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Email Support</h3>
                            <p className="text-primary-100 text-sm mb-6 font-medium">support@vtpay.com</p>
                            <a href="mailto:support@vtpay.com" className="w-full py-3.5 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-all shadow-lg transform active:scale-95 text-sm flex items-center justify-center gap-2">
                                Send Email
                                <Send size={16} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
