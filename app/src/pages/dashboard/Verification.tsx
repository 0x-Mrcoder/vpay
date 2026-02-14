import React, { useState } from 'react';
import api from '../../services/api';
import {
    Upload,
    AlertCircle,
    Clock,
    CheckCircle2,
    ShieldCheck,
    Info,
    Lock,
    User,
    Zap,
    RefreshCw,
    MapPin,
    Building2,
    Briefcase,
    Hash,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { NIGERIAN_STATES } from '../../data/nigeria';

export const Verification: React.FC = () => {
    const { user, updateUser } = useAuth();

    // Steps: 1 = Personal Info, 2 = Identity, 3 = Documents
    const [step, setStep] = useState(1);
    const [isBusinessUpgrade, setIsBusinessUpgrade] = useState(false);

    const [formData, setFormData] = useState({
        // Step 1
        state: user?.state || '',
        lga: user?.lga || '',
        address: user?.address || '',
        // Step 2
        identityType: user?.identityType || '',
        bvn: user?.bvn || '',
        nin: user?.nin || '',
        dob: '', // Not strictly needed for backend if we trust NIN/BVN verification, but good for UI
        // Step 3
        idCard: user?.idCardPath || '',
        selfie: user?.selfiePath || '',
        otherDocs: '',

        // Business Upgrade
        businessName: user?.businessName || '',
        businessAddress: user?.businessAddress || '',
        businessPhone: user?.businessPhone || '',
        rcNumber: user?.rcNumber || '',
        cacDocument: user?.cacDocumentPath || ''
    });

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Derived state for dropdowns
    const availableLgas = NIGERIAN_STATES.find(s => s.name === formData.state)?.lgas || [];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');

        // Reset LGA if state changes
        if (e.target.name === 'state') {
            setFormData(prev => ({ ...prev, state: e.target.value, lga: '' }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, [e.target.name]: e.target.files[0].name });
        }
    };

    const handleNext = () => {
        setError('');
        if (step === 1) {
            if (!formData.state || !formData.lga || !formData.address) {
                setError('Please complete all fields in this step.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!formData.identityType || !formData.bvn) {
                setError('Please select identity type and enter BVN.');
                return;
            }
            if (formData.identityType === 'National ID Card' && !formData.nin) {
                setError('Please enter your NIN.');
                return;
            }
            setStep(3);
        }
    };

    const handleBack = () => {
        setError('');
        setStep(prev => prev - 1);
    };

    const handleSubmitKYC = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await api.post('/kyc/submit', {
                state: formData.state,
                lga: formData.lga,
                address: formData.address,
                bvn: formData.bvn,
                nin: formData.nin,
                identityType: formData.identityType,
                idCard: formData.idCard,
                selfie: formData.selfie
            });
            if (user) {
                updateUser({
                    ...user,
                    kycLevel: 2,
                    state: formData.state,
                    lga: formData.lga,
                    address: formData.address,

                });
            }
        } catch (err: any) {
            console.error('KYC submission error:', err);
            setError(err.response?.data?.message || 'Failed to submit KYC details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBusinessUpgrade = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await api.post('/kyc/upgrade-business', {
                businessName: formData.businessName,
                businessAddress: formData.businessAddress,
                businessPhone: formData.businessPhone,
                rcNumber: formData.rcNumber,
                cacDocument: formData.cacDocument
            });
            setSuccessMsg(res.data.message || 'Business upgrade request submitted!');
            setIsBusinessUpgrade(false); // Close modal/form view
            if (user) {
                updateUser({
                    ...user,
                    businessName: formData.businessName,
                    businessAddress: formData.businessAddress,
                    businessPhone: formData.businessPhone,
                    rcNumber: formData.rcNumber,
                    cacDocumentPath: formData.cacDocument
                });
            }
        } catch (err: any) {
            console.error('Business upgrade error:', err);
            setError(err.response?.data?.message || 'Failed to submit business details.');
        } finally {
            setIsLoading(false);
        }
    };

    // Render Account Suspended
    if (user?.status === 'suspended') {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-6 animate-fade-in">
                <div className="bg-red-50 border border-red-200 rounded-2xl md:rounded-3xl p-6 md:p-10 text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} className="text-red-600 md:w-10 md:h-10" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-red-900 mb-3">Account Suspended</h2>
                    <p className="text-sm md:text-base text-red-700 max-w-md mx-auto leading-relaxed mb-8">
                        Your account has been suspended by the administration. You currently have restricted access to VTStack features.
                    </p>
                    <Link to="/dashboard/help" className="inline-block px-8 py-3 bg-red-600 text-white rounded-xl font-bold">Contact Support</Link>
                </div>
            </div>
        );
    }

    // Render Verified View (Level 3)
    if (user?.kycLevel === 3) {
        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in space-y-8">
                {/* Verified Header */}
                <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl p-8 text-white text-center shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow border border-white/30">
                        <CheckCircle2 size={40} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-black mb-2 relative z-10">Verification Complete</h2>
                    <p className="text-primary-100 max-w-lg mx-auto relative z-10">
                        Maximize your VTStack experience. You have full access to all features.
                    </p>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Info Read-only */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <User size={16} /> Personal Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Full Name</label>
                                <p className="font-bold text-gray-900">{user.fullName || `${user.firstName} ${user.lastName}`}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">State</label>
                                    <p className="font-bold text-gray-900">{user.state || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">LGA</label>
                                    <p className="font-bold text-gray-900">{user.lga || 'N/A'}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Address</label>
                                <p className="font-bold text-gray-900">{user.address || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Business Info / Upgrade */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Briefcase size={16} /> Business Information
                        </h3>

                        {user.businessName ? (
                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">Business Name</label>
                                    <p className="font-bold text-gray-900">{user.businessName}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">RC Number</label>
                                    <p className="font-bold text-gray-900 font-mono">{user.rcNumber}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">Business Address</label>
                                    <p className="font-bold text-gray-900">{user.businessAddress}</p>
                                </div>
                                <div className="pt-4 mt-auto">
                                    <button
                                        onClick={() => setIsBusinessUpgrade(true)}
                                        className="text-primary-600 text-sm font-bold hover:underline flex items-center gap-1"
                                    >
                                        Edit Business Details <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                                <Building2 size={48} className="text-gray-200 mb-3" />
                                <p className="text-gray-500 text-sm font-medium mb-4">Upgrade to a business account to increase limits further.</p>
                                <button
                                    onClick={() => setIsBusinessUpgrade(true)}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary-700 transition-colors"
                                >
                                    Upgrade to Business
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Business Upgrade Modal */}
                {isBusinessUpgrade && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">Business Upgrade</h3>
                                <button onClick={() => setIsBusinessUpgrade(false)} className="text-gray-400 hover:text-gray-600">
                                    <span className="text-2xl">&times;</span>
                                </button>
                            </div>
                            <form onSubmit={handleBusinessUpgrade} className="p-6 space-y-5">
                                {successMsg && (
                                    <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
                                        <CheckCircle2 size={16} /> {successMsg}
                                    </div>
                                )}
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Business Name</label>
                                    <input
                                        type="text" name="businessName" value={formData.businessName} onChange={handleChange} required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 outline-none transition-all text-sm"
                                        placeholder="e.g. VTStack Ventures"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Based Address</label>
                                    <textarea
                                        name="businessAddress" value={formData.businessAddress} onChange={handleChange} required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 outline-none transition-all text-sm"
                                        placeholder="Full business address"
                                        rows={2}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Business Phone</label>
                                        <input
                                            type="tel" name="businessPhone" value={formData.businessPhone} onChange={handleChange} required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 outline-none transition-all text-sm"
                                            placeholder="080..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">RC Number</label>
                                        <input
                                            type="text" name="rcNumber" value={formData.rcNumber} onChange={handleChange} required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 outline-none transition-all text-sm"
                                            placeholder="RC123456"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Upload CAC Document</label>
                                    <div className="relative">
                                        <input type="file" name="cacDocument" id="cacDocument" className="hidden" onChange={handleFileChange} accept=".pdf,image/*" />
                                        <label htmlFor="cacDocument" className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                                            <Upload size={18} className="text-gray-400" />
                                            <span className="text-sm text-gray-600 font-medium">
                                                {formData.cacDocument || 'Click to Upload CAC Cert'}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="submit" disabled={isLoading}
                                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-md mt-4"
                                >
                                    {isLoading ? 'Submitting...' : 'Submit Business Details'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Render KYC Submitted (Level 2)
    if (user?.kycLevel === 2) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-6 animate-fade-in">
                <div className="bg-white border border-amber-100 rounded-2xl md:rounded-3xl p-6 md:p-12 text-center shadow-xl shadow-amber-50 relative overflow-hidden">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock size={40} className="text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Verification In Review</h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        We are strictly reviewing your documents. This usually takes 24-48 hours. You will be notified once approved.
                    </p>

                    {/* Read Only Data Preview */}
                    <div className="bg-gray-50 rounded-xl p-6 text-left max-w-lg mx-auto border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">Submitted Information</h3>
                            <button onClick={() => updateUser({ ...user, kycLevel: 0 })} className="text-xs text-primary-600 font-bold hover:underline">Edit</button>
                        </div>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                            <div><span className="text-gray-500 block text-xs">Full Name</span> <span className="font-bold">{user.fullName || `${user.firstName} ${user.lastName}`}</span></div>
                            <div><span className="text-gray-500 block text-xs">State/LGA</span> <span className="font-bold">{user.state} / {user.lga}</span></div>
                            <div className="col-span-2"><span className="text-gray-500 block text-xs">Address</span> <span className="font-bold">{user.address}</span></div>
                            <div><span className="text-gray-500 block text-xs">ID Type</span> <span className="font-bold">{user.identityType}</span></div>
                            <div><span className="text-gray-500 block text-xs">BVN</span> <span className="font-bold">*******{user.bvn?.slice(-4)}</span></div>
                        </div>
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
                        className="mt-6 text-gray-500 text-sm font-bold flex items-center justify-center gap-2 hover:text-gray-700"
                    >
                        <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Check Status
                    </button>
                </div>
            </div>
        );
    }

    // Default: Verification Wizard (Level 0 or 1)
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-10 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Complete Your KYC</h1>
                    <p className="text-sm text-gray-500 mt-1">Unlock higher limits and virtual accounts in 3 simple steps.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-8 rounded-full ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                    <div className={`h-2 w-8 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                    <div className={`h-2 w-8 rounded-full ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
                        {/* Progress Header */}
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">
                                {step === 1 && 'Step 1: Personal Information'}
                                {step === 2 && 'Step 2: Identity Verification'}
                                {step === 3 && 'Step 3: Document Upload'}
                            </h3>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step {step} of 3</span>
                        </div>

                        <div className="p-8">
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800 font-bold">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmitKYC} className="space-y-6">
                                {/* STEP 1: Personal Info */}
                                {step === 1 && (
                                    <div className="space-y-5 animate-fade-in">
                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Full Name</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={user?.fullName || `${user?.firstName} ${user?.lastName}`}
                                                    disabled
                                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl border border-gray-200 text-gray-500 font-bold cursor-not-allowed"
                                                />
                                                <User className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">State of Residence</label>
                                                <div className="relative">
                                                    <select
                                                        name="state"
                                                        value={formData.state}
                                                        onChange={handleChange}
                                                        className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 outline-none appearance-none font-medium text-gray-900"
                                                    >
                                                        <option value="">Select State</option>
                                                        {NIGERIAN_STATES.map(s => (
                                                            <option key={s.name} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                    <MapPin className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={18} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Local Govt. Area</label>
                                                <div className="relative">
                                                    <select
                                                        name="lga"
                                                        value={formData.lga}
                                                        onChange={handleChange}
                                                        className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 outline-none appearance-none font-medium text-gray-900"
                                                        disabled={!formData.state}
                                                    >
                                                        <option value="">Select LGA</option>
                                                        {availableLgas.map(lga => (
                                                            <option key={lga} value={lga}>{lga}</option>
                                                        ))}
                                                    </select>
                                                    <MapPin className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={18} />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Residential Address</label>
                                            <textarea
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                className="w-full p-4 rounded-xl border border-gray-200 focus:border-primary-500 outline-none font-medium text-gray-900 transition-all"
                                                placeholder="House Number, Street Name"
                                                rows={3}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">City / Town</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 outline-none font-medium text-gray-900"
                                                placeholder="Enter City"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: Identity */}
                                {step === 2 && (
                                    <div className="space-y-5 animate-fade-in">
                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Identity Type</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['National ID Card', 'NIN Slip', 'Voter\'s Card', 'Intl. Passport', 'Driver\'s License'].map(type => (
                                                    <label key={type} className={`
                                                        cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-center text-center text-sm font-bold
                                                        ${formData.identityType === type
                                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                            : 'border-gray-100 hover:border-gray-200 text-gray-600'}
                                                    `}>
                                                        <input
                                                            type="radio"
                                                            name="identityType"
                                                            value={type}
                                                            checked={formData.identityType === type}
                                                            onChange={handleChange}
                                                            className="hidden"
                                                        />
                                                        {type}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Bank Verification Number (BVN)</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="bvn"
                                                    value={formData.bvn}
                                                    onChange={handleChange}
                                                    placeholder="Enter 11-digit BVN"
                                                    maxLength={11}
                                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 outline-none font-mono font-medium"
                                                />
                                                <ShieldCheck className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1">We only use this to verify your full name and date of birth.</p>
                                        </div>

                                        {(formData.identityType === 'National ID Card' || formData.identityType === 'NIN Slip') && (
                                            <div>
                                                <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">NIN Number</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="nin"
                                                        value={formData.nin}
                                                        onChange={handleChange}
                                                        placeholder="Enter 11-digit NIN"
                                                        maxLength={11}
                                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 outline-none font-mono font-medium"
                                                    />
                                                    <Hash className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 3: Documents */}
                                {step === 3 && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                                            <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                                            <div>
                                                <h4 className="text-sm font-bold text-blue-900">Document Requirements</h4>
                                                <ul className="text-xs text-blue-800 mt-1 space-y-1 list-disc pl-4">
                                                    <li>Upload a clear picture of your {formData.identityType || 'ID Document'}.</li>
                                                    <li>Ensure all corners are visible.</li>
                                                    <li>Max file size: 5MB. Formats: JPG, PNG.</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Upload {formData.identityType}</label>
                                            <div className="relative">
                                                <input type="file" name="idCard" id="idCard" className="hidden" onChange={handleFileChange} accept="image/*" required />
                                                <label htmlFor="idCard" className="flex flex-col items-center justify-center w-full p-10 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-50 cursor-pointer transition-all">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                        <Upload size={24} className="text-gray-400" />
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-600">
                                                        {formData.idCard ? formData.idCard : 'Click to Upload Image'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">Supported: JPG, PNG</p>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Upload Selfie Image</label>
                                            <div className="relative">
                                                <input type="file" name="selfie" id="selfie" className="hidden" onChange={handleFileChange} accept="image/*" required />
                                                <label htmlFor="selfie" className="flex flex-col items-center justify-center w-full p-10 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-50 cursor-pointer transition-all">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                        <User size={24} className="text-gray-400" />
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-600">
                                                        {formData.selfie ? formData.selfie : 'Click to Upload Selfie'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">Supported: JPG, PNG</p>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Navigation Actions */}
                                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                                    {step > 1 ? (
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
                                        >
                                            <ChevronLeft size={18} /> Back
                                        </button>
                                    ) : (
                                        <div></div>
                                    )}

                                    {step < 3 ? (
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-2"
                                        >
                                            Next Step <ChevronRight size={18} />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={isLoading || !formData.idCard}
                                            className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />}
                                            Submit Verification
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-4">Why Verify?</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 text-green-600">
                                    <Zap size={16} />
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed font-medium">Activate live payments and start accepting real money from customers.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                                    <Building2 size={16} />
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed font-medium">Create dedicated virtual account numbers for your business.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-600">
                                    <Lock size={16} />
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed font-medium">Remove transaction limits and withdraw funds instantly.</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
