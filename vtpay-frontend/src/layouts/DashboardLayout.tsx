import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export const DashboardLayout: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDesktopOpen, setIsDesktopOpen] = useState(true);

    return (
        <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
            <Sidebar
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
                isDesktopOpen={isDesktopOpen}
                setIsDesktopOpen={setIsDesktopOpen}
            />
            <div
                className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isDesktopOpen ? 'lg:ml-64' : 'lg:ml-20'
                    }`}
            >
                <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
                <main className="flex-1 overflow-auto p-4 lg:p-8 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
