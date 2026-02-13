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

import { VerificationAlert } from '../../components/dashboard/VerificationAlert';

export const Settings: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('General');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const isVerified = (user?.kycLevel ?? 0) >= 3;

    // Integrations State


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
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-gray-500 mt-2 text-sm max-w-xl">
                        Manage your account preferences, security settings, and integrations.
                    </p>
                </div>
            </div>

            {!isVerified && <VerificationAlert />}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2 flex lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar gap-1 sticky top-6">
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
                                className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold ${activeTab === item.label
                                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-9 space-y-6 md:space-y-8">
                    {activeTab === 'General' && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">General Settings</h3>
                            <p className="text-sm text-gray-500">General account settings will appear here.</p>
                        </div>
                    )}

                    {activeTab === 'Notifications' && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Notification Preferences</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Manage how you receive updates</p>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 space-y-8">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm md:text-base font-bold text-gray-900">Email Notifications</p>
                                        <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium leading-relaxed">Receive updates about your account activity via email</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-8 border-t border-gray-100">
                                    <div>
                                        <p className="text-sm md:text-base font-bold text-gray-900">Push Notifications</p>
                                        <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium leading-relaxed">Get real-time alerts on your browser or mobile device</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Security' && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Security & Privacy</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Keep your account secure</p>
                                </div>
                            </div>
                            <div className="p-4 md:p-6 space-y-2">
                                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 group border border-transparent hover:border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                                            <Key size={20} className="text-gray-500 group-hover:text-primary-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-900">Change Password</p>
                                            <p className="text-xs text-gray-500 mt-0.5 font-medium">Last updated 3 months ago</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 group-hover:text-gray-900 transition-all" />
                                </button>

                                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 group border border-transparent hover:border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                                            <Smartphone size={20} className="text-gray-500 group-hover:text-primary-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-900">Two-Factor Authentication</p>
                                            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mt-1">Not enabled</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 group-hover:text-gray-900 transition-all" />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Integrations' && user?.role === 'admin' && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                                    <Globe size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Integrations</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Manage external API connections</p>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 space-y-8">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <Loader2 size={32} className="text-primary-600 animate-spin" />
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
                                            <div className="p-6 md:p-8 bg-gray-50 rounded-2xl border border-gray-200">
                                                <div className="flex items-start justify-between mb-6">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                            Parent Settlement Account
                                                        </h4>
                                                        <p className="text-xs text-gray-500 font-medium">Configure your primary settlement account for PalmPay transactions</p>
                                                    </div>
                                                    <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400">
                                                        <CreditCard size={20} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                            <User size={12} />
                                                            Account Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={parentAccountName}
                                                            onChange={(e) => setParentAccountName(e.target.value)}
                                                            placeholder="VTStack Parent Account"
                                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Account Number</label>
                                                        <input
                                                            type="text"
                                                            value={parentAccountNumber}
                                                            onChange={(e) => setParentAccountNumber(e.target.value)}
                                                            placeholder="0123456789"
                                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all font-mono text-sm font-medium text-gray-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Bank Code</label>
                                                        <input
                                                            type="text"
                                                            value={parentBankCode}
                                                            onChange={(e) => setParentBankCode(e.target.value)}
                                                            placeholder="058"
                                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all font-mono text-sm font-medium text-gray-900"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleSaveIntegrations}
                                                disabled={isSaving || !parentAccountName || !parentAccountNumber || !parentBankCode}
                                                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Loader2 size={18} className="animate-spin" />
                                                        Saving Account...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={18} />
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
                </div>
            </div>
        </div>
    );
};
