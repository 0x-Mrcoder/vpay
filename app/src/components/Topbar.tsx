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
        <header className="w-full h-16 lg:h-20 bg-gray-50 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
            {/* Left Section - Mobile Menu */}
            <div className="flex items-center gap-3 lg:gap-4 flex-1">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Right Section - User Menu */}
            <div className="flex items-center gap-3 lg:gap-5">
                {/* Notifications Icon */}
                <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                {/* User Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-2 lg:gap-3 pl-2 py-1 hover:bg-gray-50 rounded-full transition-all duration-200"
                    >
                        {/* Avatar */}
                        <div className="w-8 h-8 lg:w-9 lg:h-9 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                            {/* Placeholder for user image if available, else initials */}
                            <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xs lg:text-sm">
                                {getInitials()}
                            </div>
                        </div>

                        <ChevronDown
                            size={14}
                            className={`text-gray-400 transition-transform hidden md:block ${showDropdown ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <>
                            {/* Mobile Overlay */}
                            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowDropdown(false)} />

                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 animate-fade-in-down overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-50">
                                    <p className="text-sm font-bold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                </div>
                                <Link
                                    to="/dashboard/profile"
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <User size={16} />
                                    Profile
                                </Link>
                                <Link
                                    to="/dashboard/settings"
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <Settings size={16} />
                                    Settings
                                </Link>
                                <hr className="my-1 border-gray-50" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
