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
            <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden text-center p-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
                    <p className="text-gray-600 mb-8">{successMessage}</p>
                    <button
                        onClick={() => navigate('/verify-otp', { state: { email: formData.email } })}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-200"
                    >
                        Enter OTP
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden auth-wrapper">
            <div className="p-8 auth-card">
                {/* Header */}
                <div className="text-center mb-8 auth-brand">
                    <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                    <p className="text-sm text-gray-500 mt-1">Step {currentStep} of {totalSteps}</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                        <div
                            className="h-full bg-green-600 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between px-2">
                        {[1, 2, 3].map((step) => (
                            <div
                                key={step}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step < currentStep ? 'bg-green-600 text-white' :
                                    step === currentStep ? 'bg-green-100 text-green-700 ring-4 ring-green-50' :
                                        'bg-gray-100 text-gray-400'
                                    }`}
                            >
                                {step < currentStep ? '✓' : step}
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
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="John Doe"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-gray-50 focus:bg-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Business Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Building className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="businessName"
                                        value={formData.businessName}
                                        onChange={handleChange}
                                        placeholder="Acme Corp"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-gray-50 focus:bg-white"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleNext}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2 auth-submit-btn"
                            >
                                Continue <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Contact Information */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-fade-in">
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
                                <label className="block text-sm font-bold text-gray-900 mb-2">Phone Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="08012345678"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-gray-50 focus:bg-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="px-6 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all flex items-center gap-2"
                                >
                                    <ArrowLeft size={18} /> Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2 auth-submit-btn"
                                >
                                    Continue <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Security */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Password</label>
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
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Confirm Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-gray-50 focus:bg-white"
                                        required
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                💡 Password must be at least 8 characters long
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="px-6 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all flex items-center gap-2"
                                >
                                    <ArrowLeft size={18} /> Back
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed auth-submit-btn"
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
            <div className="bg-gray-50 p-6 text-center border-t border-gray-100 auth-footer">
                <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-green-600 hover:text-green-700 hover:underline">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
};
