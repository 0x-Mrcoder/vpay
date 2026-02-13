import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
    Copy,
    RefreshCw,
    Eye,
    EyeOff,
    ExternalLink,
    Check,
    Terminal,
    ShieldCheck,
    BookOpen,
    Zap,
    AlertTriangle,
    Webhook,
    Save,
    Loader2,
    Code2,
    Activity
} from 'lucide-react';

export const Developer: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);


    const [copied, setCopied] = useState(false);

    // Webhook State
    const [webhookUrl, setWebhookUrl] = useState<string>('');
    const [isEditingWebhook, setIsEditingWebhook] = useState(false);
    const [isSavingWebhook, setIsSavingWebhook] = useState(false);
    const [webhookError, setWebhookError] = useState<string>('');
    const [webhookSuccess, setWebhookSuccess] = useState<string>('');

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([

                fetchApiKey(),
                fetchWebhookUrl()
            ]);
            setIsLoading(false);
        };
        init();
    }, []);



    const fetchApiKey = async () => {
        try {
            const response = await api.get('/developer/apikey');
            setApiKey(response.data.data.apiKey);
        } catch (error) {
            console.error('Error fetching API key:', error);
        }
    };



    const fetchWebhookUrl = async () => {
        try {
            const response = await api.get('/developer/webhook');
            if (response.data.success && response.data.data.webhookUrl) {
                setWebhookUrl(response.data.data.webhookUrl);
            }
        } catch (error) {
            console.error('Error fetching webhook URL:', error);
        }
    };

    const handleSaveWebhook = async () => {
        setWebhookError('');
        setWebhookSuccess('');

        // Validate webhook URL if provided
        if (webhookUrl && webhookUrl.trim()) {
            try {
                new URL(webhookUrl);
            } catch (error) {
                setWebhookError('Please enter a valid URL');
                return;
            }
        }

        setIsSavingWebhook(true);
        try {
            const response = await api.put('/developer/webhook', {
                webhookUrl: webhookUrl.trim() || null
            });

            if (response.data.success) {
                setWebhookSuccess(response.data.message);
                setIsEditingWebhook(false);
                setTimeout(() => setWebhookSuccess(''), 3000);
            }
        } catch (error: any) {
            console.error('Error saving webhook:', error);
            setWebhookError(error.response?.data?.message || 'Failed to save webhook URL');
        } finally {
            setIsSavingWebhook(false);
        }
    };

    const handleGenerateKey = async () => {
        if (apiKey && !window.confirm('Are you sure you want to regenerate your API key? The old key will stop working immediately.')) {
            return;
        }

        setIsGenerating(true);
        try {
            const response = await api.post('/developer/apikey');
            setApiKey(response.data.data.apiKey);
            setShowKey(true);
        } catch (error) {
            console.error('Error generating API key:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };



    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="text-primary-600 animate-spin" />
                    <p className="text-gray-600 font-medium">Loading developer tools...</p>
                </div>
            </div>
        );
    }



    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Developer Tools</h1>
                    <p className="text-gray-500 mt-2 text-sm max-w-xl">
                        Manage your API keys and webhooks to integrate functionalities directly into your application.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/api-docs"
                        className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 text-sm font-semibold shadow-sm"
                    >
                        <BookOpen className="w-4 h-4" />
                        API Documentation
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* API Key Section */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                                    <Terminal className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">API Credentials</h3>
                                    <p className="text-xs text-gray-500">Manage your secret keys</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${apiKey?.startsWith('sk_live_') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {apiKey?.startsWith('sk_live_') ? 'Live Mode' : 'Test Mode'}
                            </span>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Secret Key</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Code2 className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={apiKey || ''}
                                        readOnly
                                        className="w-full pl-11 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm text-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                                        placeholder="No API key generated"
                                    />
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                    >
                                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500">This key grants full access to your account. Keep it safe.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                <button
                                    onClick={() => apiKey && copyToClipboard(apiKey)}
                                    disabled={!apiKey}
                                    className="flex-1 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {copied ? (
                                        <>
                                            <Check size={18} className="text-green-600" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={18} />
                                            Copy Key
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleGenerateKey}
                                    disabled={isGenerating}
                                    className="flex-1 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={18} className={isGenerating ? "animate-spin" : ""} />
                                    {apiKey ? 'Regenerate Key' : 'Generate Key'}
                                </button>
                            </div>

                            <div className="bg-amber-50 rounded-xl p-4 flex gap-3 border border-amber-100/50">
                                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                                <div className="text-sm text-amber-900">
                                    <span className="font-bold">Security Warning:</span> Do not share your API key in client-side code (browsers, mobile apps). If compromised, regenerate it immediately.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Webhook Section */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                                    <Webhook className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Webhooks</h3>
                                    <p className="text-xs text-gray-500">Real-time event notifications</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${webhookUrl ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${webhookUrl ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                {webhookUrl ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="p-6">
                            {webhookSuccess && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
                                    <Check size={20} className="text-green-600" />
                                    <p className="text-sm text-green-800 font-medium">{webhookSuccess}</p>
                                </div>
                            )}

                            {webhookError && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-fade-in">
                                    <AlertTriangle size={20} className="text-red-600" />
                                    <p className="text-sm text-red-800 font-medium">{webhookError}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700">Callback URL</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Activity className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="url"
                                            value={webhookUrl}
                                            onChange={(e) => setWebhookUrl(e.target.value)}
                                            disabled={!isEditingWebhook && !!webhookUrl}
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm text-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                                            placeholder="https://your-domain.com/webhooks/vtpay"
                                        />
                                    </div>

                                    {!isEditingWebhook && webhookUrl ? (
                                        <button
                                            onClick={() => setIsEditingWebhook(true)}
                                            className="px-6 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm transition-all whitespace-nowrap"
                                        >
                                            Edit URL
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSaveWebhook}
                                            disabled={isSavingWebhook}
                                            className="px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 whitespace-nowrap disabled:opacity-70 shadow-primary-200"
                                        >
                                            {isSavingWebhook ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            Save
                                        </button>
                                    )}
                                </div>
                                {isEditingWebhook && (
                                    <button
                                        onClick={() => {
                                            setIsEditingWebhook(false);
                                            fetchWebhookUrl();
                                            setWebhookError('');
                                        }}
                                        className="text-xs text-gray-500 hover:text-gray-700 font-medium underline"
                                    >
                                        Cancel editing
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Start */}
                    <div className="bg-gray-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-gray-200">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Zap size={100} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <Zap className="text-primary-500 fill-primary-500" size={20} />
                                Quick Start
                            </h3>
                            <div className="space-y-5">
                                <div className="flex gap-4">
                                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                                    <p className="text-sm text-gray-300 font-medium">Generate your API key.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                                    <p className="text-sm text-gray-300 font-medium">Add header: <code className="bg-black/30 px-1.5 py-0.5 rounded text-primary-400 text-xs">Authorization: Bearer sk_...</code></p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                                    <p className="text-sm text-gray-300 font-medium">Make a request to <code className="text-xs text-gray-400">/api/v1/accounts</code>.</p>
                                </div>
                            </div>
                            <Link
                                to="/api-docs"
                                className="mt-8 w-full py-3.5 bg-white text-gray-900 text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all shadow-lg"
                            >
                                Read Docs <ExternalLink size={14} />
                            </Link>
                        </div>
                    </div>

                    {/* Security Badge */}
                    <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100 flex items-start gap-4">
                        <div className="p-2 bg-primary-100 rounded-xl text-primary-600 flex-shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-primary-900">Security First</h4>
                            <p className="text-xs text-primary-800 mt-1 leading-relaxed">
                                All requests are encrypted with AES-256. We monitor for suspicious patterns 24/7.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
