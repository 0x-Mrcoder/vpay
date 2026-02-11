import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Loader2, AlertCircle, Mail, Lock, Check } from 'lucide-react';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', formData);
            const { token, user } = response.data.data;
            login(token, user);
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Login error:', err);
            const errorMessage = err.response?.data?.message || 'Failed to login. Please try again.';
            setError(errorMessage);

            // If error is related to unverified email, offer to verify
            if (errorMessage.includes('verify your email')) {
                // Optional: Automatically redirect or show a button
                setTimeout(() => {
                    navigate('/verify-otp', { state: { email: formData.email } });
                }, 2000);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden auth-wrapper">
            <div className="p-8 auth-card">
                <div className="text-center mb-8 auth-brand">
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h2>
                    <p className="text-sm text-gray-500 mt-2">Sign in to access your dashboard</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                        <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 auth-form">
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-gray-50 focus:bg-white"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-gray-900">Password</label>
                            <Link to="/forgot-password" className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline">
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-gray-50 focus:bg-white"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                        <label className="flex items-center cursor-pointer group">
                            <div className="relative">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-green-600 peer-checked:border-green-600 transition-all flex items-center justify-center">
                                    <Check size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                                </div>
                            </div>
                            <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-200 hover:shadow-green-300 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed auth-submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
            <div className="bg-gray-50 p-6 text-center border-t border-gray-100 auth-footer">
                <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-bold text-green-600 hover:text-green-700 hover:underline">
                        Create Account
                    </Link>
                </p>
            </div>
        </div>
    );
};
