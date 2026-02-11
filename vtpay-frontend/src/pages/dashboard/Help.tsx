import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Send, MessageSquare, CheckCircle2, AlertCircle, History, Clock, CheckCircle } from 'lucide-react';

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
                return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><Clock size={12} /> Pending</span>;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-10 animate-fade-in">
            {/* Header */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Need Help?</h1>
                <p className="text-sm text-gray-500 mt-1">Have a question or run into an issue? Send us a message and we'll help you out.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Form Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-base md:text-lg font-black text-gray-900">Send a Message</h3>
                            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">We typically respond within 24 hours</p>
                        </div>
                        <div className="p-5 md:p-8">
                            {success && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-fade-in">
                                    <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-800 font-bold">{success}</p>
                                </div>
                            )}

                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800 font-bold">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5">Subject</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3.5 rounded-xl md:rounded-2xl border-2 border-gray-100 focus:border-green-500 outline-none transition-all font-bold text-sm md:text-base bg-gray-50"
                                        placeholder="What is this about?"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5">Message</label>
                                    <textarea
                                        className="w-full px-4 py-3.5 rounded-xl md:rounded-2xl border-2 border-gray-100 focus:border-green-500 outline-none transition-all font-bold text-sm md:text-base bg-gray-50 resize-none"
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
                                        className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl md:rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0 uppercase tracking-widest"
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
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-base md:text-lg font-black text-gray-900">Message History</h3>
                                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">Track your support requests</p>
                            </div>
                            <button onClick={fetchMessages} className="p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all">
                                <History size={20} />
                            </button>
                        </div>
                        <div className="p-5 md:p-8">
                            {isLoadingMessages ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-10 h-10 border-4 border-green-100 border-t-green-600 rounded-full animate-spin"></div>
                                </div>
                            ) : messages.length > 0 ? (
                                <div className="space-y-4">
                                    {messages.map((msg) => (
                                        <div key={msg._id} className="p-5 rounded-2xl border-2 border-gray-50 hover:border-green-100 transition-all group">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                                                <span className="font-black text-gray-900 text-sm md:text-base group-hover:text-green-700 transition-colors">{msg.subject}</span>
                                                <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    {new Date(msg.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs md:text-sm text-gray-600 mb-4 line-clamp-2 font-medium leading-relaxed">{msg.message}</p>
                                            <div className="flex justify-start">
                                                {getStatusBadge(msg.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <MessageSquare size={32} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No messages yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Contact Info */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 md:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                <MessageSquare size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-2 tracking-tight">Live Chat</h3>
                            <p className="text-blue-100 text-sm mb-6 font-medium leading-relaxed">Chat with our support team in real-time for instant assistance.</p>
                            <button className="w-full py-4 bg-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-lg transform hover:-translate-y-1 active:translate-y-0 uppercase tracking-widest text-xs">
                                Start Chat
                            </button>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 md:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                <Send size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-2 tracking-tight">Email Support</h3>
                            <p className="text-green-100 text-sm mb-2 font-medium">support@vtpay.com</p>
                            <a href="mailto:support@vtpay.com" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:underline mt-4">
                                Send Email
                                <Send size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
