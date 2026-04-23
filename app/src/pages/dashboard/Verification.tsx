import React, { useState } from 'react';
import api from '../../services/api';
import {
    Upload,
    AlertCircle,
    Clock,
    CheckCircle2,
    ShieldCheck,
    Info,
    User,
    Zap,
    RefreshCw,
    MapPin,
    Building2,
    Briefcase,
    Hash,
    ChevronRight,
    ChevronLeft,
    Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { NIGERIAN_STATES } from '../../data/nigeria';

export const Verification: React.FC = () => {
    const { user, refreshUser } = useAuth();

    // Steps: 1 = Personal Info, 2 = Identity, 3 = Documents
    const [step, setStep] = useState(1);
    const [isBusinessUpgrade, setIsBusinessUpgrade] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [kycSubmitted, setKycSubmitted] = useState(false); // optimistic: flip to Under Review immediately after submit

    const [formData, setFormData] = useState({
        // Step 1
        state: user?.state || '',
        lga: user?.lga || '',
        address: user?.address || '',
        // Step 2
        identityType: user?.identityType || '',
        idNumber: user?.nin || '', // NIN / Voter Card No / License No / Passport No
        bvn: user?.bvn || '',
        nin: user?.nin || '',
        // Step 3
        idCard: user?.idCardPath || '',
        selfie: user?.selfiePath || '',
        utilityBill: user?.utilityBillPath || '',

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

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshUser();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        if (e.target.name === 'state') {
            setFormData(prev => ({ ...prev, state: e.target.value, lga: '' }));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const fieldName = e.target.name;
        if (file) {
            setIsLoading(true);
            setError('');
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64 = reader.result as string;
                    const res = await api.post('/kyc/upload', {
                        file: base64,
                        folder: isBusinessUpgrade ? `business/${user?.id}/${fieldName}` : `kyc/${user?.id}/${fieldName}`
                    });
                    setFormData(prev => ({ ...prev, [fieldName]: res.data.url }));
                } catch (err: any) {
                    setError('Failed to upload document. Please check your connection.');
                    console.error('Upload error:', err);
                } finally {
                    setIsLoading(false);
                }
            };
            reader.readAsDataURL(file);
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
                nin: formData.idNumber,  // maps idNumber → nin on backend
                identityType: formData.identityType,
                idCard: formData.idCard,
                selfie: formData.selfie,
                utilityBill: formData.utilityBill
            });
            // Mark submitted immediately so UI transitions to Under Review
            setKycSubmitted(true);
            await refreshUser();
        } catch (err: any) {
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
                cacDocument: formData.cacDocument,
                utilityBill: formData.utilityBill
            });
            setSuccessMsg(res.data.message || 'Business upgrade request submitted!');
            setIsBusinessUpgrade(false);
            await refreshUser();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit business details.');
        } finally {
            setIsLoading(false);
        }
    };

    // Safety check - if user is not loaded
    if (!user) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>;

    // 1. Account Suspended
    if (user.status === 'suspended') {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-6 animate-fade-in">
                <div className="bg-red-50 border border-red-200 rounded-3xl p-10 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={40} className="text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-red-900 mb-3">Account Suspended</h2>
                    <p className="text-red-700 max-w-md mx-auto leading-relaxed mb-8">
                        Your account has been suspended by the administration. Please contact support.
                    </p>
                    <Link to="/dashboard/help" className="inline-block px-8 py-3 bg-red-600 text-white rounded-xl font-bold">Contact Support</Link>
                </div>
            </div>
        );
    }

    // 2. Personal KYC In Review — either already submitted (has bvn) or just submitted this session
    if ((user.kyc_status === 'pending' && user.kycLevel < 2 && user.bvn) || kycSubmitted) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-6 animate-fade-in">
                <div className="bg-white border border-amber-100 rounded-3xl p-12 text-center shadow-xl shadow-amber-50 relative overflow-hidden">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock size={40} className="text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Verification In Review</h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Our compliance team is reviewing your personal documents. This usually takes 24 hours.
                    </p>
                    <div className="bg-gray-50 rounded-xl p-6 text-left max-w-lg mx-auto border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">Documents Provided</h3>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">PENDING APPROVAL</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                            <div><span className="text-gray-500 block text-xs">ID Type</span> <span className="font-bold">{user.identityType || 'N/A'}</span></div>
                            <div><span className="text-gray-500 block text-xs">BVN</span> <span className="font-bold">*******{(user.bvn || '').slice(-4)}</span></div>
                            <div><span className="text-gray-500 block text-xs">State</span> <span className="font-bold">{user.state || 'Processing...'}</span></div>
                            <div><span className="text-gray-500 block text-xs">LGA</span> <span className="font-bold">{user.lga || 'Processing...'}</span></div>
                        </div>
                    </div>
                    <button onClick={handleRefresh} disabled={isRefreshing} className="mt-6 text-gray-500 text-sm font-bold flex items-center justify-center gap-2 hover:text-gray-700 transition-colors mx-auto">
                        <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? 'Checking...' : 'Refresh Status'}
                    </button>
                </div>
            </div>
        );
    }

    // 3. Fully Verified or Tier 2/T3 Verified
    if (user.kycLevel >= 2 || user.kyc_tier === 't2' || user.kyc_tier === 't3') {
        const isT3 = user.kyc_tier === 't3';
        const isT2 = user.kyc_tier === 't2';

        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in space-y-8">
                {/* Verified Header */}
                <div className={`rounded-[2.5rem] p-10 text-white text-center shadow-2xl relative overflow-hidden transition-all duration-700 ${isT3 ? 'bg-slate-950 border-b-8 border-slate-800' : isT2 ? 'bg-primary-600 border-b-8 border-primary-800' : 'bg-indigo-600 border-b-8 border-indigo-800'}`}>
                    {/* Background decorative elements */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>

                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white/20 shadow-2xl backdrop-blur-md transition-transform hover:scale-110 duration-500 ${isT3 ? 'bg-amber-400/20 text-amber-400 border-amber-400/30' : 'bg-white/20 text-white border-white/30'}`}>
                        {isT3 ? <ShieldCheck size={48} /> : <CheckCircle2 size={48} />}
                    </div>

                    <div className="relative z-10">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block ${isT3 ? 'bg-amber-400 text-slate-950' : 'bg-white text-primary-600'}`}>
                            {isT3 ? 'Corporate Tier' : isT2 ? 'Personnel Tier' : 'Standard Tier'}
                        </span>
                        <h2 className="text-4xl font-black mb-3 tracking-tight">
                            {isT3 ? 'Business Verified (T3)' : 'Personal Verified (T2)'}
                        </h2>
                        <p className={`max-w-lg mx-auto font-medium text-lg ${isT3 ? 'text-slate-400' : 'text-white/80'}`}>
                            {isT3 ? 'Your account has full programmatic payout access.' : 'Upgrade to Tier 3 Business to unlock Payout APIs.'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Info */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-gray-200/50 transition-all group">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <User size={16} className="text-primary-500" /> Personal Information
                            </h3>
                            <CheckCircle2 size={18} className="text-green-500" />
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-gray-50 group-hover:bg-white group-hover:border-primary-100 transition-all">
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-tighter block mb-1">Legal Full Name</label>
                                <p className="font-black text-gray-900 text-lg uppercase">{user.fullName || `${user.firstName} ${user.lastName}`}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-gray-50 group-hover:bg-white group-hover:border-primary-100 transition-all">
                                    <label className="text-[10px] text-gray-400 font-black uppercase tracking-tighter block mb-1">State</label>
                                    <p className="font-black text-gray-900">{user.state || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-gray-50 group-hover:bg-white group-hover:border-primary-100 transition-all">
                                    <label className="text-[10px] text-gray-400 font-black uppercase tracking-tighter block mb-1">LGA</label>
                                    <p className="font-black text-gray-900">{user.lga || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-green-600 text-[10px] font-black uppercase tracking-[0.2em] bg-green-50/50 py-2 rounded-xl">
                                <ShieldCheck size={12} /> Personal Docs Verified
                            </div>
                        </div>
                    </div>

                    {/* Business Column */}
                    <div className={`rounded-3xl border p-8 shadow-xl transition-all group relative overflow-hidden flex flex-col ${isT3 ? 'bg-white border-amber-100 shadow-amber-50' : 'bg-white border-gray-100 shadow-gray-100/50'}`}>
                        {isT3 && <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full -mr-12 -mt-12"></div>}

                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={16} className={isT3 ? 'text-amber-500' : 'text-gray-400'} /> Business Status
                            </h3>
                            {isT3 && <Zap size={18} className="text-amber-500 fill-amber-500" />}
                        </div>

                        {user.payoutRequestStatus === 'pending' ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                    <Clock size={32} className="text-amber-500 animate-pulse" />
                                </div>
                                <h4 className="text-amber-900 font-black text-sm uppercase tracking-tight">Upgrade Under Review</h4>
                                <div className="mt-4 text-left w-full px-6 space-y-3">
                                    <div>
                                        <label className="text-[10px] text-amber-600 font-bold uppercase block">Business Name</label>
                                        <p className="text-xs font-black text-slate-800">{user.businessName}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-amber-600 font-bold uppercase block">RC Number</label>
                                        <p className="text-xs font-black text-slate-800">{user.rcNumber}</p>
                                    </div>
                                </div>
                                <button onClick={handleRefresh} disabled={isRefreshing} className="mt-6 px-8 py-3 bg-white border-2 border-amber-200 text-amber-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-amber-50 transition-all">
                                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? 'Verifying...' : 'Refresh Status'}
                                </button>
                            </div>
                        ) : isT3 ? (
                            <div className="space-y-6 flex-1 flex flex-col">
                                <div className="p-4 bg-amber-50/30 rounded-2xl border border-amber-50 group-hover:bg-amber-50/50 group-hover:border-amber-100 transition-all">
                                    <label className="text-[10px] text-amber-600 font-black uppercase tracking-tighter block mb-1">Registered Business Name</label>
                                    <p className="font-black text-slate-900 text-lg uppercase">{user.businessName}</p>
                                </div>

                                <div className="p-4 bg-amber-50/30 rounded-2xl border border-amber-50 group-hover:bg-amber-50/50 group-hover:border-amber-100 transition-all">
                                    <label className="text-[10px] text-amber-600 font-black uppercase tracking-tighter block mb-1">RC Number / Registration</label>
                                    <p className="font-black text-slate-900 font-mono text-lg tracking-widest">{user.rcNumber}</p>
                                </div>

                                <div className="mt-auto pt-6 flex items-center justify-center gap-3 text-amber-600 bg-amber-50 rounded-2xl py-4 border border-amber-100/50">
                                    <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-200">
                                        <Zap size={18} className="text-slate-900 fill-slate-900" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Payout Access</p>
                                        <p className="text-[10px] font-bold uppercase text-amber-600">ACTIVATED & PROGRAMMATIC</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Building2 size={40} className="text-gray-200" />
                                </div>
                                <h4 className="text-gray-900 font-black text-lg mb-2">Corporate Upgrade</h4>
                                <p className="text-gray-400 text-xs font-medium mb-8 px-6 leading-relaxed">
                                    Accept massive API payouts and unlock corporate-scale limits for your business.
                                </p>
                                <button
                                    onClick={() => setIsBusinessUpgrade(true)}
                                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all hover:-translate-y-1 active:translate-y-0"
                                >
                                    GET TIER 3 ACCESS
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Business Modal */}
                {isBusinessUpgrade && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Business Upgrade (T3)</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Corporate verification</p>
                                </div>
                                <button onClick={() => setIsBusinessUpgrade(false)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm transition-all">
                                    <span className="text-xl">&times;</span>
                                </button>
                            </div>
                            <form onSubmit={handleBusinessUpgrade} className="p-6 space-y-5">
                                {successMsg && (
                                    <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl flex items-center gap-2">
                                        <CheckCircle2 size={16} /> {successMsg}
                                    </div>
                                )}
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-center gap-2 animate-shake">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Registered Business Name</label>
                                    <div className="relative">
                                        <input
                                            type="text" name="businessName" value={formData.businessName} onChange={handleChange} required
                                            className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                                            placeholder="e.g. VTStack Ventures"
                                        />
                                        <Building2 size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Business Physical Address</label>
                                    <div className="relative">
                                        <input
                                            type="text" name="businessAddress" value={formData.businessAddress} onChange={handleChange} required
                                            className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                                            placeholder="Full business address"
                                        />
                                        <MapPin size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">RC Number (CAC)</label>
                                        <div className="relative">
                                            <input
                                                type="text" name="rcNumber" value={formData.rcNumber} onChange={handleChange} required
                                                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 outline-none transition-all text-sm font-mono font-bold"
                                                placeholder="RC123456"
                                            />
                                            <Hash size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Company Phone</label>
                                        <input
                                            type="tel" name="businessPhone" value={formData.businessPhone} onChange={handleChange} required
                                            className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                                            placeholder="080..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">CAC Certificate (PDF/Image)</label>
                                    <div className="relative">
                                        <input type="file" name="cacDocument" id="cacDocument" className="hidden" onChange={handleFileChange} />
                                        <label htmlFor="cacDocument" className="flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-gray-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                                            {formData.cacDocument && formData.cacDocument.startsWith('data:') ? (
                                                <CheckCircle2 className="text-green-500" size={20} />
                                            ) : (
                                                <Upload size={18} className="text-gray-400" />
                                            )}
                                            <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                                                {formData.cacDocument && formData.cacDocument.startsWith('data:') ? 'CAC Certificate Ready' : 'Upload CAC Document'}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Business Utility Bill</label>
                                    <div className="relative">
                                        <input type="file" name="utilityBill" id="bizUtility" className="hidden" onChange={handleFileChange} />
                                        <label htmlFor="bizUtility" className="flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-gray-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                                            {formData.utilityBill && formData.utilityBill.startsWith('data:') ? (
                                                <CheckCircle2 className="text-green-500" size={20} />
                                            ) : (
                                                <Upload size={18} className="text-gray-400" />
                                            )}
                                            <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                                                {formData.utilityBill && formData.utilityBill.startsWith('data:') ? 'Utility Bill Ready' : 'Upload Utility Bill'}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="submit" disabled={isLoading}
                                    className="w-full py-4 bg-gray-900 border-b-4 border-gray-700 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-gray-200 mt-4 active:translate-y-1 active:border-b-0"
                                >
                                    {isLoading ? 'UPGRADING...' : 'SUBMIT UPGRADE REQUEST'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 4. Default: Verification Wizard (Step 1-3)
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 pb-20 animate-fade-in">
            {/* T1 Verified Banner */}
            {(user.kycLevel === 1 || user.kyc_tier === 't1') && (
                <div className="bg-green-50 border border-green-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                            <CheckCircle2 size={24} className="text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-green-900 font-black text-lg tracking-tight">Tier 1 (T1) Approved</h3>
                            <p className="text-green-700 text-sm font-medium mt-1">Your email is verified. Please submit your Tier 2 details below for review.</p>
                        </div>
                    </div>
                    <span className="px-4 py-1.5 bg-green-200 text-green-800 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0">
                        T1 Active
                    </span>
                </div>
            )}

            {/* Steps Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-primary-600/5 rounded-full -mr-16 -mt-16"></div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Personal Verification</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium italic">Complete Tier 2 verification to unlock Nigerian virtual accounts and higher limits.</p>
                </div>
                <div className="flex items-center gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-2.5 rounded-full transition-all duration-500 ${step >= i ? 'w-10 bg-primary-600 shadow-md shadow-primary-100' : 'w-6 bg-gray-100'}`}></div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center font-bold">
                            <span className="text-gray-900 italic">
                                {step === 1 && 'Home Address & Location'}
                                {step === 2 && 'Identity Documents (BVN)'}
                                {step === 3 && 'Photography & Proof'}
                            </span>
                            <span className="text-[10px] text-primary-600 bg-primary-100 px-3 py-1 rounded-full uppercase tracking-tighter">Phase {step}</span>
                        </div>

                        <div className="p-8">
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 animate-shake">
                                    <AlertCircle size={20} className="text-red-600 shrink-0" />
                                    <p className="text-sm text-red-800 font-black">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmitKYC} className="space-y-6">
                                {step === 1 && (
                                    <div className="space-y-5 animate-fade-in">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Legal State of Residence</label>
                                            <div className="relative">
                                                <select
                                                    name="state" value={formData.state} onChange={handleChange}
                                                    className="w-full pl-4 pr-10 py-4 rounded-2xl border border-gray-100 focus:border-primary-500 outline-none appearance-none font-bold text-gray-900 bg-slate-50 transition-all hover:bg-white"
                                                >
                                                    <option value="">Select Resident State</option>
                                                    {NIGERIAN_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                                </select>
                                                <MapPin className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Local Government Area (LGA)</label>
                                            <div className="relative">
                                                <select
                                                    name="lga" value={formData.lga} onChange={handleChange}
                                                    className="w-full pl-4 pr-10 py-4 rounded-2xl border border-gray-100 focus:border-primary-500 outline-none appearance-none font-bold text-gray-900 bg-slate-50 transition-all hover:bg-white"
                                                    disabled={!formData.state}
                                                >
                                                    <option value="">Select LGA</option>
                                                    {availableLgas.map(lga => <option key={lga} value={lga}>{lga}</option>)}
                                                </select>
                                                <MapPin className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Full Residential Address</label>
                                            <textarea
                                                name="address" value={formData.address} onChange={handleChange}
                                                className="w-full p-4 rounded-2xl border border-gray-100 focus:border-primary-500 outline-none font-bold text-gray-900 bg-slate-50 transition-all hover:bg-white placeholder:text-gray-300"
                                                placeholder="Street Name, Building Number..." rows={3}
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Select Identity Document</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {['National ID Card', 'Driver\'s License', 'Voter\'s Card', 'Intl. Passport'].map(type => (
                                                    <label key={type} className={`
                                                        cursor-pointer p-4 rounded-2xl border-2 flex items-center gap-3 transition-all
                                                        ${formData.identityType === type ? 'border-primary-600 bg-primary-100 text-primary-900 shadow-md' : 'border-gray-50 hover:border-gray-200 bg-slate-50'}
                                                    `}>
                                                        <input type="radio" name="identityType" value={type} checked={formData.identityType === type} onChange={handleChange} className="hidden" />
                                                        <ShieldCheck size={18} className={formData.identityType === type ? 'text-primary-700' : 'text-gray-300'} />
                                                        <span className="text-xs font-black uppercase">{type}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dynamic ID Number Field based on identity type */}
                                        {formData.identityType && (
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                                    {formData.identityType === 'National ID Card' ? 'National Identification Number (NIN)' :
                                                     formData.identityType === 'Driver\'s License' ? "Driver's License Number" :
                                                     formData.identityType === 'Voter\'s Card' ? 'Voter Registration Number (VIN)' :
                                                     formData.identityType === 'Intl. Passport' ? 'Passport Number' : 'ID Number'}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="idNumber"
                                                        value={formData.idNumber}
                                                        onChange={handleChange}
                                                        placeholder={
                                                            formData.identityType === 'National ID Card' ? 'Enter your 11-digit NIN' :
                                                            formData.identityType === 'Driver\'s License' ? 'Enter license number (e.g. AAA00000AA00)' :
                                                            formData.identityType === 'Voter\'s Card' ? 'Enter Voter ID Number (VIN)' :
                                                            formData.identityType === 'Intl. Passport' ? 'Enter passport number (e.g. A12345678)' : 'Enter ID number'
                                                        }
                                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:border-primary-500 outline-none font-mono font-bold tracking-wider bg-slate-50"
                                                    />
                                                    <Hash className="absolute left-4 top-4 text-gray-400" size={20} />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Bank Verification Number (BVN — 11 Digits)</label>
                                            <div className="relative">
                                                <input
                                                    type="text" name="bvn" value={formData.bvn} onChange={handleChange} placeholder="00000000000" maxLength={11}
                                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:border-primary-500 outline-none font-mono font-black text-lg tracking-widest bg-slate-50"
                                                />
                                                <Hash className="absolute left-4 top-4.5 text-gray-400" size={20} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="bg-primary-50 border border-primary-100 p-5 rounded-2xl flex items-start gap-4">
                                            <Info size={24} className="text-primary-600 shrink-0" />
                                            <p className="text-xs text-primary-900 font-medium leading-relaxed italic">
                                                "Ensure your selfie matches the ID card you provide. Images must be clear without glare or shadows."
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Identity Card Image</label>
                                                <input type="file" name="idCard" id="idCard" className="hidden" onChange={handleFileChange} />
                                                <label htmlFor="idCard" className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-gray-100 rounded-3xl cursor-pointer hover:bg-white transition-all overflow-hidden group">
                                                    {formData.idCard ? <CheckCircle2 className="text-green-500 mb-2" /> : <Upload className="text-gray-300 mb-2 group-hover:text-primary-400 transition-colors" />}
                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500">{formData.idCard ? 'Selected' : 'Click to Upload'}</span>
                                                </label>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Live Selfie Photo</label>
                                                <input type="file" name="selfie" id="selfie" className="hidden" onChange={handleFileChange} />
                                                <label htmlFor="selfie" className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-gray-100 rounded-3xl cursor-pointer hover:bg-white transition-all overflow-hidden group">
                                                    {formData.selfie ? <CheckCircle2 className="text-green-500 mb-2" /> : <User className="text-gray-300 mb-2 group-hover:text-primary-400 transition-colors" />}
                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500">{formData.selfie ? 'Selected' : 'Click to Upload'}</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Utility Bill (Proof of Address)</label>
                                            <input type="file" name="utilityBill" id="personalUtility" className="hidden" onChange={handleFileChange} />
                                            <label htmlFor="personalUtility" className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-gray-100 rounded-3xl cursor-pointer hover:bg-white transition-all overflow-hidden group">
                                                {formData.utilityBill ? <CheckCircle2 className="text-green-500 mb-2" /> : <MapPin className="text-gray-300 mb-2 group-hover:text-primary-400 transition-colors" />}
                                                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500">{formData.utilityBill ? 'Selected' : 'Click to Upload'}</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8 mt-10 border-t border-gray-50 flex items-center justify-between">
                                    {step > 1 ? (
                                        <button type="button" onClick={handleBack} className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-gray-900 transition-colors">
                                            <ChevronLeft size={20} /> PREVIOUS
                                        </button>
                                    ) : <div />}

                                    {step < 3 ? (
                                        <button
                                            type="button" onClick={handleNext}
                                            className="px-10 py-4 bg-gray-900 border-b-4 border-gray-700 text-white rounded-2xl font-black text-sm hover:shadow-xl transition-all flex items-center gap-3 active:translate-y-1 active:border-b-0"
                                        >
                                            PROCEED <ChevronRight size={20} />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit" disabled={isLoading || !formData.idCard || !formData.selfie || !formData.utilityBill}
                                            className="px-10 py-4 bg-primary-600 border-b-4 border-primary-800 text-white rounded-2xl font-black text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3 disabled:opacity-50 active:translate-y-1 active:border-b-0"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                                            FINALIZE VERIFICATION
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                        <Zap className="absolute -right-4 -top-4 text-white/10" size={120} />
                        <h4 className="text-xl font-black mb-4 flex items-center gap-2">
                            Full Control
                        </h4>
                        <div className="space-y-5">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center text-xs font-black">1</div>
                                <p className="text-xs text-indigo-100 font-medium leading-relaxed italic">"Get unlimited virtual accounts."</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center text-xs font-black">2</div>
                                <p className="text-xs text-indigo-100 font-medium leading-relaxed italic">"Withdraw to 100+ Banks."</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center text-xs font-black">3</div>
                                <p className="text-xs text-indigo-100 font-medium leading-relaxed italic">"Access REST API keys."</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
