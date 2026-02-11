import React, { useState } from 'react';
import api from '../../services/api';
import {
    CreditCard,
    FileText,
    Upload,
    AlertCircle,
    Clock,
    CheckCircle2,
    ShieldCheck,
    Info,
    ArrowRight,
    Lock,
    Check,
    User,
    Calendar,
    Zap,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const Verification: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        nin: user?.nin || '',
        bvn: user?.bvn || '',
        ninName: '',
        dob: '',
        idCard: user?.idCardPath || '',
        otherDocs: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, [e.target.name]: e.target.files[0].name });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await api.post('/kyc/submit', formData);
            if (user) {
                updateUser({ ...user, kycLevel: 2 });
            }
        } catch (err: any) {
            console.error('KYC submission error:', err);
            setError(err.response?.data?.message || 'Failed to submit KYC details.');
        } finally {
            setIsLoading(false);
        }
    };

    // Render based on Account Status
    if (user?.status === 'suspended') {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-6 animate-fade-in">
                <div className="bg-red-50 border border-red-200 rounded-2xl md:rounded-3xl p-6 md:p-10 text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} className="text-red-600 md:w-10 md:h-10" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-red-900 mb-3">Account Suspended</h2>
                    <p className="text-sm md:text-base text-red-700 max-w-md mx-auto leading-relaxed mb-8">
                        Your account has been suspended by the administration. You currently have restricted access to VTPay features.
                    </p>
                    <div className="bg-white p-5 md:p-6 rounded-xl md:rounded-2xl border border-red-100 text-left mb-8 shadow-sm">
                        <h3 className="text-sm md:text-base font-bold text-red-900 mb-2 flex items-center gap-2">
                            <Info size={18} />
                            Why is my account suspended?
                        </h3>
                        <p className="text-xs md:text-sm text-red-800 leading-relaxed">
                            Suspensions typically occur due to compliance reviews, suspicious activity, or missing documentation. Please contact our support team for more information.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 max-w-xs mx-auto">
                        <Link to="/dashboard/help" className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-200 text-center text-sm">
                            Contact Support
                        </Link>
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    const response = await api.get('/auth/profile');
                                    updateUser(response.data.data);
                                } catch (err) {
                                    console.error('Refresh status error:', err);
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            className="text-red-600 text-xs md:text-sm font-bold hover:underline flex items-center justify-center gap-2 py-2"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            Check Status Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render based on KYC Level
    if (user?.kycLevel === 3) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-6 animate-fade-in">
                <div className="bg-white border border-gray-100 rounded-2xl md:rounded-3xl p-6 md:p-12 text-center shadow-xl shadow-green-50">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
                        <CheckCircle2 size={40} className="text-green-500 md:w-12 md:h-12" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">Account Verified</h2>
                    <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto leading-relaxed mb-10">
                        Congratulations! Your account is fully verified. You now have unrestricted access to all VTPay features, including live payments and virtual accounts.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-10">
                        <div className="p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 flex sm:flex-col items-center gap-3 sm:gap-0">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center sm:mx-auto sm:mb-3 shadow-sm shrink-0">
                                <Check size={20} className="text-green-600" />
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Live API</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 flex sm:flex-col items-center gap-3 sm:gap-0">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center sm:mx-auto sm:mb-3 shadow-sm shrink-0">
                                <Check size={20} className="text-green-600" />
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Virtual AC</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 flex sm:flex-col items-center gap-3 sm:gap-0">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center sm:mx-auto sm:mb-3 shadow-sm shrink-0">
                                <Check size={20} className="text-green-600" />
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">High Limits</p>
                        </div>
                    </div>

                    <Link to="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black transition-all shadow-lg shadow-green-200 text-sm md:text-base">
                        Go to Dashboard
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

    if (user?.kycLevel === 2) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-6 animate-fade-in">
                <div className="bg-white border border-amber-100 rounded-2xl md:rounded-3xl p-6 md:p-12 text-center shadow-xl shadow-amber-50 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock size={32} className="text-amber-500 md:w-10 md:h-10" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">Review in Progress</h2>
                        <p className="text-sm md:text-base text-gray-500 mb-10 max-w-md mx-auto leading-relaxed">
                            Your documents have been submitted and are currently being reviewed by our compliance team. This typically takes 24-48 hours.
                        </p>

                        <div className="bg-blue-50 rounded-xl md:rounded-2xl p-5 md:p-8 text-left max-w-lg mx-auto border border-blue-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <ShieldCheck size={80} className="text-blue-600 md:w-24 md:h-24" />
                            </div>
                            <h3 className="text-sm md:text-base font-black text-blue-900 mb-5 flex items-center gap-2 relative z-10">
                                <ShieldCheck size={20} />
                                What to expect?
                            </h3>
                            <ul className="space-y-5 text-xs md:text-sm text-blue-800 relative z-10">
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 text-blue-800">1</div>
                                    <p className="font-medium">Our team will verify your NIN and details against national databases.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 text-blue-800">2</div>
                                    <p className="font-medium">Your uploaded ID card will be checked for authenticity and clarity.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 text-blue-800">3</div>
                                    <p className="font-medium">You'll receive an email notification as soon as the review is complete.</p>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    const response = await api.get('/auth/profile');
                                    updateUser(response.data.data);
                                } catch (err) {
                                    console.error('Error refreshing status:', err);
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            disabled={isLoading}
                            className="w-full sm:w-auto mt-8 px-8 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-black transition-all inline-flex items-center justify-center gap-2 text-sm"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Check Status
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-10 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Verification</h1>
                    <p className="text-sm text-gray-500 mt-1">Complete your KYC to unlock full account features</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl border border-gray-200 self-start sm:self-center">
                    <Lock size={14} className="text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Tier 1 Limited</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-base md:text-lg font-black text-gray-900">Submit Documents</h3>
                            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">Please ensure all information is accurate</p>
                        </div>
                        <div className="p-5 md:p-8">
                            {error && (
                                <div className="mb-6 md:mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs md:text-sm text-red-800 font-bold">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-5 md:space-y-6">
                                    <div>
                                        <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5">National Identity Number (NIN)</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none">
                                                <FileText className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                name="nin"
                                                value={formData.nin}
                                                onChange={handleChange}
                                                placeholder="Enter 11-digit NIN"
                                                className="w-full pl-12 md:pl-14 pr-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-2 border-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-sm md:text-base"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5">Bank Verification Number (BVN)</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none">
                                                <ShieldCheck className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                name="bvn"
                                                value={formData.bvn}
                                                onChange={handleChange}
                                                placeholder="Enter 11-digit BVN"
                                                className="w-full pl-12 md:pl-14 pr-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-2 border-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-sm md:text-base"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5">Name on NIN</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                name="ninName"
                                                value={formData.ninName}
                                                onChange={handleChange}
                                                placeholder="Enter full name as it appears on NIN"
                                                className="w-full pl-12 md:pl-14 pr-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-2 border-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-sm md:text-base"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5">Date of Birth</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none">
                                                <Calendar className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                            </div>
                                            <input
                                                type="date"
                                                name="dob"
                                                value={formData.dob}
                                                onChange={handleChange}
                                                className="w-full pl-12 md:pl-14 pr-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-2 border-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-sm md:text-base"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5">Identity Document</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="idCard"
                                                name="idCard"
                                                className="hidden"
                                                onChange={handleFileChange}
                                                accept="image/*,.pdf"
                                                required
                                            />
                                            <label htmlFor="idCard" className="flex flex-col items-center justify-center w-full p-6 md:p-10 border-2 border-dashed border-gray-200 rounded-xl md:rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer group">
                                                <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                                                    <Upload size={24} className="text-gray-400 group-hover:text-green-600 transition-colors" />
                                                </div>
                                                <p className="text-sm font-black text-gray-700 group-hover:text-green-700 transition-colors text-center px-4">
                                                    {formData.idCard ? formData.idCard : 'Click to upload ID Document'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                                                    JPG, PNG or PDF (Max 5MB)
                                                </p>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-2.5">
                                            Other Documents <span className="text-gray-400 font-black text-[9px] ml-1">(Optional)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="otherDocs"
                                                name="otherDocs"
                                                className="hidden"
                                                onChange={handleFileChange}
                                                accept="image/*,.pdf"
                                            />
                                            <label htmlFor="otherDocs" className="flex items-center gap-4 w-full p-4 md:p-5 border-2 border-gray-100 rounded-xl md:rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group">
                                                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-50 transition-colors">
                                                    <Upload size={18} className="text-gray-400 group-hover:text-green-600 transition-colors" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-700 truncate">
                                                        {formData.otherDocs ? formData.otherDocs : 'Upload Utility Bill or other docs'}
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !formData.nin || !formData.bvn || !formData.ninName || !formData.dob || !formData.idCard}
                                    className="w-full py-4 md:py-5 bg-green-600 hover:bg-green-700 text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-xl shadow-green-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1 active:translate-y-0"
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Submit for Verification
                                            <ArrowRight size={22} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-blue-50 rounded-2xl p-6 md:p-8 border border-blue-100 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-50"></div>
                        <h3 className="text-xs md:text-sm font-black text-blue-900 mb-6 flex items-center gap-2 uppercase tracking-wider relative z-10">
                            <Info size={16} className="text-blue-600" />
                            Why verify?
                        </h3>
                        <div className="space-y-6 relative z-10">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Zap size={18} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-tight">Unlock Live Mode</p>
                                    <p className="text-[10px] md:text-xs text-gray-500 mt-1 font-medium leading-relaxed">Start processing real payments and payouts instantly.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <CreditCard size={18} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-tight">Virtual Accounts</p>
                                    <p className="text-[10px] md:text-xs text-gray-500 mt-1 font-medium leading-relaxed">Generate dedicated bank accounts for your customers.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <ShieldCheck size={18} className="text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-tight">Higher Limits</p>
                                    <p className="text-[10px] md:text-xs text-gray-500 mt-1 font-medium leading-relaxed">Increase your transaction and withdrawal limits significantly.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
                        <h4 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-5">Accepted Documents</h4>
                        <ul className="space-y-4">
                            {['National ID Card', 'International Passport', 'Driver\'s License', 'Voter\'s Card'].map((doc) => (
                                <li key={doc} className="flex items-center gap-3 text-xs md:text-sm text-gray-700 font-bold">
                                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm shadow-green-200"></div>
                                    {doc}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
