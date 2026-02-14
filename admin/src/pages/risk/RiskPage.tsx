import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';

interface RiskRule {
    _id: string;
    name: string;
    type: 'overload' | 'network_issue' | 'rate_limit' | 'api_error' | 'database_slow' | 'system_health';
    condition: string;
    action: 'warn' | 'alert' | 'escalate';
    priority: number;
    status: 'active' | 'inactive';
    hits: number;
    lastTriggered?: string;
}

const RiskPage: React.FC = () => {
    const [rules, setRules] = useState<RiskRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRule, setSelectedRule] = useState<RiskRule | null>(null);
    const [formData, setFormData] = useState<Partial<RiskRule>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getRiskRules();
            setRules(data);
        } catch (error) {
            console.error('Failed to fetch risk rules:', error);
            toast.error('Failed to fetch risk rules');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (selectedRule) {
                await adminApi.updateRiskRule(selectedRule._id, formData);
                toast.success('Risk rule updated successfully');
            } else {
                await adminApi.createRiskRule(formData);
                toast.success('Risk rule created successfully');
            }
            setShowCreateModal(false);
            setSelectedRule(null);
            setFormData({});
            fetchRules();
        } catch (error) {
            console.error('Failed to save risk rule:', error);
            toast.error('Failed to save risk rule');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this risk rule?')) return;
        try {
            await adminApi.deleteRiskRule(id);
            toast.success('Risk rule deleted successfully');
            fetchRules();
        } catch (error) {
            console.error('Failed to delete risk rule:', error);
            toast.error('Failed to delete risk rule');
        }
    };

    const getActionBadge = (action: string) => {
        const badges = {
            warn: 'bg-yellow-100 text-yellow-800',
            alert: 'bg-orange-100 text-orange-800',
            escalate: 'bg-red-100 text-red-800',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[action as keyof typeof badges]}`}>
                {action.toUpperCase()}
            </span>
        );
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">System Health & Warnings</h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Monitor system warnings for overloading, network issues & errors</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-sm active:scale-95"
                >
                    + Add Warning Rule
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Active Rules</p>
                    <h3 className="text-lg md:text-2xl font-bold text-slate-900 mt-1 md:mt-2">
                        {rules.filter(r => r.status === 'active').length}
                    </h3>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Warnings</p>
                    <h3 className="text-lg md:text-2xl font-bold text-yellow-600 mt-1 md:mt-2">
                        {rules.filter(r => r.action === 'warn').reduce((sum, r) => sum + (r.hits || 0), 0)}
                    </h3>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Alerts</p>
                    <h3 className="text-lg md:text-2xl font-bold text-orange-600 mt-1 md:mt-2">
                        {rules.filter(r => r.action === 'alert').reduce((sum, r) => sum + (r.hits || 0), 0)}
                    </h3>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Escalated</p>
                    <h3 className="text-lg md:text-2xl font-bold text-red-600 mt-1 md:mt-2">
                        {rules.filter(r => r.action === 'escalate').reduce((sum, r) => sum + (r.hits || 0), 0)}
                    </h3>
                </div>
            </div>

            {/* Rules Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">System Warning Rules</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
                        <p className="mt-2 text-slate-500">Loading rules...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] md:min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rule Name</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                                    <th className="hidden md:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                                    <th className="hidden lg:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hits</th>
                                    <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {rules.map((rule) => (
                                    <tr key={rule._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">{rule.name}</div>
                                            <div className="text-xs text-slate-500">{rule.condition}</div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                                            {rule.type.replace('_', ' ')}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            {getActionBadge(rule.action)}
                                        </td>
                                        <td className="hidden md:table-cell px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                            {rule.priority}
                                        </td>
                                        <td className="hidden lg:table-cell px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                            {rule.hits}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 md:px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${rule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {rule.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRule(rule);
                                                        setFormData(rule);
                                                        setShowCreateModal(true);
                                                    }}
                                                    className="text-primary-600 hover:text-primary-900"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rule._id)}
                                                    className="text-red-600 hover:text-red-900 hidden sm:inline"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex justify-between items-start">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {selectedRule ? 'Edit Warning Rule' : 'Create Warning Rule'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setSelectedRule(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="e.g., High Velocity Check"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Warning Type</label>
                                    <select
                                        value={formData.type || 'overload'}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="overload">System Overload</option>
                                        <option value="network_issue">Network Issue</option>
                                        <option value="rate_limit">Rate Limit Exceeded</option>
                                        <option value="api_error">API Error</option>
                                        <option value="database_slow">Database Slow</option>
                                        <option value="system_health">System Health</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
                                    <select
                                        value={formData.action || 'warn'}
                                        onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="warn">Warn</option>
                                        <option value="alert">Alert</option>
                                        <option value="escalate">Escalate</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.condition || ''}
                                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="e.g., CPU > 80% for 5 minutes"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                    <input
                                        type="number"
                                        value={formData.priority || 1}
                                        onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                    <select
                                        value={formData.status || 'active'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setSelectedRule(null);
                                        setFormData({});
                                    }}
                                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : (selectedRule ? 'Update Rule' : 'Create Rule')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RiskPage;
