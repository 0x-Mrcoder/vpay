import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, ShieldCheck, CreditCard, User, Loader2 } from 'lucide-react';
import { adminApi } from '../../api/client';

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await adminApi.markAllNotificationsRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            alert('All notifications marked as read');
        } catch (error) {
            alert('Failed to update notifications');
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await adminApi.markNotificationRead(id);
            setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'kyc': return <ShieldCheck className="w-5 h-5 text-blue-600" />;
            case 'payout_access': return <ShieldCheck className="w-5 h-5 text-purple-600" />;
            case 'payout': return <CreditCard className="w-5 h-5 text-emerald-600" />;
            case 'system': return <User className="w-5 h-5 text-slate-600" />;
            default: return <Bell className="w-5 h-5 text-primary-600" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'kyc': return 'bg-blue-100';
            case 'payout_access': return 'bg-purple-100';
            case 'payout': return 'bg-emerald-100';
            default: return 'bg-slate-100';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary-600" size={32} />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">System Notifications</h1>
                    <p className="text-sm text-slate-500 mt-1">Important alerts for KYC, Payouts, and System events.</p>
                </div>
                {notifications.some(n => !n.isRead) && (
                    <button 
                        onClick={handleMarkAllRead}
                        className="text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-6 py-3 rounded-xl transition-all flex items-center gap-2 border border-primary-100"
                    >
                        <CheckCircle size={16} />
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 shadow-sm text-slate-200">
                            <Bell className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">All clear!</h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto">
                            There are no new notifications to display right now.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map((notification) => (
                            <div 
                                key={notification._id} 
                                onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                                className={`p-6 transition-all cursor-pointer flex gap-5 ${notification.isRead ? 'opacity-60 grayscale-[0.5]' : 'bg-white hover:bg-slate-50 border-l-4 border-l-primary-500'}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${getTypeColor(notification.type)}`}>
                                    {getTypeIcon(notification.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`text-md font-bold ${notification.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{notification.title}</h4>
                                            {!notification.isRead && <span className="w-2 h-2 rounded-full bg-primary-600"></span>}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                <Clock size={10} />
                                                {new Date(notification.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                            </span>
                                            {notification.priority === 'high' && !notification.isRead && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[8px] font-black uppercase tracking-tighter">Urgent</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className={`text-sm mt-1 leading-relaxed ${notification.isRead ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>{notification.message}</p>
                                    
                                    {!notification.isRead && (
                                        <div className="mt-4 flex items-center gap-3">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(notification._id);
                                                }}
                                                className="text-[10px] font-bold text-slate-400 hover:text-primary-600 uppercase tracking-widest transition-colors"
                                            >
                                                Mark as Read
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
