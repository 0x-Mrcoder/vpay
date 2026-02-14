import React, { useState, useEffect } from 'react';
import { adminApi, type Admin } from '../../api/client';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, Shield, Mail, User, Phone, Lock, RefreshCw, Search } from 'lucide-react';
import { createAdminSchema, type CreateAdminFormData } from '../../schemas/admin';

const AdminsPage: React.FC = () => {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);


    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<CreateAdminFormData>({
        resolver: zodResolver(createAdminSchema)
    });

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getAllAdmins();
            setAdmins(data);
        } catch (error) {
            console.error('Failed to fetch admins:', error);
            toast.error('Failed to fetch admin users');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CreateAdminFormData) => {
        try {
            await adminApi.createAdmin(data);
            toast.success('Admin user created successfully');
            setShowAddModal(false);
            reset();
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create admin user');
        }
    };

    const filteredAdmins = admins.filter(admin => {
        const query = searchQuery.toLowerCase();
        return (
            (admin.firstName?.toLowerCase() || '').includes(query) ||
            (admin.lastName?.toLowerCase() || '').includes(query) ||
            (admin.email?.toLowerCase() || '').includes(query)
        );
    });

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Admin Users</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage users with administrative access</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchAdmins}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            reset();
                            setShowAddModal(true);
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Admin
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Search size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search admins by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Joined Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-48"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded-full w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-12 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredAdmins.length > 0 ? (
                                filteredAdmins.map((admin) => (
                                    <tr key={admin._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                                                    {admin.firstName?.[0]}{admin.lastName?.[0]}
                                                </div>
                                                <span className="text-sm font-medium text-slate-900">{admin.firstName} {admin.lastName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{admin.email}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{admin.phone}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${admin.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {admin.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(admin.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-primary-600 transition-colors">
                                                <Shield size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No admin users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Admin Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Add New Admin</h3>
                                    <p className="text-xs text-slate-500">Grant administrative privileges</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">First Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            {...register('firstName')}
                                            type="text"
                                            className={`w-full pl-10 pr-4 py-2 border ${errors.firstName ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                            placeholder="John"
                                        />
                                    </div>
                                    {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Last Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            {...register('lastName')}
                                            type="text"
                                            className={`w-full pl-10 pr-4 py-2 border ${errors.lastName ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                            placeholder="Doe"
                                        />
                                    </div>
                                    {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        {...register('email')}
                                        type="email"
                                        className={`w-full pl-10 pr-4 py-2 border ${errors.email ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                        placeholder="admin@example.com"
                                    />
                                </div>
                                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        {...register('phone')}
                                        type="tel"
                                        className={`w-full pl-10 pr-4 py-2 border ${errors.phone ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                        placeholder="+234..."
                                    />
                                </div>
                                {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        {...register('password')}
                                        type="password"
                                        className={`w-full pl-10 pr-4 py-2 border ${errors.password ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                        placeholder="••••••••"
                                    />
                                </div>
                                {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Shield size={18} />
                                            Create Admin Account
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminsPage;
