import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    History,
    DollarSign,
    Webhook,
    Key,
    TrendingUp,
    ShieldAlert,
    HelpCircle,
    Send,
    Settings,
    ChevronLeft,
    ChevronRight,
    X,
    UserPlus,
    Activity,
    LogOut
} from 'lucide-react';

interface NavItem {
    to?: string;
    label: string;
    icon: React.ReactNode;
    children?: { to: string; label: string }[];
}

const navItems: NavItem[] = [
    {
        to: '/dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
    },
    {
        to: '/tenants',
        label: 'Tenants',
        icon: <Users size={20} />,
    },
    {
        to: '/admins',
        label: 'Admin Management',
        icon: <UserPlus size={20} />,
    },
    {
        to: '/transactions',
        label: 'Transactions & Ledger',
        icon: <History size={20} />,
    },
    {
        to: '/settlements',
        label: 'Settlements & Payouts',
        icon: <DollarSign size={20} />,
    },
    {
        to: '/webhooks',
        label: 'Webhooks & Events',
        icon: <Webhook size={20} />,
    },
    {
        to: '/api-keys',
        label: 'API & Key Management',
        icon: <Key size={20} />,
    },
    {
        to: '/fees',
        label: 'Fees & Revenue',
        icon: <TrendingUp size={20} />,
    },
    {
        to: '/risk',
        label: 'Risk & Compliance',
        icon: <ShieldAlert size={20} />,
    },
    {
        to: '/help',
        label: 'Help Messages',
        icon: <HelpCircle size={20} />,
    },
    {
        to: '/communications',
        label: 'Communications',
        icon: <Send size={20} />,
    },
    {
        to: '/audit-logs',
        label: 'Audit Logs',
        icon: <Activity size={20} />,
    },
    {
        to: '/settings',
        label: 'System Settings',
        icon: <Settings size={20} />,
    },
];

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
    isDesktopOpen: boolean;
    setIsDesktopOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen, isDesktopOpen, setIsDesktopOpen }) => {
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/login');
    };

    const handleNavClick = () => {
        if (window.innerWidth < 1024) {
            setIsMobileOpen(false);
        }
    };

    const toggleMenu = (label: string) => {
        setExpandedMenus(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

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
                className={`fixed top-0 left-0 z-50 h-screen bg-white border-r border-slate-100 transition-all duration-300 ease-in-out flex flex-col shadow-sm
                    ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
                    ${isDesktopOpen ? 'lg:w-64' : 'lg:w-20'}
                `}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
                    {(isDesktopOpen || isMobileOpen) ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shadow-sm p-1.5">
                                <img src="/favicon.png" alt="VTStack" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                                    VTStack
                                </h1>
                                <p className="text-[10px] text-primary-600 font-bold tracking-wider uppercase">Admin</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <img src="/favicon.png" alt="VTStack" className="h-8 object-contain" />
                        </div>
                    )}

                    {/* Desktop Toggle */}
                    <button
                        onClick={() => setIsDesktopOpen(!isDesktopOpen)}
                        className="hidden lg:flex w-6 h-6 items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all absolute -right-3 top-7 bg-white border border-slate-200 shadow-sm"
                    >
                        {isDesktopOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {/* Mobile Close */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-slate-900"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
                    <ul className="space-y-1.5">
                        {navItems.map((item) => (
                            <li key={item.label}>
                                {item.children ? (
                                    <>
                                        <button
                                            onClick={() => toggleMenu(item.label)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                                                ${location.pathname.startsWith(item.to || '')
                                                    ? 'bg-primary-50 text-primary-600 font-bold'
                                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                                }
                                                ${!isDesktopOpen && !isMobileOpen ? 'justify-center px-2' : ''}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="flex-shrink-0">{item.icon}</span>
                                                {(isDesktopOpen || isMobileOpen) && (
                                                    <span className="text-sm truncate">{item.label}</span>
                                                )}
                                            </div>
                                            {(isDesktopOpen || isMobileOpen) && (
                                                <svg
                                                    className={`w-4 h-4 transition-transform duration-200 ${expandedMenus.includes(item.label) ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            )}
                                        </button>

                                        {expandedMenus.includes(item.label) && (isDesktopOpen || isMobileOpen) && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-slate-100 pl-2">
                                                {item.children.map((child) => (
                                                    <NavLink
                                                        key={child.to}
                                                        to={child.to}
                                                        onClick={handleNavClick}
                                                        className={({ isActive }) =>
                                                            `block px-4 py-2 rounded-lg text-sm transition-all duration-200 ${isActive
                                                                ? 'text-primary-600 font-bold bg-primary-50'
                                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                            }`
                                                        }
                                                    >
                                                        {child.label}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <NavLink
                                        to={item.to!}
                                        onClick={handleNavClick}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
                                            ${isActive
                                                ? 'bg-primary-50 text-primary-600 font-bold shadow-sm ring-1 ring-primary-100'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                            }
                                            ${!isDesktopOpen && !isMobileOpen ? 'justify-center px-2' : ''}
                                            `
                                        }
                                    >
                                        <span className="flex-shrink-0 transition-colors">
                                            {item.icon}
                                        </span>
                                        {(isDesktopOpen || isMobileOpen) && (
                                            <span className="text-sm truncate">{item.label}</span>
                                        )}

                                        {!isDesktopOpen && !isMobileOpen && (
                                            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                {item.label}
                                            </div>
                                        )}
                                    </NavLink>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 font-medium
                            ${!isDesktopOpen && !isMobileOpen ? 'justify-center' : ''}
                        `}
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        {(isDesktopOpen || isMobileOpen) && <span>Logout</span>}
                    </button>
                    {(isDesktopOpen || isMobileOpen) && <p className="text-[10px] text-slate-300 font-medium px-4 mt-2 uppercase tracking-wider text-center">v1.0.0 Admin</p>}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
