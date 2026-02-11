import React from 'react';
import { Outlet } from 'react-router-dom';
import vtpayLogo from '../assets/images/vtpay-logo.svg';

export const AuthLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Brand Section */}
                <div className="text-center mb-6">
                    <img src={vtpayLogo} alt="VTPay" className="h-16 mx-auto mb-4 object-contain" />
                    <p className="text-gray-500 mt-2 text-sm font-medium">Secure Payment Gateway & Virtual Accounts</p>
                </div>

                {/* Auth Content */}
                <Outlet />

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-8 font-medium">
                    © {new Date().getFullYear()} VTPay. Protected by enterprise-grade security.
                </p>
            </div>
        </div>
    );
};
