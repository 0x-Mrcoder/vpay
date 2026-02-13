import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export const VerificationAlert: React.FC = () => {
    return (
        <div className="p-4 md:p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 shadow-sm animate-fade-in mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                <ShieldAlert size={24} />
            </div>
            <div>
                <h4 className="text-base font-bold text-amber-900">Verification Required</h4>
                <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                    You need to complete Tier 3 verification to access this feature. Please complete your KYC to unlock full functionality.
                </p>
                <Link to="/dashboard/verification" className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 hover:text-amber-700 mt-3 px-4 py-2 bg-white rounded-lg border border-amber-200 transition-colors shadow-sm">
                    Complete Verification
                    <CheckCircle2 size={14} />
                </Link>
            </div>
        </div>
    );
};
