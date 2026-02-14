import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';
import { AlertCircle, Check, Loader } from 'lucide-react';

interface GlobalSettlementConfigProps {
    onSuccess?: () => void;
}

const SCHEDULE_TYPES = [
    { value: 'T1', label: 'T1 - Daily (Next working day)', periods: ['Daily'] },
    { value: 'T7', label: 'T7 - Weekly', periods: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { value: 'T30', label: 'T30 - Monthly', periods: Array.from({ length: 30 }, (_, i) => `${i + 1}`).concat(['lastDayOfMonth']) }
];

export const GlobalSettlementConfig: React.FC<GlobalSettlementConfigProps> = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [bulkConfiguring, setBulkConfiguring] = useState(false);

    const [enabled, setEnabled] = useState(false);
    const [scheduleType, setScheduleType] = useState<'T1' | 'T7' | 'T30'>('T1');
    const [schedulePeriod, setSchedulePeriod] = useState('Daily');
    const [settlementAccounts, setSettlementAccounts] = useState<any[]>([
        { accountNumber: '', bankCode: '058', percentage: '100', accountName: '' }
    ]);
    const [banks, setBanks] = useState<any[]>([]);

    useEffect(() => {
        fetchConfig();
        fetchBanks();
    }, []);

    useEffect(() => {
        const selectedType = SCHEDULE_TYPES.find(t => t.value === scheduleType);
        if (selectedType) {
            setSchedulePeriod(selectedType.periods[0]);
        }
    }, [scheduleType]);

    const fetchConfig = async () => {
        try {
            setLoadingConfig(true);
            const config = await adminApi.getGlobalSettlementConfig();
            if (config) {
                setEnabled(config.status || false);
                setScheduleType(config.scheduleType || 'T1');
                setSchedulePeriod(config.schedulePeriod || 'Daily');
                setSettlementAccounts(config.settlementAccounts || [{ accountNumber: '', bankCode: '058', percentage: '100', accountName: '' }]);
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        } finally {
            setLoadingConfig(false);
        }
    };

    const fetchBanks = async () => {
        try {
            const response: any = await adminApi.getBanks();
            const banksData = Array.isArray(response) ? response : (response?.data || []);
            setBanks(banksData);
        } catch (error) {
            console.error('Failed to fetch banks:', error);
        }
    };

    const addAccount = () => {
        setSettlementAccounts([...settlementAccounts, { accountNumber: '', bankCode: '058', percentage: '0', accountName: '' }]);
    };

    const removeAccount = (index: number) => {
        if (settlementAccounts.length > 1) {
            setSettlementAccounts(settlementAccounts.filter((_, i) => i !== index));
        }
    };

    const updateAccount = (index: number, field: string, value: string) => {
        const updated = [...settlementAccounts];
        updated[index] = { ...updated[index], [field]: value };
        setSettlementAccounts(updated);
    };

    const getTotalPercentage = () => {
        return settlementAccounts.reduce((sum, acc) => sum + parseFloat(acc.percentage || '0'), 0);
    };

    const handleSave = async () => {
        const totalPercentage = getTotalPercentage();
        if (Math.abs(totalPercentage - 100) > 0.01) {
            toast.error(`Total percentage must equal 100%. Current: ${totalPercentage.toFixed(2)}%`);
            return;
        }

        setLoading(true);
        try {
            await adminApi.updateGlobalSettlementConfig({
                status: enabled,
                scheduleType,
                schedulePeriod,
                settlementAccounts
            });
            toast.success('Global settlement configuration saved successfully');
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkConfigure = async () => {
        // Validate configuration first
        if (!enabled) {
            toast.error('Please enable auto-settlement first');
            return;
        }

        if (settlementAccounts.length === 0) {
            toast.error('Please add at least one settlement account');
            return;
        }

        const totalPercentage = getTotalPercentage();
        if (Math.abs(totalPercentage - 100) > 0.01) {
            toast.error(`Settlement percentages must equal 100%. Current: ${totalPercentage.toFixed(2)}%`);
            return;
        }

        // Show confirmation dialog
        const confirmed = window.confirm(
            'This will configure settlement schedules for ALL virtual accounts using the current global settings.\n\n' +
            `Schedule Type: ${scheduleType}\n` +
            `Schedule Period: ${schedulePeriod}\n` +
            `Settlement Accounts: ${settlementAccounts.length}\n\n` +
            'Do you want to continue?'
        );

        if (!confirmed) {
            return;
        }

        setBulkConfiguring(true);
        try {
            console.log('Starting bulk configuration...');
            const result = await adminApi.bulkConfigureSettlements(false);
            console.log('Bulk configuration result:', result);

            toast.success(
                `${result.message}\n` +
                `Configured: ${result.data.configured}, Skipped: ${result.data.skipped}, Failed: ${result.data.failed}`,
                { duration: 5000 }
            );
        } catch (error: any) {
            console.error('Bulk configure error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to bulk configure settlements';
            toast.error(errorMessage, { duration: 5000 });
        } finally {
            setBulkConfiguring(false);
        }
    };

    if (loadingConfig) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const totalPercentage = getTotalPercentage();
    const isValidTotal = Math.abs(totalPercentage - 100) < 0.01;
    const selectedType = SCHEDULE_TYPES.find(t => t.value === scheduleType);

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-md">
                <div className="flex gap-2 text-primary-800">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium mb-1">Auto-Settlement Configuration</p>
                        <p>Configure settlement accounts here. When virtual accounts are created, they will automatically be configured with these settlement details.</p>
                    </div>
                </div>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                    <h4 className="font-medium text-gray-900">Enable Auto-Settlement</h4>
                    <p className="text-sm text-gray-500">Automatically configure settlement for all accounts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
            </div>

            {/* Schedule Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Type</label>
                <div className="space-y-2">
                    {SCHEDULE_TYPES.map((type) => (
                        <label key={type.value} className="flex items-center">
                            <input
                                type="radio"
                                name="scheduleType"
                                value={type.value}
                                checked={scheduleType === type.value}
                                onChange={(e) => setScheduleType(e.target.value as any)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                            />
                            <span className="ml-3 text-sm text-gray-700">{type.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Schedule Period */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Period</label>
                <select
                    value={schedulePeriod}
                    onChange={(e) => setSchedulePeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    {selectedType?.periods.map((period) => (
                        <option key={period} value={period}>{period}</option>
                    ))}
                </select>
            </div>

            {/* Settlement Accounts */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Settlement Accounts</label>
                <div className="space-y-4">
                    {settlementAccounts.map((account, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-gray-700">Account {index + 1}</span>
                                {settlementAccounts.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeAccount(index)}
                                        className="text-sm text-red-600 hover:text-red-700"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Account Name</label>
                                    <input
                                        type="text"
                                        value={account.accountName || ''}
                                        onChange={(e) => updateAccount(index, 'accountName', e.target.value)}
                                        placeholder="Account Name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Account Number</label>
                                    <input
                                        type="text"
                                        value={account.accountNumber}
                                        onChange={(e) => updateAccount(index, 'accountNumber', e.target.value)}
                                        placeholder="1234567890"
                                        maxLength={10}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Bank</label>
                                    <select
                                        value={account.bankCode}
                                        onChange={(e) => updateAccount(index, 'bankCode', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        {banks.map((bank) => (
                                            <option key={bank.code} value={bank.code}>
                                                {bank.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Percentage (%)</label>
                                    <input
                                        type="number"
                                        value={account.percentage}
                                        onChange={(e) => updateAccount(index, 'percentage', e.target.value)}
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addAccount}
                    className="mt-3 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-300 rounded-md hover:bg-primary-50"
                >
                    + Add Account
                </button>
            </div>

            {/* Total Percentage */}
            <div className={`p-4 rounded-md ${isValidTotal ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm font-medium ${isValidTotal ? 'text-green-800' : 'text-red-800'}`}>
                    Total Allocation: {totalPercentage.toFixed(2)}% {isValidTotal ? '✓' : '✗ Must equal 100%'}
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    disabled={loading || !isValidTotal}
                    className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4" />
                            Save Configuration
                        </>
                    )}
                </button>

                <button
                    onClick={handleBulkConfigure}
                    disabled={bulkConfiguring || !enabled || !isValidTotal}
                    title={
                        !enabled ? 'Please enable auto-settlement first' :
                            !isValidTotal ? 'Settlement percentages must equal 100%' :
                                'Configure settlement schedules for all virtual accounts'
                    }
                    className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {bulkConfiguring ? (
                        <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Configuring...
                        </>
                    ) : (
                        'Configure All Virtual Accounts'
                    )}
                </button>
            </div>
        </div>
    );
};
