import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, AlertCircle, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';

export const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const emailFromState = (location.state as any)?.email || '';

    const [step, setStep] = useState<'otp' | 'password'>('otp');
    const [email, setEmail] = useState(emailFromState);
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleOtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            setError('Please enter the 6-digit code from your email.');
            return;
        }
        setError('');
        setStep('password');
    };

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await api.post('/auth/reset-password', {
                email: email.toLowerCase(),
                otp,
                newPassword,
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 text-center space-y-5">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={40} className="text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Password Reset!</h2>
                        <p className="text-sm text-gray-500 mt-2 font-medium leading-relaxed">
                            Your password has been updated successfully. You can now log in with your new password.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-base shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative transition-all duration-300">
            <div className="p-6 md:p-8">

                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-6">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${step === 'otp' ? 'bg-primary-500 text-white' : 'bg-green-500 text-white'}`}>
                        {step === 'password' ? <CheckCircle2 size={16} /> : '1'}
                    </div>
                    <div className={`flex-1 h-1 rounded-full transition-all ${step === 'password' ? 'bg-primary-500' : 'bg-gray-200'}`} />
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${step === 'password' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        2
                    </div>
                </div>

                {step === 'otp' ? (
                    <form onSubmit={handleOtpSubmit} className="space-y-6">
                        <div className="text-center mb-2">
                            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                                <KeyRound size={28} className="text-primary-600" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Enter Reset Code</h2>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                Check your inbox for the 6-digit code we sent to <span className="font-bold text-gray-700">{email || 'your email'}</span>.
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 border rounded-2xl flex items-start gap-3 shadow-sm bg-red-50 border-red-100">
                                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-medium text-red-700">{error}</p>
                            </div>
                        )}

                        {!emailFromState && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900"
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">6-Digit Code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                placeholder="000000"
                                maxLength={6}
                                className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-bold text-2xl text-center tracking-[0.5em] text-gray-900 placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-normal placeholder:text-base"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0 mt-4"
                        >
                            Verify Code
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetSubmit} className="space-y-6">
                        <div className="text-center mb-2">
                            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                                <Lock size={28} className="text-primary-600" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Set New Password</h2>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                Choose a strong password at least 8 characters long.
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 border rounded-2xl flex items-start gap-3 shadow-sm bg-red-50 border-red-100">
                                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-medium text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">New Password</label>
                            <div className="relative group transition-all duration-300 focus-within:transform focus-within:-translate-y-1">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-12 py-4 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
                            <div className="relative group transition-all duration-300 focus-within:transform focus-within:-translate-y-1">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                </div>
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                    placeholder="••••••••"
                                    className={`w-full pl-11 pr-12 py-4 rounded-xl border-2 ${confirmPassword && confirmPassword !== newPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-primary-500'} focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900`}
                                    required
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {confirmPassword && confirmPassword !== newPassword && (
                                <p className="text-xs text-red-500 font-medium ml-1">Passwords do not match</p>
                            )}
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => { setStep('otp'); setError(''); }}
                                className="flex-none px-5 py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={22} className="animate-spin" />
                                        <span>Resetting...</span>
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="bg-gray-50/80 p-5 text-center border-t border-gray-100">
                <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary-600 transition-colors">
                    <ArrowLeft size={16} /> Back to Login
                </Link>
            </div>
        </div>
    );
};
