import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';

const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'integrations' | 'payouts' | 'email'>('general');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showEmailPass, setShowEmailPass] = useState(false);
    const [banks, setBanks] = useState<any[]>([]);
    const [isVerifying, setIsVerifying] = useState(false);

    // Settings state
    const [settings, setSettings] = useState({
        general: {
            companyName: 'VTPay Systems',
            supportEmail: 'support@vtpay.com',
            timezone: 'Africa/Lagos',
            currency: 'NGN',
            maintenanceMode: false,
        },
        notifications: {
            emailAlerts: true,
            slackIntegration: true,
            webhookRetries: 3,
            dailyReports: true,
        },
        security: {
            twoFactorAuth: true,
            sessionTimeout: 30,
            passwordExpiry: 90,
            ipWhitelist: '',
        },
        integrations: {
            palmpay: {
                apiKey: '',
                publicKey: '',
                privateKey: '',
                webhookSecret: '',
                baseUrl: 'https://sandbox.palmpay.com/v2',
                isLive: false,
            }
        },
        parentAccount: {
            accountName: '',
            accountNumber: '',
            bankCode: '',
            type: 'PRIMARY' as 'PRIMARY' | 'SECONDARY',
            status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
        },
        globalSettlement: {
            status: false,
            scheduleType: 'T1' as 'T1' | 'T7' | 'T30',
            schedulePeriod: 'Daily',
            settlementAccounts: [] as Array<{ accountNumber: string; bankCode: string; percentage: string; accountName?: string }>
        },
        payout: {
            minAmount: 10000,
            vtpayFeePercent: 0.6,
            bankSettlementFee: 2500,
            bankSettlementThreshold: 0,
        },
        deposit: {
            vtpayFeePercent: 2.0,
        },
        emailConfig: {
            provider: 'gmail' as 'gmail' | 'other',
            gmail: {
                user: '',
                pass: '',
            },
            smtp: {
                host: '',
                port: 587,
                secure: false,
                user: '',
                pass: '',
            },
        }
    });

    useEffect(() => {
        fetchSettings();
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            const data = await adminApi.getBanks();
            setBanks(data);
        } catch (error) {
            console.error('Failed to fetch banks:', error);
        }
    };

    const handleVerifyAccount = async () => {
        const { bankCode, accountNumber } = settings.parentAccount;
        if (!bankCode || !accountNumber) {
            toast.error('Please select a bank and enter account number');
            return;
        }

        try {
            setIsVerifying(true);
            const data = await adminApi.verifyAccount(bankCode, accountNumber);
            if (data && data.accountName) {
                setSettings({
                    ...settings,
                    parentAccount: {
                        ...settings.parentAccount,
                        accountName: data.accountName
                    }
                });
                toast.success('Account verified successfully');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to verify account');
        } finally {
            setIsVerifying(false);
        }
    };

    const fetchSettings = async () => {
        try {
            setFetching(true);
            const data = await adminApi.getSystemSettings();
            if (data) {
                // Merge with default structure to prevent crashes if new fields are missing
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    // Ensure integrations object exists
                    integrations: {
                        ...prev.integrations,
                        ...(data.integrations || {})
                    }
                }));
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Prepare settings for save - sync Parent Account to Global Settlement if enabled
            const finalSettings = { ...settings };

            if (finalSettings.parentAccount && finalSettings.parentAccount.accountNumber && finalSettings.parentAccount.bankCode) {
                finalSettings.globalSettlement.settlementAccounts = [{
                    accountNumber: finalSettings.parentAccount.accountNumber,
                    bankCode: finalSettings.parentAccount.bankCode,
                    percentage: "100"
                }];
            }

            await adminApi.updateSystemSettings(finalSettings);
            toast.success('Settings saved successfully!');
            await fetchBanks();
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const renderGeneralSettings = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <input
                        type="text"
                        value={settings.general.companyName}
                        onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, companyName: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
                    <input
                        type="email"
                        value={settings.general.supportEmail}
                        onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, supportEmail: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                    <select
                        value={settings.general.timezone}
                        onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, timezone: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="Africa/Lagos">West Africa Time (Lagos)</option>
                        <option value="UTC">UTC</option>
                        <option value="Europe/London">London</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Currency</label>
                    <select
                        value={settings.general.currency}
                        onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, currency: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="NGN">Nigerian Naira (NGN)</option>
                        <option value="USD">US Dollar (USD)</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <input
                    type="checkbox"
                    checked={settings.general.maintenanceMode}
                    onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, maintenanceMode: e.target.checked }
                    })}
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                />
                <div>
                    <p className="text-sm font-medium text-yellow-800">Maintenance Mode</p>
                    <p className="text-xs text-yellow-600">Enable to suspend all non-admin access to the platform</p>
                </div>
            </div>
        </div>
    );

    const renderNotificationSettings = () => (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 gap-4">
                    <div>
                        <p className="text-sm font-medium text-slate-900">Email Alerts</p>
                        <p className="text-xs text-slate-500">Receive critical system alerts via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={settings.notifications.emailAlerts}
                            onChange={(e) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, emailAlerts: e.target.checked }
                            })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 gap-4">
                    <div>
                        <p className="text-sm font-medium text-slate-900">Slack Integration</p>
                        <p className="text-xs text-slate-500">Send notifications to Slack channel</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={settings.notifications.slackIntegration}
                            onChange={(e) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, slackIntegration: e.target.checked }
                            })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 gap-4">
                    <div>
                        <p className="text-sm font-medium text-slate-900">Daily Reports</p>
                        <p className="text-xs text-slate-500">Generate and send daily transaction summaries</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={settings.notifications.dailyReports}
                            onChange={(e) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, dailyReports: e.target.checked }
                            })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Webhook Max Retries</label>
                <input
                    type="number"
                    value={settings.notifications.webhookRetries}
                    onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, webhookRetries: parseInt(e.target.value) }
                    })}
                    className="w-full md:w-1/3 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>
        </div>
    );

    const renderSecuritySettings = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-900">Enforce 2FA</p>
                    <p className="text-xs text-slate-500">Require Two-Factor Authentication for all admin users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                        type="checkbox"
                        checked={settings.security.twoFactorAuth}
                        onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, twoFactorAuth: e.target.checked }
                        })}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Session Timeout (minutes)</label>
                    <input
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password Expiry (days)</label>
                    <input
                        type="number"
                        value={settings.security.passwordExpiry}
                        onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, passwordExpiry: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin IP Whitelist</label>
                <textarea
                    value={settings.security.ipWhitelist}
                    onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, ipWhitelist: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-24"
                    placeholder="Enter IP addresses separated by commas"
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty to allow access from any IP</p>
            </div>
        </div>
    );
    const renderIntegrationsSettings = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex-shrink-0 flex items-center justify-center text-purple-600 font-bold">
                            PP
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-medium text-slate-900">PalmPay Integration</h3>
                            <p className="text-xs md:text-sm text-slate-500">Configure your PalmPay payment gateway credentials</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
                        <span className="text-sm font-medium text-slate-600">State:</span>
                        <select
                            value={settings.integrations.palmpay?.isLive ? 'live' : 'sandbox'}
                            onChange={(e) => setSettings({
                                ...settings,
                                integrations: {
                                    ...settings.integrations,
                                    palmpay: { ...settings.integrations.palmpay, isLive: e.target.value === 'live' }
                                }
                            })}
                            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-900 p-0 pr-6"
                        >
                            <option value="sandbox">Sandbox Mode</option>
                            <option value="live">Live Mode</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
                        <input
                            type="text"
                            value={settings.integrations.palmpay?.baseUrl || ''}
                            onChange={(e) => setSettings({
                                ...settings,
                                integrations: {
                                    ...settings.integrations,
                                    palmpay: { ...settings.integrations.palmpay, baseUrl: e.target.value }
                                }
                            })}
                            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="https://sandbox.palmpay.com/v2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                        <div className="relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={settings.integrations.palmpay?.apiKey || ''}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    integrations: {
                                        ...settings.integrations,
                                        palmpay: { ...settings.integrations.palmpay, apiKey: e.target.value }
                                    }
                                })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showApiKey ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPayoutSettings = () => (
        <div className="space-y-6">
            {/* Parent Account Configuration */}
            <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex-shrink-0 flex items-center justify-center text-purple-600 font-bold">
                        PA
                    </div>
                    <div>
                        <h3 className="text-base md:text-lg font-medium text-slate-900">Parent Account</h3>
                        <p className="text-xs md:text-sm text-slate-500">Configure the source account for payouts</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Bank</label>
                        <select
                            value={settings.parentAccount?.bankCode || ''}
                            onChange={(e) => setSettings({
                                ...settings,
                                parentAccount: { ...settings.parentAccount, bankCode: e.target.value }
                            })}
                            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="">Select a bank</option>
                            {banks.map((bank: any) => (
                                <option key={bank.code} value={bank.code}>
                                    {bank.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={settings.parentAccount?.accountNumber || ''}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    parentAccount: { ...settings.parentAccount, accountNumber: e.target.value }
                                })}
                                className="flex-1 px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="10-digit account number"
                                maxLength={10}
                            />
                            <button
                                onClick={handleVerifyAccount}
                                disabled={isVerifying || !settings.parentAccount.bankCode || settings.parentAccount.accountNumber.length !== 10}
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                {isVerifying ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verifying...
                                    </>
                                ) : 'Verify'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Name (Verified)</label>
                        <input
                            type="text"
                            value={settings.parentAccount?.accountName || ''}
                            readOnly
                            className="w-full px-4 py-2 border border-slate-300 bg-slate-50 text-slate-600 rounded-lg focus:outline-none cursor-not-allowed"
                            placeholder="Verified account name will appear here"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select
                            value={settings.parentAccount?.status || 'ACTIVE'}
                            onChange={(e) => setSettings({
                                ...settings,
                                parentAccount: { ...settings.parentAccount, status: e.target.value as 'ACTIVE' | 'INACTIVE' }
                            })}
                            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Global Settlement Configuration */}
            <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex-shrink-0 flex items-center justify-center text-amber-600 font-bold">
                        GS
                    </div>
                    <div>
                        <h3 className="text-base md:text-lg font-medium text-slate-900">Global Settlement Configuration</h3>
                        <p className="text-xs md:text-sm text-slate-500">Configure automatic settlement for <strong>newly created</strong> Virtual Accounts.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Type</label>
                        <select
                            value={settings.globalSettlement?.scheduleType || 'T1'}
                            onChange={(e) => setSettings({
                                ...settings,
                                globalSettlement: { ...settings.globalSettlement, scheduleType: e.target.value as 'T1' | 'T7' | 'T30' }
                            })}
                            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="T1">T+1 (Next Day)</option>
                            <option value="T7">T+7 (Weekly)</option>
                            <option value="T30">T+30 (Monthly)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Settlement Status</label>
                        <div className="flex items-center gap-3 p-2">
                            <input
                                type="checkbox"
                                checked={settings.globalSettlement?.status || false}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    globalSettlement: { ...settings.globalSettlement, status: e.target.checked }
                                })}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="text-sm text-slate-600">Enable Automatic Settlement</span>
                        </div>
                    </div>

                    {/* Explicit Settlement Account Inputs */}
                    <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <h4 className="text-sm font-medium text-slate-900 mb-4">Settlement Destination Account</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Bank</label>
                                <select
                                    value={settings.globalSettlement?.settlementAccounts?.[0]?.bankCode || ''}
                                    onChange={(e) => {
                                        const newAccounts = [...(settings.globalSettlement.settlementAccounts || [])];
                                        if (newAccounts.length === 0) newAccounts.push({ accountNumber: '', bankCode: '', percentage: '100' });
                                        newAccounts[0].bankCode = e.target.value;
                                        setSettings({
                                            ...settings,
                                            globalSettlement: { ...settings.globalSettlement, settlementAccounts: newAccounts }
                                        });
                                    }}
                                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Select a bank</option>
                                    {banks.map((bank: any) => (
                                        <option key={bank.code} value={bank.code}>
                                            {bank.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={settings.globalSettlement?.settlementAccounts?.[0]?.accountNumber || ''}
                                        onChange={(e) => {
                                            const newAccounts = [...(settings.globalSettlement.settlementAccounts || [])];
                                            if (newAccounts.length === 0) newAccounts.push({ accountNumber: '', bankCode: '', percentage: '100' });
                                            newAccounts[0].accountNumber = e.target.value;
                                            setSettings({
                                                ...settings,
                                                globalSettlement: { ...settings.globalSettlement, settlementAccounts: newAccounts }
                                            });
                                        }}
                                        className="flex-1 px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="10-digit account number"
                                        maxLength={10}
                                    />
                                    <button
                                        onClick={async () => {
                                            const acc = settings.globalSettlement.settlementAccounts?.[0];
                                            if (!acc?.bankCode || !acc?.accountNumber) {
                                                toast.error('Please enter details');
                                                return;
                                            }
                                            try {
                                                const data = await adminApi.verifyAccount(acc.bankCode, acc.accountNumber);
                                                if (data?.accountName) {
                                                    const newAccounts = [...(settings.globalSettlement.settlementAccounts || [])];
                                                    newAccounts[0].accountName = data.accountName;
                                                    setSettings({
                                                        ...settings,
                                                        globalSettlement: { ...settings.globalSettlement, settlementAccounts: newAccounts }
                                                    });
                                                    toast.success(`Verified: ${data.accountName}`);
                                                }
                                            } catch (e: any) {
                                                toast.error('Verification failed');
                                            }
                                        }}
                                        type="button"
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium"
                                    >
                                        Verify
                                    </button>
                                </div>
                                {settings.globalSettlement?.settlementAccounts?.[0]?.accountName && (
                                    <div className="mt-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                        {settings.globalSettlement.settlementAccounts[0].accountName}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Deposit Fee Configuration */}
            <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex-shrink-0 flex items-center justify-center text-green-600 font-bold">
                        DF
                    </div>
                    <div>
                        <h3 className="text-base md:text-lg font-medium text-slate-900">Deposit Fee Configuration</h3>
                        <p className="text-xs md:text-sm text-slate-500">Configure fees for incoming transfers (Deposits)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">VTPay Deposit Fee (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={settings.deposit?.vtpayFeePercent || 0}
                            onChange={(e) => setSettings({
                                ...settings,
                                deposit: { ...settings.deposit, vtpayFeePercent: parseFloat(e.target.value) }
                            })}
                            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            This is the total fee percentage deducted from the user's deposit.
                        </p>
                    </div>
                </div>
            </div>

            {/* Payout Fee Configuration */}
            <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex-shrink-0 flex items-center justify-center text-blue-600 font-bold">
                        PF
                    </div>
                    <div>
                        <h3 className="text-base md:text-lg font-medium text-slate-900">Payout Fee Configuration</h3>
                        <p className="text-xs md:text-sm text-slate-500">Configure fees for outgoing transfers (Withdrawals)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">VTPay Fee (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={settings.payout.vtpayFeePercent}
                            onChange={(e) => setSettings({
                                ...settings,
                                payout: { ...settings.payout, vtpayFeePercent: parseFloat(e.target.value) }
                            })}
                            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bank Settlement Fee (₦)</label>
                        <input
                            type="number"
                            value={settings.payout.bankSettlementFee}
                            onChange={(e) => setSettings({
                                ...settings,
                                payout: { ...settings.payout, bankSettlementFee: parseInt(e.target.value) }
                            })}
                            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Amount (₦)</label>
                        <input
                            type="number"
                            value={settings.payout.minAmount}
                            onChange={(e) => setSettings({
                                ...settings,
                                payout: { ...settings.payout, minAmount: parseInt(e.target.value) }
                            })}
                            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderEmailSettings = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold">
                        EM
                    </div>
                    <div>
                        <h3 className="text-base md:text-lg font-medium text-slate-900">Email Configuration</h3>
                        <p className="text-xs md:text-sm text-slate-500">Configure email settings for system notifications</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                        <select
                            value={settings.emailConfig.provider}
                            onChange={(e) => setSettings({
                                ...settings,
                                emailConfig: { ...settings.emailConfig, provider: e.target.value as 'gmail' | 'other' }
                            })}
                            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="gmail">Gmail</option>
                            <option value="other">SMTP</option>
                        </select>
                    </div>
                    {settings.emailConfig.provider === 'gmail' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gmail User</label>
                                <input
                                    type="email"
                                    value={settings.emailConfig.gmail.user}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        emailConfig: { ...settings.emailConfig, gmail: { ...settings.emailConfig.gmail, user: e.target.value } }
                                    })}
                                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">App Password</label>
                                <div className="relative">
                                    <input
                                        type={showEmailPass ? 'text' : 'password'}
                                        value={settings.emailConfig.gmail.pass}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            emailConfig: { ...settings.emailConfig, gmail: { ...settings.emailConfig.gmail, pass: e.target.value } }
                                        })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailPass(!showEmailPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showEmailPass ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                                    <input
                                        type="text"
                                        value={settings.emailConfig.smtp.host}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            emailConfig: { ...settings.emailConfig, smtp: { ...settings.emailConfig.smtp, host: e.target.value } }
                                        })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
                                    <input
                                        type="number"
                                        value={settings.emailConfig.smtp.port}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            emailConfig: { ...settings.emailConfig, smtp: { ...settings.emailConfig.smtp, port: parseInt(e.target.value) } }
                                        })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={settings.emailConfig.smtp.user}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            emailConfig: { ...settings.emailConfig, smtp: { ...settings.emailConfig.smtp, user: e.target.value } }
                                        })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showEmailPass ? 'text' : 'password'}
                                            value={settings.emailConfig.smtp.pass}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                emailConfig: { ...settings.emailConfig, smtp: { ...settings.emailConfig.smtp, pass: e.target.value } }
                                            })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowEmailPass(!showEmailPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showEmailPass ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">System Settings</h1>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/50">
                    {[
                        { id: 'general', label: 'General' },
                        { id: 'notifications', label: 'Notifications' },
                        { id: 'security', label: 'Security' },
                        { id: 'integrations', label: 'Integrations' },
                        { id: 'payouts', label: 'Payouts & Fees' },
                        { id: 'email', label: 'Email' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {fetching ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500">Loading settings...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'general' && renderGeneralSettings()}
                            {activeTab === 'notifications' && renderNotificationSettings()}
                            {activeTab === 'security' && renderSecuritySettings()}
                            {activeTab === 'integrations' && renderIntegrationsSettings()}
                            {activeTab === 'payouts' && renderPayoutSettings()}
                            {activeTab === 'email' && renderEmailSettings()}

                            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : 'Save Changes'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
