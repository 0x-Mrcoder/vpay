import React, { useState, useEffect } from 'react';
import {
    Bell,
    Shield,
    User,
    Smartphone,
    Key,
    ChevronRight,
    ShieldCheck,
    Globe,
    CreditCard,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const Settings: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('General');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Integrations State
    const [settings, setSettings] = useState<any>(null);

    // Parent Account State
    const [parentAccountName, setParentAccountName] = useState('');
    const [parentAccountNumber, setParentAccountNumber] = useState('');
    const [parentBankCode, setParentBankCode] = useState('');

    useEffect(() => {
        if (activeTab === 'Integrations' && user?.role === 'admin') {
            fetchSettings();
        }
    }, [activeTab]);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/admin/settings');
            setSettings(response.data.data);
            const data = response.data.data;

            setParentAccountName(data.parentAccount?.accountName || '');
            setParentAccountNumber(data.parentAccount?.accountNumber || '');
            setParentBankCode(data.parentAccount?.bankCode || '');
        } catch (error) {
            console.error('Error fetching settings:', error);
            setErrorMessage('Failed to load integration settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveIntegrations = async () => {
        setIsSaving(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            await api.patch('/admin/settings', {
                parentAccount: {
                    accountName: parentAccountName,
                    accountNumber: parentAccountNumber,
                    bankCode: parentBankCode,
                    type: 'PRIMARY',
                    status: 'ACTIVE'
                }
            });
            setSuccessMessage('Settings updated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error: any) {
            console.error('Error saving settings:', error);
            setErrorMessage(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };



    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-10 animate-fade-in">
            {/* Header */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your account preferences and security settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar gap-1">
                        {[
                            { icon: User, label: 'General' },
                            { icon: Bell, label: 'Notifications' },
                            { icon: Shield, label: 'Security' },
                            { icon: CreditCard, label: 'Billing' },
                            ...(user?.role === 'admin' ? [{ icon: Globe, label: 'Integrations' }] : []),
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={() => setActiveTab(item.label)}
                                className={`flex-shrink-0 lg:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200 text-[10px] md:text-sm font-black uppercase tracking-widest ${activeTab === item.label
                                    ? 'bg-green-50 text-green-700 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                <item.icon size={16} className="md:w-[18px] md:h-[18px]" />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6 md:space-y-8">
                    {activeTab === 'General' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                            <h3 className="text-lg font-black text-gray-900 mb-4">General Settings</h3>
                            <p className="text-sm text-gray-500">General account settings will appear here.</p>
                        </div>
                    )}

                    {activeTab === 'Notifications' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-gray-900">Notification Preferences</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">Manage how you receive updates</p>
                                </div>
                            </div>
                            <div className="p-5 md:p-8 space-y-8">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm md:text-base font-black text-gray-900">Email Notifications</p>
                                        <p className="text-[11px] md:text-sm text-gray-500 mt-1 font-medium leading-relaxed">Receive updates about your account activity via email</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-8 border-t border-gray-50">
                                    <div>
                                        <p className="text-sm md:text-base font-black text-gray-900">Push Notifications</p>
                                        <p className="text-[11px] md:text-sm text-gray-500 mt-1 font-medium leading-relaxed">Get real-time alerts on your browser or mobile device</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Security' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                                <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-green-100">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-gray-900">Security & Privacy</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">Keep your account secure</p>
                                </div>
                            </div>
                            <div className="p-4 md:p-6 space-y-2">
                                <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all duration-200 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-green-50 transition-colors">
                                            <Key size={22} className="text-gray-600 group-hover:text-green-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm md:text-base font-black text-gray-900">Change Password</p>
                                            <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 font-medium">Last updated 3 months ago</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 group-hover:text-gray-900 transition-all" />
                                </button>

                                <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all duration-200 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-green-50 transition-colors">
                                            <Smartphone size={22} className="text-gray-600 group-hover:text-green-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm md:text-base font-black text-gray-900">Two-Factor Authentication</p>
                                            <p className="text-[11px] md:text-xs text-amber-600 font-black uppercase tracking-widest mt-1">Not enabled</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 group-hover:text-gray-900 transition-all" />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Integrations' && user?.role === 'admin' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
                            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                                <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-100">
                                    <Globe size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-gray-900">Integrations</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">Manage external API connections</p>
                                </div>
                            </div>

                            <div className="p-5 md:p-8 space-y-8">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <Loader2 size={40} className="text-purple-600 animate-spin" />
                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Loading settings...</p>
                                    </div>
                                ) : (
                                    <>
                                        {successMessage && (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800 text-sm font-bold animate-fade-in">
                                                <CheckCircle2 size={18} />
                                                {successMessage}
                                            </div>
                                        )}
                                        {errorMessage && (
                                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm font-bold animate-fade-in">
                                                <AlertCircle size={18} />
                                                {errorMessage}
                                            </div>
                                        )}

                                        <div className="space-y-6">
                                            {/* Parent Settlement Account */}
                                            <div className="p-6 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-100 shadow-sm">
                                                <div className="flex items-start justify-between mb-6">
                                                    <div>
                                                        <h4 className="text-base font-black text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                                                            Parent Settlement Account
                                                        </h4>
                                                        <p className="text-xs text-gray-600 font-medium">Configure your primary settlement account for PalmPay transactions</p>
                                                    </div>
                                                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                                                        <CreditCard size={24} className="text-white" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] uppercase tracking-widest text-gray-700 font-black mb-2 flex items-center gap-1">
                                                            <User size={12} />
                                                            Account Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={parentAccountName}
                                                            onChange={(e) => setParentAccountName(e.target.value)}
                                                            placeholder="VTPay Parent Account"
                                                            className="w-full px-4 py-3.5 bg-white border-2 border-green-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all text-sm font-bold text-gray-900 placeholder:text-gray-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-widest text-gray-700 font-black mb-2">Account Number</label>
                                                        <input
                                                            type="text"
                                                            value={parentAccountNumber}
                                                            onChange={(e) => setParentAccountNumber(e.target.value)}
                                                            placeholder="0123456789"
                                                            className="w-full px-4 py-3.5 bg-white border-2 border-green-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all font-mono text-sm font-bold text-gray-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-widest text-gray-700 font-black mb-2">Bank Code</label>
                                                        <input
                                                            type="text"
                                                            value={parentBankCode}
                                                            onChange={(e) => setParentBankCode(e.target.value)}
                                                            placeholder="058"
                                                            className="w-full px-4 py-3.5 bg-white border-2 border-green-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all font-mono text-sm font-bold text-gray-900"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleSaveIntegrations}
                                                disabled={isSaving || !parentAccountName || !parentAccountNumber || !parentBankCode}
                                                className="w-full py-4 md:py-5 bg-green-600 hover:bg-green-700 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base transition-all shadow-xl shadow-green-200 hover:shadow-green-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0"
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Loader2 size={20} className="animate-spin" />
                                                        Saving Account...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={20} />
                                                        Save Parent Account Settings
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Danger Zone */}
                    <div className="bg-red-50 rounded-2xl md:rounded-3xl border-2 border-red-100 p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-red-100 rounded-full blur-2xl opacity-50"></div>
                        <div className="relative z-10">
                            <h4 className="text-lg md:text-xl font-black text-red-900 mb-2">Danger Zone</h4>
                            <p className="text-sm md:text-base text-red-700 mb-6 font-medium leading-relaxed">Once you delete your account, there is no going back. Please be certain.</p>
                            <button className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl md:rounded-2xl font-black text-sm transition-all shadow-xl shadow-red-200 uppercase tracking-widest transform hover:-translate-y-1 active:translate-y-0">
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
