import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Wallet,
    CreditCard,
    History,
    Code,
    Settings,
    LogOut,
    HelpCircle,
    Send,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';
import vtpayLogo from '../assets/logo.png';

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
    isDesktopOpen: boolean;
    setIsDesktopOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen, isDesktopOpen, setIsDesktopOpen }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNavClick = () => {
        if (window.innerWidth < 1024) {
            setIsMobileOpen(false);
        }
    };

    const navItems = [
        { path: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={20} />, exact: true },
        { path: '/dashboard/wallet', label: 'Wallet', icon: <Wallet size={20} /> },
        { path: '/dashboard/transactions', label: 'Transactions', icon: <History size={20} /> },
        { path: '/dashboard/virtual-accounts', label: 'Virtual Accounts', icon: <CreditCard size={20} /> },
        { path: '/dashboard/payout', label: 'Payout', icon: <Send size={20} /> },
        { path: '/dashboard/developer', label: 'Developer', icon: <Code size={20} /> },
        { path: '/dashboard/settings', label: 'Settings', icon: <Settings size={20} /> },
        { path: '/dashboard/help', label: 'Need Help?', icon: <HelpCircle size={20} /> },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen bg-white border-r border-gray-100 transition-all duration-300 ease-in-out flex flex-col shadow-sm
                    ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
                    ${isDesktopOpen ? 'lg:w-64' : 'lg:w-20'}
                `}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-gray-100">
                    {(isDesktopOpen || isMobileOpen) ? (
                        <div className="flex items-center gap-1">
                            <img src={vtpayLogo} alt="VTStack" className="h-14 object-contain" />
                            <div className="flex flex-col">
                                {/* <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mt-1">Dashboard</p> */}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <img src={vtpayLogo} alt="VTStack" className="h-8 object-contain" />
                        </div>
                    )}

                    {/* Desktop Toggle */}
                    <button
                        onClick={() => setIsDesktopOpen(!isDesktopOpen)}
                        className="hidden lg:flex w-6 h-6 items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all absolute -right-3 top-7 bg-white border border-gray-200 shadow-sm"
                    >
                        {isDesktopOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {/* Mobile Close */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-gray-900"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
                    <ul className="space-y-1.5">
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    end={item.exact}
                                    onClick={handleNavClick}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
                                        ${isActive
                                            ? 'bg-primary-50 text-primary-600 font-bold shadow-sm ring-1 ring-primary-100'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                        }
                                        ${!isDesktopOpen && !isMobileOpen ? 'justify-center px-2' : ''}
                                        `
                                    }
                                >
                                    <span className={`flex-shrink-0 transition-colors ${!isDesktopOpen && !isMobileOpen ? '' : ''}`}>
                                        {item.icon}
                                    </span>
                                    {(isDesktopOpen || isMobileOpen) && (
                                        <span className="text-sm truncate">{item.label}</span>
                                    )}

                                    {/* Tooltip for collapsed state */}
                                    {!isDesktopOpen && !isMobileOpen && (
                                        <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                            {item.label}
                                        </div>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-3 py-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 font-medium
                            ${!isDesktopOpen && !isMobileOpen ? 'justify-center' : ''}
                        `}
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        {(isDesktopOpen || isMobileOpen) && <span>Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
