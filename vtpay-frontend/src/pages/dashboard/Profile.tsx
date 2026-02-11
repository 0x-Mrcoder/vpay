import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User, Mail, Phone, Camera, Briefcase, Lock, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const Profile: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        businessName: user?.businessName || '',
        phone: user?.phone || ''
    });

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // Update local state when user context changes
    useEffect(() => {
        if (user) {
            setProfileData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                businessName: user.businessName || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const response = await api.put('/auth/profile', profileData);
            if (response.data.success) {
                updateUser(response.data.data);
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setIsEditing(false);
            }
        } catch (error: any) {
            console.error('Update profile error:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update profile'
            });
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setIsLoading(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update password'
            });
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-10 animate-fade-in p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Account Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your personal info, business details, and security.</p>
                </div>
                <div className="flex p-1 bg-gray-100 rounded-xl self-start sm:self-center">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 text-xs md:text-sm font-black rounded-lg transition-all uppercase tracking-widest ${activeTab === 'general' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`px-4 py-2 text-xs md:text-sm font-black rounded-lg transition-all uppercase tracking-widest ${activeTab === 'security' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Security
                    </button>
                </div>
            </div>

            {/* Feedback Message */}
            {message && (
                <div className={`p-4 rounded-xl flex items-start gap-3 animate-fade-in ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className={`flex-shrink-0 mt-0.5 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                        {message.text}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Sidebar - Profile Summary */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="h-24 bg-gradient-to-r from-green-400 to-green-600"></div>
                        <div className="px-6 pb-8 text-center relative">
                            <div className="w-24 h-24 bg-white rounded-full p-1 mx-auto -mt-12 mb-4 shadow-xl">
                                <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-3xl font-black text-gray-500 uppercase">
                                    {user?.firstName?.charAt(0)}
                                </div>
                                <button className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-lg border border-gray-100 text-gray-500 hover:text-green-600 transition-all transform hover:scale-110">
                                    <Camera size={14} />
                                </button>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{user?.firstName} {user?.lastName}</h2>
                            <p className="text-sm text-gray-500 mb-6 font-medium">{user?.email}</p>
                            <div className="flex items-center justify-center gap-3">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${user?.kycLevel === 3 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {user?.kycLevel === 3 ? 'Verified' : 'Pending'}
                                </span>
                                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600">
                                    User
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats or Info */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-[10px] md:text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Account Info</h3>
                        <div className="space-y-5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Member Since</span>
                                <span className="font-black text-gray-900">Jan 2024</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Last Login</span>
                                <span className="font-black text-gray-900">Today, 10:23 AM</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Status</span>
                                <span className={`font-black uppercase text-[10px] tracking-widest px-2 py-0.5 rounded-md ${user?.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {user?.status || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content - Forms */}
                <div className="lg:col-span-2">
                    {activeTab === 'general' ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-gray-900">Personal Information</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">Update your personal details and business info.</p>
                                </div>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all uppercase tracking-widest ${isEditing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200'}`}
                                >
                                    {isEditing ? 'Cancel' : 'Edit Profile'}
                                </button>
                            </div>
                            <div className="p-5 md:p-8">
                                <form onSubmit={handleSaveProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5 block">First Name</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    value={profileData.firstName}
                                                    onChange={handleProfileChange}
                                                    disabled={!isEditing}
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-gray-900 focus:outline-none focus:border-green-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5 block">Last Name</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    value={profileData.lastName}
                                                    onChange={handleProfileChange}
                                                    disabled={!isEditing}
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-gray-900 focus:outline-none focus:border-green-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5 block">Business Name</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Briefcase className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                name="businessName"
                                                value={profileData.businessName}
                                                onChange={handleProfileChange}
                                                placeholder="Enter your business name"
                                                disabled={!isEditing}
                                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-gray-900 focus:outline-none focus:border-green-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2 font-medium">This name will appear on your invoices and transactions.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5 block">Email Address</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="email"
                                                    value={user?.email || ''}
                                                    disabled
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-100 border-2 border-gray-100 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-gray-500 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5 block">Phone Number</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={profileData.phone}
                                                    onChange={handleProfileChange}
                                                    disabled={!isEditing}
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-gray-900 focus:outline-none focus:border-green-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <div className="pt-6 flex justify-end border-t border-gray-100 mt-8">
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl md:rounded-2xl font-black text-sm transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
                                            >
                                                {isLoading ? (
                                                    <Loader2 size={20} className="animate-spin" />
                                                ) : (
                                                    <CheckCircle size={20} />
                                                )}
                                                Save Profile Changes
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-base md:text-lg font-black text-gray-900">Security Settings</h3>
                                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">Update your password and secure your account.</p>
                            </div>
                            <div className="p-5 md:p-8">
                                <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-lg">
                                    <div>
                                        <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5 block">Current Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                            </div>
                                            <input
                                                type="password"
                                                name="current"
                                                value={passwords.current}
                                                onChange={handlePasswordChange}
                                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-gray-900 focus:outline-none focus:border-green-500 transition-all"
                                                placeholder="Enter current password"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5 block">New Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Shield className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                                </div>
                                                <input
                                                    type="password"
                                                    name="new"
                                                    value={passwords.new}
                                                    onChange={handlePasswordChange}
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-gray-900 focus:outline-none focus:border-green-500 transition-all"
                                                    placeholder="New password"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5 block">Confirm Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Shield className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                                </div>
                                                <input
                                                    type="password"
                                                    name="confirm"
                                                    value={passwords.confirm}
                                                    onChange={handlePasswordChange}
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-gray-900 focus:outline-none focus:border-green-500 transition-all"
                                                    placeholder="Confirm new password"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl md:rounded-2xl font-black text-sm transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
                                        >
                                            {isLoading ? (
                                                <Loader2 size={20} className="animate-spin" />
                                            ) : (
                                                <Shield size={20} />
                                            )}
                                            Update Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
