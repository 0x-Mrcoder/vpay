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
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/auth/login', formData);
            const { token, user } = response.data.data;
            setSuccess('Redirecting to dashboard...');
            setTimeout(() => {
                login(token, user);
                navigate('/dashboard');
            }, 1000);
        } catch (err: any) {
            console.error('Login error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to login. Please try again.';
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
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative transition-all duration-300 hover:shadow-primary-500/10">

            <div className="p-6 md:p-8">



                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center mb-2">
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h2>
                        <p className="text-xs text-gray-500 mt-1 font-medium">Sign in to manage your virtual accounts</p>
                    </div>

                    {(error || success) && (
                        <div className={`p-4 border rounded-2xl flex items-start gap-3 shadow-sm ${error ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            {error ? (
                                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <h4 className={`text-sm font-bold ${error ? 'text-red-900' : 'text-green-900'}`}>
                                    {error ? 'Authentication Failed' : 'Login Successful'}
                                </h4>
                                <p className={`text-xs mt-1 font-medium leading-relaxed ${error ? 'text-red-700' : 'text-green-700'}`}>
                                    {error || success}
                                </p>
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
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@company.com"
                                className="w-full pl-11 pr-4 py-4 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900 placeholder:text-gray-400"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Password</label>
                            <Link to="/forgot-password" className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline">
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="relative group transition-all duration-300 focus-within:transform focus-within:-translate-y-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-4 py-4 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900 placeholder:text-gray-400"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center pt-2">
                        <label className="flex items-center cursor-pointer group">
                            <div className="relative">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-primary-500 peer-checked:border-primary-500 transition-all flex items-center justify-center">
                                    <Check size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                                </div>
                            </div>
                            <span className="ml-3 text-sm text-gray-500 font-medium group-hover:text-primary-600 transition-colors">Keep me signed in</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-8"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                <span className="text-base">Authenticating...</span>
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>

            <div className="bg-gray-50/80 p-6 text-center border-t border-gray-100 backdrop-blur-sm">
                <p className="text-sm text-gray-600 font-medium">
                    New to VTStack?{' '}
                    <Link to="/register" className="font-bold text-primary-600 hover:text-primary-700 hover:underline ml-1">
                        Create an Account
                    </Link>
                </p>
            </div>
        </div>
    );
};
