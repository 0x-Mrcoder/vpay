import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import vtpayLogo from '../../assets/logo.png';

export const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email address...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        const verifyEmail = async () => {
            try {
                await api.get(`/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage('Your email has been successfully verified. You can now access all features of your VTStack account.');
            } catch (error: any) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage(error.response?.data?.message || 'Failed to verify email. The link may be expired or already used.');
            }
        };

        verifyEmail();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-fade-in-up">
                <div className="p-8 text-center">
                    <Link to="/" className="inline-block mb-8">
                        <img src={vtpayLogo} alt="VTStack" className="h-10 mx-auto" />
                    </Link>

                    <div className="mb-8 flex justify-center">
                        {status === 'loading' && (
                            <div className="p-4 bg-primary-50 rounded-2xl text-primary-600 animate-spin">
                                <Loader2 size={48} />
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="p-4 bg-primary-50 rounded-2xl text-primary-500 transform rotate-3 shadow-sm">
                                <CheckCircle size={48} />
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="p-4 bg-red-50 rounded-2xl text-red-500 transform -rotate-3 shadow-sm">
                                <XCircle size={48} />
                            </div>
                        )}
                    </div>

                    <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                        {status === 'loading' && 'Verifying Email'}
                        {status === 'success' && 'Email Verified!'}
                        {status === 'error' && 'Verification Failed'}
                    </h2>

                    <p className="text-gray-600 mb-10 leading-relaxed font-medium">
                        {message}
                    </p>

                    {status !== 'loading' && (
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/20 hover:shadow-primary-500/30 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
                        >
                            Go to Login
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
                
                <div className="bg-gray-50 py-6 text-center border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500">
                        Need help? Contact <a href="mailto:vtstackltdng@gmail.com" className="text-primary-600 font-bold hover:underline">Support</a>
                    </p>
                </div>
            </div>
        </div>
    );
};
