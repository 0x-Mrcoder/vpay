import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';

interface TopbarProps {
    onMenuClick: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = () => {
        if (!user) return 'U';
        return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
    };

    return (
        <header className="w-full h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-md sticky top-0 z-30 backdrop-blur-sm bg-white/95">
            {/* Left Section - Mobile Menu + Welcome Message */}
            <div className="flex items-center gap-3 lg:gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-110"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <div>
                    <h2 className="text-base lg:text-xl font-bold text-slate-900">
                        <span className="hidden sm:inline">Welcome back, </span>
                        {user?.firstName || 'User'}! 👋
                    </h2>
                    <p className="text-xs lg:text-sm text-slate-500 mt-0.5 lg:mt-1 hidden md:block">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </p>
                </div>
            </div>

            {/* Right Section - User Menu */}
            <div className="flex items-center gap-3 lg:gap-6">
                {/* Notifications Icon */}
                <button className="hidden sm:block relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-110">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse-slow"></span>
                </button>

                {/* Divider */}
                <div className="hidden sm:block w-px h-6 bg-slate-200"></div>

                {/* User Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
                    >
                        {/* Avatar */}
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs lg:text-sm shadow-lg ring-2 ring-green-400/30">
                            {getInitials()}
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="text-sm font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                        <ChevronDown
                            size={16}
                            className={`text-slate-600 transition-transform hidden md:block ${showDropdown ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <>
                            {/* Mobile Overlay */}
                            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowDropdown(false)} />

                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 animate-fade-in-down overflow-hidden">
                                <Link
                                    to="/dashboard/profile"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <User size={16} />
                                    Profile
                                </Link>
                                <Link
                                    to="/dashboard/settings"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <Settings size={16} />
                                    Settings
                                </Link>
                                <hr className="my-1" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Topbar;
