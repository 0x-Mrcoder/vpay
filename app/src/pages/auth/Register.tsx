import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, User, Building, Mail, Phone, Lock, AlertCircle } from 'lucide-react';

export const Register: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        fullName: '',
        businessName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!formData.fullName) {
                setError('Please enter your full name');
                return;
            }
            if (!formData.businessName) {
                setError('Please enter your business name');
                return;
            }
        }
        if (currentStep === 2) {
            if (!formData.email || !formData.phone) {
                setError('Please provide your contact information');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                setError('Please enter a valid email address');
                return;
            }
        }
        setError('');
        setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        setError('');
        setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { confirmPassword, ...registerData } = formData;
            const response = await api.post('/auth/register', registerData);
            setSuccessMessage(response.data.message || 'Registration successful. Please check your email for the verification OTP.');
            setTimeout(() => {
                navigate('/verify-otp', { state: { email: formData.email } });
            }, 2000);
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || 'Failed to register. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const totalSteps = 3;
    const progress = (currentStep / totalSteps) * 100;

    if (successMessage) {
        return (
            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative p-8 text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CheckCircle size={40} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-4 tracking-tight">Check Your Email</h2>
                <p className="text-gray-600 mb-8 font-medium leading-relaxed">{successMessage}</p>
                <button
                    onClick={() => navigate('/verify-otp', { state: { email: formData.email } })}
                    className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0"
                >
                    Enter OTP
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative transition-all duration-300 hover:shadow-primary-500/10">

            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create Account</h2>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Step {currentStep} of {totalSteps} - Join VTStack today</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                        <div
                            className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between px-2">
                        {[1, 2, 3].map((step) => (
                            <div
                                key={step}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step < currentStep ? 'bg-primary-500 text-white shadow-md shadow-primary-200' :
                                    step === currentStep ? 'bg-primary-100 text-primary-700 ring-4 ring-primary-50 ring-offset-2' :
                                        'bg-gray-100 text-gray-400'
                                    }`}
                            >
                                {step < currentStep ? <CheckCircle size={14} className="text-white" /> : step}
                            </div>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                        <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 auth-form">
                    {/* Step 1: Personal Information */}
                    {currentStep === 1 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative group transition-all duration-300 focus-within:transform focus-within:-translate-y-1">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="John Doe"
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900 placeholder:text-gray-400"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Business Name</label>
                                <div className="relative group transition-all duration-300 focus-within:transform focus-within:-translate-y-1">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Building className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        name="businessName"
                                        value={formData.businessName}
                                        onChange={handleChange}
                                        placeholder="Acme Corp"
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900 placeholder:text-gray-400"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleNext}
                                className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 mt-4"
                            >
                                Continue <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Contact Information */}
                    {currentStep === 2 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="space-y-1">
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
                                        placeholder="you@example.com"
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900 placeholder:text-gray-400"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                                <div className="relative group transition-all duration-300 focus-within:transform focus-within:-translate-y-1">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="08012345678"
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900 placeholder:text-gray-400"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="px-6 py-3.5 border-2 border-gray-100 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all flex items-center gap-2 hover:border-gray-200"
                                >
                                    <ArrowLeft size={18} /> Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    Continue <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Security */}
                    {currentStep === 3 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
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
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900 placeholder:text-gray-400"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
                                <div className="relative group transition-all duration-300 focus-within:transform focus-within:-translate-y-1">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all bg-gray-50/50 focus:bg-white font-medium text-gray-900 placeholder:text-gray-400"
                                        required
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1 font-medium bg-gray-50 p-2 rounded-lg border border-gray-100">
                                💡 Password must be at least 8 characters long
                            </p>
                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="px-6 py-3.5 border-2 border-gray-100 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all flex items-center gap-2 hover:border-gray-200"
                                >
                                    <ArrowLeft size={18} /> Back
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
            <div className="bg-gray-50/80 p-6 text-center border-t border-gray-100 backdrop-blur-sm">
                <p className="text-sm text-gray-600 font-medium">
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-primary-600 hover:text-primary-700 hover:underline ml-1">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
};
