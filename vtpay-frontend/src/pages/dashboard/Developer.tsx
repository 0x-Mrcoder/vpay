import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
    Copy,
    RefreshCw,
    Eye,
    EyeOff,
    Code,
    ExternalLink,
    Check,
    Terminal,
    ShieldCheck,
    BookOpen,
    Zap,
    AlertTriangle,
    Webhook,
    Save,
    Loader2
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
                    <Loader2 size={40} className="text-green-600 animate-spin" />
                    <p className="text-gray-600 font-medium">Loading developer tools...</p>
                </div>
            </div>
        );
    }



    return (
        <div className="space-y-6 md:space-y-8 max-w-[1400px] animate-fade-in p-4 md:p-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Developer Tools</h1>
                    <p className="text-sm text-gray-500 mt-1">Integrate VTPay into your applications with our robust API</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/api-docs"
                        className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                    >
                        <BookOpen className="w-4 h-4" />
                        API Documentation
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* API Key Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                                    <Terminal className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-gray-900">API Keys</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500">Your secret keys for authenticating requests</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 md:p-8">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black">Secret Key</label>
                                    <span className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest ${apiKey?.startsWith('sk_live_') ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {apiKey?.startsWith('sk_live_') ? 'Live Mode' : 'Test Mode'}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="relative group">
                                        <input
                                            type={showKey ? "text" : "password"}
                                            value={apiKey || ''}
                                            readOnly
                                            className="w-full pl-5 pr-12 py-3.5 md:py-4 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl font-mono text-sm md:text-base text-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                            placeholder="No API key generated"
                                        />
                                        <button
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
                                        >
                                            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={() => apiKey && copyToClipboard(apiKey)}
                                            disabled={!apiKey}
                                            className="flex-1 py-3.5 md:py-4 border-2 border-gray-100 hover:bg-gray-50 text-gray-700 rounded-xl md:rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check size={18} className="text-green-600" />
                                                    Copied!
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
                                            className="flex-1 py-3.5 md:py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl md:rounded-2xl font-black text-sm transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw size={18} className={isGenerating ? "animate-spin" : ""} />
                                            {apiKey ? 'Regenerate Key' : 'Generate Key'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 bg-amber-50 border border-amber-100 rounded-xl md:rounded-2xl p-5 md:p-6 flex items-start gap-4">
                                <div className="p-2 bg-amber-100 rounded-full text-amber-600 flex-shrink-0 mt-0.5">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm md:text-base font-black text-amber-900">Security Warning</h4>
                                    <p className="text-xs md:text-sm text-amber-800 mt-1 leading-relaxed font-medium">
                                        Keep your secret keys safe. Do not share them in public repositories or client-side code. If you suspect a key has been compromised, regenerate it immediately.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Webhook Configuration Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-100">
                                    <Webhook className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-gray-900">Webhook Configuration</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500">Receive real-time payment notifications</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 md:p-8">
                            {webhookSuccess && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl md:rounded-2xl flex items-start gap-3 animate-fade-in">
                                    <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-800 font-bold">{webhookSuccess}</p>
                                </div>
                            )}

                            {webhookError && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl md:rounded-2xl flex items-start gap-3 animate-fade-in">
                                    <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800 font-bold">{webhookError}</p>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black">Webhook URL</label>
                                    {!isEditingWebhook && webhookUrl && (
                                        <button
                                            onClick={() => setIsEditingWebhook(true)}
                                            className="text-[10px] md:text-xs text-purple-600 hover:text-purple-700 font-black uppercase tracking-widest transition-colors"
                                        >
                                            Change URL
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-col gap-4">
                                    <input
                                        type="url"
                                        value={webhookUrl}
                                        onChange={(e) => setWebhookUrl(e.target.value)}
                                        disabled={!isEditingWebhook && !!webhookUrl}
                                        className="w-full px-5 py-3.5 md:py-4 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl font-mono text-sm md:text-base text-gray-600 focus:outline-none focus:border-purple-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        placeholder="https://your-domain.com/webhooks/vtpay"
                                    />

                                    {(isEditingWebhook || !webhookUrl) && (
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={handleSaveWebhook}
                                                disabled={isSavingWebhook}
                                                className="flex-1 py-3.5 md:py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl md:rounded-2xl font-black text-sm transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-2"
                                            >
                                                {isSavingWebhook ? (
                                                    <>
                                                        <Loader2 size={18} className="animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={18} />
                                                        Save Webhook
                                                    </>
                                                )}
                                            </button>
                                            {webhookUrl && (
                                                <button
                                                    onClick={() => {
                                                        setIsEditingWebhook(false);
                                                        fetchWebhookUrl();
                                                        setWebhookError('');
                                                    }}
                                                    className="px-8 py-3.5 md:py-4 border-2 border-gray-100 hover:bg-gray-50 text-gray-700 rounded-xl md:rounded-2xl font-black text-sm transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 bg-purple-50 rounded-xl md:rounded-2xl p-5 md:p-6 border border-purple-100">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-purple-100 rounded-full text-purple-600 flex-shrink-0 mt-0.5">
                                        <Webhook size={18} />
                                    </div>
                                    <div className="text-xs md:text-sm text-purple-900 space-y-3">
                                        <p className="font-black uppercase tracking-widest text-[10px]">What are webhooks?</p>
                                        <p className="leading-relaxed text-purple-800 font-medium">
                                            Webhooks allow VTPay to send real-time notifications to your server when events occur, such as successful payments or virtual account credits.
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {['payment.successful', 'payment.failed', 'account.credited'].map(event => (
                                                <span key={event} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg font-mono text-[10px] font-bold">
                                                    {event}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Start Card */}
                    <div className="bg-gray-900 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-gray-200">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Zap size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-black text-lg md:text-xl mb-8 flex items-center gap-2 uppercase tracking-tight">
                                <Zap className="text-yellow-400" size={24} />
                                Quick Start
                            </h3>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 border border-white/10">1</div>
                                    <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-medium">Generate your API keys from the configuration panel.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 border border-white/10">2</div>
                                    <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-medium">Use the Secret Key in your Authorization header: <code className="bg-black/30 px-2 py-0.5 rounded font-mono text-yellow-400 text-[10px] md:text-xs">Bearer sk_...</code></p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 border border-white/10">3</div>
                                    <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-medium">Start creating virtual accounts and receiving payments.</p>
                                </div>
                            </div>
                            <Link
                                to="/api-docs"
                                className="mt-10 w-full py-4 bg-white text-gray-900 text-sm font-black rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all shadow-lg shadow-black/20"
                            >
                                Read Full Documentation
                                <ExternalLink size={16} />
                            </Link>
                        </div>
                    </div>

                    {/* Security Badge */}
                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-100 rounded-full blur-2xl opacity-50"></div>
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm md:text-base font-black text-blue-900">Enterprise Security</h4>
                                <p className="text-xs md:text-sm text-blue-800 mt-1 leading-relaxed font-medium">
                                    Our API uses industry-standard AES-256 encryption. All requests are monitored for suspicious activity.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payout Modal */}

        </div>
    );
};
