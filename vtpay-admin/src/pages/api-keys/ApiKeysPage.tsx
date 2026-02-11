import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import toast from 'react-hot-toast';

interface ApiKey {
    _id: string;
    tenantId: string;
    tenantName: string;
    keyName: string;
    fullKey: string;
    scopes: string[];
    status: 'active' | 'revoked' | 'expired';
    usageCount: number;
    lastUsed?: string;
    rateLimit: number;
    currentUsage: number;
    ipWhitelist?: string[];
    createdAt: string;
    expiresAt?: string;
}

const ApiKeysPage: React.FC = () => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [newKeyData, setNewKeyData] = useState({
        userId: '',
        name: '',
        environment: 'test',
        scopes: [] as string[],
    });

    useEffect(() => {
        fetchApiKeys();
        fetchTenants();
    }, []);

    const fetchApiKeys = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getApiKeys();
            setApiKeys(data);
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
            toast.error('Failed to fetch API keys');
        } finally {
            setLoading(false);
        }
    };

    const fetchTenants = async () => {
        try {
            const data = await adminApi.getAllTenants();
            setTenants(data);
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        }
    };

    const availableScopes = [
        'read:transactions',
        'write:transfers',
        'read:balance',
        'read:customers',
        'write:customers',
        'read:webhooks',
    ];

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyData.userId) {
            toast.error('Please select a tenant');
            return;
        }
        try {
            setIsGenerating(true);
            await adminApi.generateApiKey(newKeyData);
            toast.success('API Key generated successfully');
            setShowCreateModal(false);
            setNewKeyData({
                userId: '',
                name: '',
                environment: 'test',
                scopes: [],
            });
            fetchApiKeys();
        } catch (error) {
            console.error('Failed to generate API key:', error);
            toast.error('Failed to generate API key');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRevokeKey = async (keyId: string) => {
        if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
            try {
                await adminApi.revokeApiKey(keyId);
                toast.success('API Key revoked successfully');
                fetchApiKeys();
                if (selectedKey && selectedKey._id === keyId) {
                    setShowDetails(false);
                }
            } catch (error) {
                console.error('Failed to revoke API key:', error);
                toast.error('Failed to revoke API key');
            }
        }
    };

    const toggleScope = (scope: string) => {
        setNewKeyData(prev => ({
            ...prev,
            scopes: prev.scopes.includes(scope)
                ? prev.scopes.filter(s => s !== scope)
                : [...prev.scopes, scope]
        }));
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            active: 'bg-green-100 text-green-800',
            revoked: 'bg-red-100 text-red-800',
            expired: 'bg-gray-100 text-gray-800',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    const getUsagePercentage = (current: number, limit: number) => {
        const percentage = (current / limit) * 100;
        let color = 'bg-green-500';
        if (percentage > 80) color = 'bg-red-500';
        else if (percentage > 60) color = 'bg-yellow-500';
        return { percentage, color };
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">API & Key Management</h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Developer access control and monitoring</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm active:scale-95">
                        Webhook Secrets
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm active:scale-95"
                    >
                        + Generate New Key
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Total API Keys</p>
                    <h3 className="text-lg md:text-2xl font-bold text-slate-900 mt-1">{apiKeys.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Active Keys</p>
                    <h3 className="text-lg md:text-2xl font-bold text-green-600 mt-1">
                        {apiKeys.filter((k) => k.status === 'active').length}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Total Requests (24h)</p>
                    <h3 className="text-lg md:text-2xl font-bold text-slate-900 mt-1">
                        {apiKeys.reduce((sum, k) => sum + k.currentUsage, 0).toLocaleString()}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <p className="text-xs md:text-sm font-medium text-slate-500">Abuse Detected</p>
                    <h3 className="text-lg md:text-2xl font-bold text-red-600 mt-1">
                        {apiKeys.filter(k => k.status === 'revoked').length}
                    </h3>
                </div>
            </div>

            {/* API Keys Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
                        <p className="mt-2 text-slate-500">Loading API keys...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] md:min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Key Name
                                    </th>
                                    <th className="hidden lg:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Tenant
                                    </th>
                                    <th className="hidden md:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        API Key
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Usage (24h)
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Last Used
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {apiKeys.map((key) => {
                                    const usage = getUsagePercentage(key.currentUsage, key.rateLimit);
                                    return (
                                        <tr key={key._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900">{key.keyName}</div>
                                                <div className="text-xs text-slate-500">{key.scopes.length} scopes</div>
                                            </td>
                                            <td className="hidden lg:table-cell px-4 md:px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-900">{key.tenantName}</div>
                                            </td>
                                            <td className="hidden md:table-cell px-4 md:px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-mono text-slate-900">{key.fullKey}</div>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-900 mb-1">
                                                    {key.currentUsage.toLocaleString()} / {key.rateLimit.toLocaleString()}
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className={`${usage.color} h-2 rounded-full transition-all`}
                                                        style={{ width: `${usage.percentage}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">{getStatusBadge(key.status)}</td>
                                            <td className="hidden sm:table-cell px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never'}
                                            </td>
                                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedKey(key);
                                                            setShowDetails(true);
                                                        }}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        View
                                                    </button>
                                                    {key.status === 'active' && (
                                                        <button
                                                            onClick={() => handleRevokeKey(key._id)}
                                                            className="text-red-600 hover:text-red-900 hidden sm:inline"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Key Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex justify-between items-start">
                                <h2 className="text-xl font-bold text-slate-900">Generate New API Key</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleCreateKey} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Tenant</label>
                                <select
                                    required
                                    value={newKeyData.userId}
                                    onChange={(e) => setNewKeyData({ ...newKeyData, userId: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Select a tenant...</option>
                                    {tenants.map(tenant => (
                                        <option key={tenant._id} value={tenant._id}>
                                            {tenant.businessName || `${tenant.firstName} ${tenant.lastName}`} ({tenant.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Key Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newKeyData.name}
                                    onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="e.g., Mobile App Backend"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Environment</label>
                                <select
                                    value={newKeyData.environment}
                                    onChange={(e) => setNewKeyData({ ...newKeyData, environment: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="test">Test Mode</option>
                                    <option value="live">Live Mode</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Scopes</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableScopes.map(scope => (
                                        <label key={scope} className="flex items-center space-x-2 p-2 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newKeyData.scopes.includes(scope)}
                                                onChange={() => toggleScope(scope)}
                                                className="rounded text-green-600 focus:ring-green-500"
                                            />
                                            <span className="text-sm text-slate-700">{scope}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                    disabled={isGenerating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? 'Generating...' : 'Generate Key'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* API Key Details Modal */}
            {showDetails && selectedKey && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedKey.keyName}</h2>
                                    <p className="text-sm text-slate-500 mt-1">{selectedKey.tenantName}</p>
                                </div>
                                <button onClick={() => setShowDetails(false)} className="text-slate-400 hover:text-slate-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-slate-500">API Key</p>
                                    <p className="text-sm font-mono text-slate-900 mt-1 break-all">{selectedKey.fullKey}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Status</p>
                                    <div className="mt-1">{getStatusBadge(selectedKey.status)}</div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Total Usage</p>
                                    <p className="text-sm text-slate-900 mt-1">{selectedKey.usageCount.toLocaleString()} requests</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Rate Limit</p>
                                    <p className="text-sm text-slate-900 mt-1">{selectedKey.rateLimit} req/hour</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Current Usage</p>
                                    <p className="text-sm text-slate-900 mt-1">{selectedKey.currentUsage} requests</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-slate-500">Scopes</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {selectedKey.scopes.map((scope, i) => (
                                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                {scope}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {selectedKey.ipWhitelist && selectedKey.ipWhitelist.length > 0 && (
                                    <div className="sm:col-span-2">
                                        <p className="text-xs text-slate-500">IP Whitelist</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedKey.ipWhitelist.map((ip, i) => (
                                                <span key={i} className="px-2 py-1 bg-slate-100 text-slate-800 text-xs font-mono rounded">
                                                    {ip}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-slate-500">Created</p>
                                    <p className="text-sm text-slate-900 mt-1">{new Date(selectedKey.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Last Used</p>
                                    <p className="text-sm text-slate-900 mt-1">
                                        {selectedKey.lastUsed ? new Date(selectedKey.lastUsed).toLocaleString() : 'Never'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200">
                                <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    Manage Scopes
                                </button>
                                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
                                    Update Rate Limit
                                </button>
                                {selectedKey.status === 'active' && (
                                    <button
                                        onClick={() => {
                                            handleRevokeKey(selectedKey._id);
                                        }}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                    >
                                        Revoke Key
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiKeysPage;
