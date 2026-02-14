import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import Badge from '../../components/common/Badge';
import { FileText, Search, Filter, User, Monitor } from 'lucide-react';
import Pagination from '../../components/common/Pagination';

const AuditLogsPage: React.FC = () => {
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [actorEmailFilter, setActorEmailFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const { data, isLoading } = useQuery<{ logs: any[], pagination: any }>({
        queryKey: ['audit-logs', page, actionFilter, actorEmailFilter],
        queryFn: () => adminApi.getAuditLogs({
            page,
            limit: 20,
            action: actionFilter || undefined,
            actorEmail: actorEmailFilter || undefined
        })
    });

    const getActionBadgeVariant = (action: string) => {
        if (action.includes('CREATE')) return 'success';
        if (action.includes('UPDATE')) return 'warning';
        if (action.includes('DELETE')) return 'error';
        if (action.includes('LOGIN')) return 'info';
        return 'neutral';
    };

    const formatDetails = (details: any) => {
        if (!details) return '-';
        if (typeof details === 'string') return details;
        return (
            <pre className="text-[10px] font-mono bg-slate-50 p-1 rounded max-w-xs overflow-x-auto">
                {JSON.stringify(details, null, 2)}
            </pre>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
                    <p className="text-slate-500">Track system activities and user actions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <Filter size={18} />
                        <span className="text-sm font-medium">Filters</span>
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-fade-in grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Action Type</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="e.g. LOGIN, UPDATE"
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Actor Email</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by email"
                                value={actorEmailFilter}
                                onChange={(e) => setActorEmailFilter(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setActionFilter('');
                                setActorEmailFilter('');
                            }}
                            className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-2"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500">Loading audit logs...</p>
                    </div>
                ) : (data?.logs && data.logs.length > 0) ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-slate-600 text-sm">Action</th>
                                    <th className="px-6 py-4 font-medium text-slate-600 text-sm">Actor</th>
                                    <th className="px-6 py-4 font-medium text-slate-600 text-sm">Target</th>
                                    <th className="px-6 py-4 font-medium text-slate-600 text-sm">Details</th>
                                    <th className="px-6 py-4 font-medium text-slate-600 text-sm">Context</th>
                                    <th className="px-6 py-4 font-medium text-slate-600 text-sm text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data?.logs.map((log: any) => (
                                    <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <Badge variant={getActionBadgeVariant(log.action)}>
                                                {log.action}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{log.actor?.name || 'System'}</p>
                                                    <p className="text-xs text-slate-500">{log.actor?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.target ? (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{log.target.type}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{log.target.entityId}</p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {formatDetails(log.details)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Monitor size={12} />
                                                <span>{log.ipAddress || 'Unknown IP'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm text-slate-900">
                                                {new Date(log.createdAt).toLocaleTimeString()}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(log.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No audit logs found</h3>
                        <p className="text-slate-500">Try adjusting your filters or check back later.</p>
                    </div>
                )}

                {/* Pagination */}
                {data && (
                    <div className="border-t border-slate-200 px-6 py-4">
                        <Pagination
                            currentPage={page}
                            totalPages={data.pagination.pages || 0}
                            totalItems={data.pagination.total || 0}
                            itemsPerPage={data.pagination.limit || 20}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogsPage;
