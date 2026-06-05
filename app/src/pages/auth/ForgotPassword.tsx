import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, AlertCircle, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 text-center space-y-5">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={40} className="text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Check Your Email</h2>
                        <p className="text-sm text-gray-500 mt-2 font-medium leading-relaxed">
                            If an account with <span className="font-bold text-gray-700">{email}</span> exists, we've sent a 6-digit reset code. It expires in <strong>15 minutes</strong>.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/reset-password', { state: { email } })}
                        className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-base shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0"
                    >
                        Enter Reset Code
                    </button>
                    <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary-600 transition-colors mt-2">
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative transition-all duration-300">
            <div className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center mb-2">
                        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                            <Mail size={28} className="text-primary-600" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Forgot Password?</h2>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                            No worries! Enter your email and we'll send you a reset code.
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 border rounded-2xl flex items-start gap-3 shadow-sm bg-red-50 border-red-100">
                            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-red-900">Error</h4>
                                <p className="text-xs mt-1 font-medium leading-relaxed text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative group transition-all duration-300 focus-within:transform focus-within:-translate-y-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                placeholder="you@company.com"
                                className="w-full pl-11 pr-4 py-4 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900 placeholder:text-gray-400"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-4"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={22} className="animate-spin" />
                                <span>Sending Code...</span>
                            </>
                        ) : (
                            'Send Reset Code'
                        )}
                    </button>
                </form>
            </div>

            <div className="bg-gray-50/80 p-5 text-center border-t border-gray-100">
                <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary-600 transition-colors">
                    <ArrowLeft size={16} /> Back to Login
                </Link>
            </div>
        </div>
    );
};
