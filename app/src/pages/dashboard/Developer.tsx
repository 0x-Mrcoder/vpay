import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Zap,
    ShieldCheck,
    ShieldAlert,
    Copy,
    RefreshCw,
    Save,
    Loader2,
    ExternalLink,
    Clock,
    Code,
    Terminal,
    Key,
    BookOpen,
    Info,
    AlertCircle,
    X,
    Eye,
    EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const Developer: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState(user?.webhookUrl || '');
    const [isEditingWebhook, setIsEditingWebhook] = useState(false);
    const [isUpdatingWebhook, setIsUpdatingWebhook] = useState(false);
    const [webhookError, setWebhookError] = useState('');

    // Payout Access Specific State
    const [payoutStatus, setPayoutStatus] = useState<string>(user?.payoutRequestStatus || 'none');
    const [payoutReason, setPayoutReason] = useState(user?.payoutRequestReason || '');
    const [payoutIps, setPayoutIps] = useState(user?.payoutIpWhitelist?.join(', ') || '');
    const [isRequestingPayout, setIsRequestingPayout] = useState(false);
    const [payoutSecretKey, setPayoutSecretKey] = useState<string | null>(null);
    const [isGeneratingPayoutKey, setIsGeneratingPayoutKey] = useState(false);
    const [hasPayoutKey, setHasPayoutKey] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Tab State
    const [activeSection, setActiveSection] = useState<'keys' | 'docs'>('keys');

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            await Promise.all([
                fetchApiKey(),
                fetchWebhookUrl(),
                fetchPayoutStatus()
            ]);
            setIsLoading(false);
        };
        loadInitialData();
    }, []);

    // Sync local payout status with AuthContext
    useEffect(() => {
        if (user?.payoutRequestStatus) {
            setPayoutStatus(user.payoutRequestStatus);
        }
        if (user?.payoutRequestReason) {
            setPayoutReason(user.payoutRequestReason);
        }
        if (user?.payoutIpWhitelist) {
            setPayoutIps(user.payoutIpWhitelist.join(', '));
        }
        if (user?.webhookUrl) {
            setWebhookUrl(user.webhookUrl);
        }
    }, [user]);

    const fetchApiKey = async () => {
        try {
            const response = await api.get('/developer/apikey');
            if (response.data.success) {
                setApiKey(response.data.data.apiKey);
            }
        } catch (error) {
            console.error('Error fetching API key:', error);
        }
    };

    const generateApiKey = async () => {
        if (apiKey && !window.confirm('Are you sure? Your old API key will stop working immediately.')) {
            return;
        }

        try {
            const response = await api.post('/developer/apikey');
            if (response.data.success) {
                setApiKey(response.data.data.apiKey);
                showNotification('API key generated successfully');
            }
        } catch (error) {
            showNotification('Failed to generate API key', 'error');
        }
    };

    const fetchWebhookUrl = async () => {
        try {
            const response = await api.get('/developer/webhook');
            if (response.data.success) {
                setWebhookUrl(response.data.data.webhookUrl || '');
            }
        } catch (error) {
            console.error('Error fetching webhook URL:', error);
        }
    };

    const updateWebhookUrl = async () => {
        setIsUpdatingWebhook(true);
        setWebhookError('');
        try {
            const response = await api.put('/developer/webhook', { webhookUrl });
            if (response.data.success) {
                setIsEditingWebhook(false);
                showNotification('Webhook URL updated successfully');
            }
        } catch (error: any) {
            setWebhookError(error.response?.data?.message || 'Failed to update webhook URL');
            showNotification(error.response?.data?.message || 'Failed to update webhook URL', 'error');
        } finally {
            setIsUpdatingWebhook(false);
        }
    };

    const fetchPayoutStatus = async () => {
        try {
            const response = await api.get('/developer/payout/status');
            if (response.data.success) {
                const data = response.data.data;
                setPayoutStatus(data.payoutRequestStatus);
                setPayoutIps(data.payoutIpWhitelist?.join(', ') || '');
                setHasPayoutKey(data.hasPayoutKey);
            }
        } catch (error) {
            console.error('Error fetching payout status:', error);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleRequestPayout = async () => {
        setIsRequestingPayout(true);
        try {
            const ipList = payoutIps.split(',').map(ip => ip.trim()).filter(Boolean);
            const response = await api.post('/developer/payout/request', {
                reason: payoutReason || 'Updated settings',
                ipWhitelist: ipList
            });
            if (response.data.success) {
                showNotification('Payout settings saved successfully');
                fetchPayoutStatus();
            }
        } catch (error: any) {
            showNotification(error.response?.data?.message || 'Failed to save payout settings', 'error');
        } finally {
            setIsRequestingPayout(false);
        }
    };

    const handleGeneratePayoutKey = async () => {
        if (!showConfirmModal && hasPayoutKey) {
            setShowConfirmModal(true);
            return;
        }

        setShowConfirmModal(false);
        setIsGeneratingPayoutKey(true);
        try {
            const response = await api.post('/developer/payout/generate-key');
            if (response.data.success) {
                setPayoutSecretKey(response.data.data.payoutSecretKey);
                showNotification('Payout secret key generated successfully');
                setHasPayoutKey(true);
            }
        } catch (error: any) {
            showNotification(error.response?.data?.message || 'Failed to generate payout key', 'error');
        } finally {
            setIsGeneratingPayoutKey(false);
        }
    };

    const handleRefreshStatus = async () => {
        setIsRefreshing(true);
        await refreshUser();
        await fetchPayoutStatus();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary-600" size={32} />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col gap-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Developer Dashboard</h1>
                        <p className="text-gray-500 mt-1 font-medium italic">Programmatic access control and security configuration.</p>
                    </div>

                    {/* Confirmation Modal */}
                    {showConfirmModal && (
                        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowConfirmModal(false)} />
                            <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-slide-up border border-slate-100">
                                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                                    <AlertCircle size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Regenerate Secret Key?</h3>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                                    This action will <span className="text-red-600 font-bold underline">permanently disable</span> your current payout secret key. Any existing integrations using the old key will stop working immediately.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowConfirmModal(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleGeneratePayoutKey}
                                        className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                                    >
                                        Yes, Regenerate
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notification Banner */}
                    {notification && (
                        <div className={`fixed top-24 right-8 z-[1000] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-slide-in pointer-events-auto ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                            {notification.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                            <span className="font-bold text-sm tracking-tight">{notification.message}</span>
                            <button onClick={() => setNotification(null)} className="ml-4 opacity-50 hover:opacity-100">
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Sub-navigation */}
                    <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveSection('keys')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeSection === 'keys' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Key size={14} /> API Keys
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveSection('docs')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeSection === 'docs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <div className="flex items-center gap-2">
                                <BookOpen size={14} /> Documentation
                            </div>
                        </button>
                    </div>
                </div>

                {activeSection === 'keys' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Settings Column */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* API Key Card */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                                            <Code className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Standard API Key</h3>
                                            <p className="text-xs text-gray-500">For virtual account management and standard payments.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex flex-col gap-4">
                                        <div className="relative group">
                                            <input
                                                type={showKey ? "text" : "password"}
                                                value={apiKey || ''}
                                                readOnly
                                                className="w-full pl-4 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-700 font-bold focus:ring-2 focus:ring-primary-500 transition-all"
                                                placeholder="Not generated yet"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                <button
                                                    onClick={() => setShowKey(!showKey)}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                    title={showKey ? "Hide key" : "Show key"}
                                                >
                                                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => apiKey && copyToClipboard(apiKey)}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={generateApiKey}
                                            className="w-full sm:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw size={16} />
                                            {apiKey ? 'Regenerate API Key' : 'Generate API Key'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Webhook Configuration Card */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                            <Terminal className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Webhooks</h3>
                                            <p className="text-xs text-gray-500">Receive real-time notifications for payment events.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Webhook URL</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={webhookUrl || ''}
                                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                                    readOnly={!isEditingWebhook}
                                                    className={`flex-1 px-4 py-3 border rounded-xl text-sm font-medium transition-all ${isEditingWebhook ? 'bg-white border-primary-500 ring-2 ring-primary-50' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                                    placeholder="https://your-domain.com/webhook"
                                                />
                                                {!isEditingWebhook ? (
                                                    <button
                                                        onClick={() => setIsEditingWebhook(true)}
                                                        className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200"
                                                    >
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={updateWebhookUrl}
                                                        disabled={isUpdatingWebhook}
                                                        className="px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {isUpdatingWebhook && <Loader2 size={14} className="animate-spin" />}
                                                        Save
                                                    </button>
                                                )}
                                            </div>
                                            {webhookError && <p className="text-red-500 text-xs font-medium ml-1 mt-1">{webhookError}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payout API Card */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                            <Key className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Secure Payout API</h3>
                                            <p className="text-xs text-gray-500">Programmatic access for external payouts.</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${payoutStatus === 'approved' && user?.isPayoutEnabled ? 'bg-green-100 text-green-700' : payoutStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {payoutStatus === 'approved' && user?.isPayoutEnabled ? 'ACTIVE' : payoutStatus.toUpperCase()}
                                    </span>
                                </div>

                                <div className="p-6">
                                    {/* Gated Access Logic */}
                                    {user?.kyc_status !== 'verified' ? (
                                        <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                                            <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm text-amber-500">
                                                <ShieldAlert size={32} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-lg">Verification Required</h4>
                                                <p className="text-sm text-slate-600 mt-2 max-w-sm mx-auto font-medium">
                                                    Your account must be verified before you can upgrade to Business (T3) and unlock Payout APIs.
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-3 w-full max-w-xs">
                                                <Link to="/dashboard/verification" className="px-8 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-100">
                                                    Go to Verification <ExternalLink size={16} />
                                                </Link>
                                                <button onClick={handleRefreshStatus} disabled={isRefreshing} className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-white transition-colors">
                                                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} /> Check Status
                                                </button>
                                            </div>
                                        </div>
                                    ) : (payoutStatus === 'none' || payoutStatus === 'rejected') ? (
                                        <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                                            <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-primary-500 shadow-sm">
                                                <ShieldCheck size={32} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-lg">T3 Business Upgrade Required</h4>
                                                <p className="text-sm text-slate-600 mt-2 max-w-sm mx-auto font-medium">
                                                    To access Private Payout APIs, you must upgrade to a Business (T3) account.
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-3 w-full max-w-xs">
                                                <Link to="/dashboard/verification" className="px-8 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-200">
                                                    Upgrade to T3 <ExternalLink size={16} />
                                                </Link>
                                                <button onClick={handleRefreshStatus} disabled={isRefreshing} className="text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
                                                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} /> Check for Approval
                                                </button>
                                            </div>
                                        </div>
                                    ) : (payoutStatus === 'pending' && !user?.isPayoutEnabled) ? (
                                        <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                                            <div className="w-16 h-16 bg-white border border-amber-200 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
                                                <Clock size={32} className="animate-pulse" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-amber-900 text-lg">Business Upgrade Under Review</h4>
                                                <p className="text-sm text-amber-700 mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                                                    Our compliance team is verifying your business documents (CAC/Utility Bill). Payout access will be enabled once approved.
                                                </p>
                                            </div>
                                            <button onClick={handleRefreshStatus} disabled={isRefreshing} className="px-8 py-3 bg-amber-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-700 transition-all shadow-lg shadow-amber-200">
                                                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? 'Checking...' : 'Check for Approval'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-sm text-green-800 font-medium flex items-center gap-3">
                                                <ShieldCheck size={20} />
                                                <div>
                                                    <p className="font-bold">Business (T3) Verified</p>
                                                    <p className="text-xs opacity-80">You have full access to programmed payouts.</p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">IP Security</h4>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Server IP Whitelist (Mandatory)</label>
                                                    <input
                                                        type="text"
                                                        value={payoutIps}
                                                        onChange={(e) => setPayoutIps(e.target.value)}
                                                        placeholder="e.g. 1.2.3.4, 5.6.7.8"
                                                        className="w-full mt-1.5 p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleRequestPayout}
                                                    disabled={isRequestingPayout}
                                                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-gray-800 transition-all shadow-sm"
                                                >
                                                    {isRequestingPayout ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    Update IP Configuration
                                                </button>
                                            </div>

                                            <div className="pt-2">
                                                {payoutSecretKey ? (
                                                    <div className="space-y-3 bg-red-50 p-6 rounded-2xl border border-red-200 animate-fade-in relative group/pout">
                                                        <div className="flex items-center gap-2 text-red-600">
                                                            <AlertCircle size={20} />
                                                            <label className="text-xs font-black uppercase tracking-widest">Secret Key (Save Now!)</label>
                                                        </div>
                                                        <p className="text-[10px] text-red-700 font-bold mb-2">This key will never be shown again. Copy it safely to your environment variables.</p>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={payoutSecretKey}
                                                                readOnly
                                                                className="w-full pl-4 pr-12 py-5 bg-white border-2 border-red-200 rounded-xl font-mono text-xs text-red-900 font-bold selection:bg-red-200"
                                                            />
                                                            <button
                                                                onClick={() => copyToClipboard(payoutSecretKey)}
                                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                                            >
                                                                <Copy size={18} />
                                                            </button>
                                                        </div>
                                                        <div className="pt-4 flex justify-end">
                                                            <button
                                                                onClick={handleGeneratePayoutKey}
                                                                disabled={isGeneratingPayoutKey}
                                                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-100"
                                                            >
                                                                <RefreshCw size={12} className={isGeneratingPayoutKey ? 'animate-spin' : ''} />
                                                                Regenerate
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-4">
                                                        {payoutStatus === 'approved' && user?.isPayoutEnabled && hasPayoutKey && (
                                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                                                        <Key size={16} className="text-slate-400" />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-600">vt_pout_sec_...</span>
                                                                </div>
                                                                <button
                                                                    onClick={handleGeneratePayoutKey}
                                                                    disabled={isGeneratingPayoutKey}
                                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 shadow-sm"
                                                                >
                                                                    <RefreshCw size={12} className={isGeneratingPayoutKey ? 'animate-spin' : ''} />
                                                                    REGENERATE
                                                                </button>
                                                            </div>
                                                        )}
                                                        {payoutStatus === 'approved' && user?.isPayoutEnabled && !hasPayoutKey && (
                                                            <button
                                                                onClick={handleGeneratePayoutKey}
                                                                disabled={isGeneratingPayoutKey}
                                                                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-red-100"
                                                            >
                                                                <Key size={16} />
                                                                GENERATE PAYOUT SECRET KEY
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Column */}
                        <div className="space-y-8">
                            {/* Status Sidebar Item */}
                            <div className="bg-gray-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-gray-200 border-t-4 border-primary-500">
                                <Zap className="absolute -right-4 -bottom-4 text-white/5" size={120} />
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Zap className="text-primary-400" size={20} />
                                    Integration Help
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex gap-3">
                                        <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</div>
                                        <p className="text-xs text-gray-300">Set your callback URL in Webhooks to receive payment updates.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</div>
                                        <p className="text-xs text-gray-300">Use <code className="bg-gray-800 px-1 rounded text-primary-400">sk_test_...</code> for development testing.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</div>
                                        <p className="text-xs text-gray-300">Whitelist your production server IPs for secure payout execution.</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveSection('docs')}
                                        className="block w-full text-center py-3 bg-white text-gray-900 rounded-xl text-xs font-bold mt-4 hover:bg-gray-100 transition-colors"
                                    >
                                        View API Documentation
                                    </button>
                                </div>
                            </div>

                            {/* Security Notice */}
                            <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100 flex items-start gap-4">
                                <ShieldCheck className="text-primary-600 flex-shrink-0" size={24} />
                                <div>
                                    <h4 className="text-sm font-bold text-primary-900">Security Best Practices</h4>
                                    <p className="text-xs text-primary-700 mt-1 font-medium italic">
                                        "Never share your Secret Key. Always rotate keys if you suspect a breach. Use IP whitelisting as a mandatory defense layer."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden animate-fade-in">
                        <div className="p-8 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BookOpen className="text-primary-600" size={24} />
                                <h3 className="text-xl font-bold text-gray-900">API Documentation</h3>
                            </div>
                            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-[10px] font-black uppercase tracking-widest">v1.2.0</span>
                        </div>

                        <div className="p-8 space-y-12">
                            {/* Payout API Docs */}
                            <section>
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-sm font-black text-purple-900 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                                        Secure Payout API (Premium)
                                    </h4>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${payoutStatus === 'approved' && user?.isPayoutEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {payoutStatus === 'approved' && user?.isPayoutEnabled ? 'AUTHORIZED' : 'UPGRADE REQUIRED'}
                                    </span>
                                </div>

                                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 mb-8 flex items-start gap-4">
                                    <Info className="text-purple-600 flex-shrink-0 mt-0.5" size={20} />
                                    <div className="text-xs text-purple-800 font-medium leading-relaxed">
                                        <p className="font-bold text-sm mb-1">Advanced Security Protocol</p>
                                        Payout requests require an HMAC-SHA256 signature hashed with your Payout Secret Key.
                                        Requests must originate from your whitelisted IPs: <span className="font-bold">{payoutIps || 'None set'}</span>.
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 font-mono text-xs overflow-x-auto shadow-xl group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-400 font-bold uppercase tracking-tighter bg-purple-400/10 px-1 rounded">POST</span>
                                                <span className="text-slate-100 font-bold">/v1/payout/secure/request</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const code = `curl -X POST https://api.vtstack.com.ng/api/v1/payout/secure/request \\\n  -H "Authorization: Bearer <PAYOUT_SECRET_KEY>" \\\n  -H "X-Timestamp: ${Date.now()}" \\\n  -H "X-Signature: <SIGNATURE>" \\\n  -d '{"amount": 250000, "bankCode": "999", "accountNumber": "0123456789", "accountName": "John Payout", "narration": "Invoicing #456"}'`;
                                                    copyToClipboard(code);
                                                    showNotification('Curl command copied');
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg transition-all"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>

                                        <div className="mt-6 space-y-4">
                                            <div>
                                                <span className="text-slate-500 block mb-1 font-bold uppercase tracking-tighter text-[10px]">Headers</span>
                                                <div className="grid grid-cols-[140px,1fr] gap-x-4 gap-y-1 ml-4 opacity-80">
                                                    <span className="text-slate-400">Authorization:</span>
                                                    <span className="text-purple-400 font-bold">Bearer <span className="italic">&lt;PAYOUT_SECRET_KEY&gt;</span></span>

                                                    <span className="text-slate-400">X-Timestamp:</span>
                                                    <span className="text-emerald-400">1713280000 </span>

                                                    <span className="text-slate-400">X-Signature:</span>
                                                    <span className="text-amber-400">hash(timestamp + body)</span>

                                                    <span className="text-slate-400">X-Idempotency-Key:</span>
                                                    <span className="text-blue-400">unique_string_123</span>
                                                </div>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-slate-800">
                                                <span className="text-slate-500 block mb-2 font-bold uppercase tracking-tighter text-[10px]">Payload Body</span>
                                                <pre className="text-emerald-300 leading-relaxed ml-4">
                                                    {`{
  "amount": 250000, 
  "bankCode": "999",
  "accountNumber": "0123456789",
  "accountName": "John Payout",
  "narration": "Invoicing #456"
}`}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 relative group">
                                        <h5 className="text-xs font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                            <Terminal size={14} /> Signature Generation Example (Node.js)
                                        </h5>
                                        <pre className="text-[10px] font-mono text-slate-700 bg-white p-4 rounded-xl border border-slate-100 overflow-x-auto leading-relaxed">
                                            {`const crypto = require('crypto');

const secret = 'vt_pout_sec_...';
const timestamp = Date.now().toString();
const body = JSON.stringify({ amount: 1000, ... });

const signature = crypto.createHmac('sha256', secret)
  .update(timestamp + body)
  .digest('hex');`}
                                        </pre>
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => {
                                                    const code = `const crypto = require('crypto');\n\nconst secret = 'vt_pout_sec_...';\nconst timestamp = Date.now().toString();\nconst body = JSON.stringify({ amount: 1000 });\n\nconst signature = crypto.createHmac('sha256', secret)\n  .update(timestamp + body)\n  .digest('hex');`;
                                                    copyToClipboard(code);
                                                    showNotification('Code snippet copied');
                                                }}
                                                className="p-1.5 bg-white shadow-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
