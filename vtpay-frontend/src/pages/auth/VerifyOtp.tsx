import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, AlertCircle, Mail, ArrowRight, RefreshCw } from 'lucide-react';

export const VerifyOtp: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        // Try to get email from location state (passed from register page)
        if (location.state?.email) {
            setEmail(location.state.email);
        } else {
            // If no email in state, maybe redirect to login or ask user to enter email?
            // For now, let's just let them enter it if they want, but usually this flow comes from register
        }
    }, [location]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOtp(e.target.value);
        setError('');
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.post('/auth/verify-otp', { email, otp });
            setSuccess('Email verified successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: any) {
            console.error('Verification error:', err);
            setError(err.response?.data?.message || 'Failed to verify OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!email) {
            setError('Email is required to resend OTP');
            return;
        }
        setIsResending(true);
        setError('');
        setSuccess('');

        try {
            await api.post('/auth/resend-otp', { email });
            setSuccess('OTP resent successfully. Please check your email.');
        } catch (err: any) {
            console.error('Resend OTP error:', err);
            setError(err.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <Mail className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Verify Email</h2>
                        <p className="text-sm text-gray-500 mt-2">
                            We sent a 6-digit code to <span className="font-semibold text-gray-700">{email || 'your email'}</span>
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800 font-medium">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-fade-in">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                            </div>
                            <p className="text-sm text-green-800 font-medium">{success}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!location.state?.email && (
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-gray-50 focus:bg-white"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Verification Code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={handleChange}
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-gray-50 focus:bg-white text-center text-2xl tracking-widest font-mono"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-200 hover:shadow-green-300 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={isLoading || !otp || !email}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Verify Account
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={handleResendOtp}
                            disabled={isResending || !email}
                            className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                        >
                            {isResending ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <RefreshCw size={14} />
                            )}
                            Resend Code
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                        Back to{' '}
                        <Link to="/login" className="font-bold text-green-600 hover:text-green-700 hover:underline">
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
