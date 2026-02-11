import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ArrowRight,
    Send,
    ShieldCheck,
    Loader2,
    Wallet,
    Search,
    Clock,
    XCircle,
    History,
    Info,
    AlertTriangle,
    MessageSquare,
    Sparkles,
    Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Payout: React.FC = () => {
    const [transferData, setTransferData] = useState({
        accountNumber: '',
        bankCode: '',
        amount: '',
        narration: '',
    });
    const [banks, setBanks] = useState<any[]>([]);
    const [isBanksLoading, setIsBanksLoading] = useState(false);
    const [banksError, setBanksError] = useState('');
    const [isTransferLoading, setIsTransferLoading] = useState(false);
    const [transferSuccess, setTransferSuccess] = useState('');
    const [transferError, setTransferError] = useState('');

    // Verification State
    const [recipientName, setRecipientName] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState('');

    // Saved Account State
    const [savedAccount, setSavedAccount] = useState<any>(null);
    const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [showSavedAccount, setShowSavedAccount] = useState(true);
    const [isSavingAccount, setIsSavingAccount] = useState(false);

    const [showConfirmation, setShowConfirmation] = useState(false);

    // Search State
    const [bankSearch, setBankSearch] = useState('');
    const [showBankList, setShowBankList] = useState(false);

    // Wallet State
    const [wallet, setWallet] = useState<any>(null);
    const [isWalletLoading, setIsWalletLoading] = useState(true);

    // Payout History
    const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [fees, setFees] = useState<any>(null);
    const [isCalculatingFees, setIsCalculatingFees] = useState(false);

    useEffect(() => {
        fetchBanks();
        fetchSavedAccount();
        fetchWallet();
        fetchPayoutHistory();
    }, []);

    useEffect(() => {
        const amountNum = parseFloat(transferData.amount);
        if (amountNum >= 100 && savedAccount) {
            const timer = setTimeout(() => {
                calculateFees();
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setFees(null);
        }
    }, [transferData.amount, savedAccount]);

    const calculateFees = async () => {
        setIsCalculatingFees(true);
        try {
            const amountInKobo = Math.round(parseFloat(transferData.amount) * 100);
            if (isNaN(amountInKobo) || amountInKobo <= 0) {
                setFees(null);
                return;
            }
            const response = await api.post('/payout/calculate-fees', {
                amount: amountInKobo,
                accountNumber: savedAccount.accountNumber
            });
            setFees(response.data.data);
        } catch (error) {
            console.error('Error calculating fees:', error);
            setFees(null);
        } finally {
            setIsCalculatingFees(false);
        }
    };

    const fetchWallet = async () => {
        try {
            const response = await api.get('/wallet');
            setWallet(response.data.data);
        } catch (error) {
            console.error('Error fetching wallet:', error);
        } finally {
            setIsWalletLoading(false);
        }
    };

    const fetchPayoutHistory = async () => {
        try {
            const response = await api.get('/payout/history');
            setPayoutHistory(response.data.data);
        } catch (error) {
            console.error('Error fetching payout history:', error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const fetchSavedAccount = async () => {
        try {
            const [legacyRes, multiRes] = await Promise.all([
                api.get('/payout/saved-account'),
                api.get('/payout/saved-accounts')
            ]);

            if (multiRes.data.success && multiRes.data.data.length > 0) {
                const accounts = multiRes.data.data;
                setSavedAccounts(accounts);

                // Set the first one as selected by default if none selected
                if (!selectedAccountId) {
                    const primary = accounts.find((a: any) => a.isPrimary) || accounts[0];
                    setSelectedAccountId(primary._id);
                    setSavedAccount(primary);
                    setTransferData(prev => ({
                        ...prev,
                        bankCode: primary.bankCode || '',
                        accountNumber: primary.accountNumber || ''
                    }));
                    setRecipientName(primary.accountName);
                }
                setShowSavedAccount(true);
            } else if (legacyRes.data.success && legacyRes.data.data) {
                // Fallback to legacy if no multi-accounts yet
                setSavedAccount(legacyRes.data.data);
                setShowSavedAccount(true);
                setTransferData(prev => ({
                    ...prev,
                    bankCode: legacyRes.data.data.bankCode || '',
                    accountNumber: legacyRes.data.data.accountNumber || ''
                }));
                setRecipientName(legacyRes.data.data.accountName);
            } else {
                setShowSavedAccount(false);
            }
        } catch (error) {
            console.error('Error fetching saved accounts:', error);
            setShowSavedAccount(false);
        }
    };



    const handleSelectAccount = (account: any) => {
        setSelectedAccountId(account._id);
        setSavedAccount(account);
        setTransferData(prev => ({
            ...prev,
            bankCode: account.bankCode || '',
            accountNumber: account.accountNumber || ''
        }));
        setRecipientName(account.accountName);
        setShowSavedAccount(true);
    };

    const saveBankDetails = async () => {
        if (!recipientName) return;

        setIsSavingAccount(true);
        setTransferError('');
        try {
            const bankName = banks.find(b => b.code === transferData.bankCode)?.name || '';
            await api.post('/payout/saved-accounts', {
                bankCode: transferData.bankCode,
                bankName,
                accountNumber: transferData.accountNumber,
                accountName: recipientName
            });
            await fetchSavedAccount();
            setTransferSuccess('Account details saved successfully!');
            setShowSavedAccount(true);
            setTimeout(() => setTransferSuccess(''), 3000);
        } catch (error: any) {
            console.error('Error saving bank details:', error);
            setTransferError(error.response?.data?.message || 'Failed to save account details');
        } finally {
            setIsSavingAccount(false);
        }
    };

    const fetchBanks = async () => {
        setIsBanksLoading(true);
        setBanksError('');
        try {
            const response = await api.get('/banks');
            const bankData = response.data.data || response.data;

            if (Array.isArray(bankData)) {
                const sortedBanks = [...bankData].sort((a: any, b: any) =>
                    (a.name || '').localeCompare(b.name || '')
                );
                setBanks(sortedBanks);
            } else {
                setBanksError('Invalid bank data received');
            }
        } catch (error: any) {
            console.error('Error fetching banks:', error);
            setBanksError(error.response?.data?.message || 'Failed to load bank list');
        } finally {
            setIsBanksLoading(false);
        }
    };

    // Auto-verify account when account number and bank code are entered
    useEffect(() => {
        const verifyAccount = async () => {
            // Only verify if we have both account number (10 digits) and bank code
            if (transferData.accountNumber.length === 10 && transferData.bankCode) {
                setIsVerifying(true);
                setVerificationError('');
                setRecipientName('');

                try {
                    const response = await api.post('/payout/verify-account', {
                        accountNumber: transferData.accountNumber,
                        bankCode: transferData.bankCode
                    });

                    if (response.data.success && response.data.data.accountName) {
                        setRecipientName(response.data.data.accountName);
                        setVerificationError('');
                    } else {
                        setVerificationError('Could not verify account');
                    }
                } catch (error: any) {
                    console.error('Account verification error:', error);
                    setVerificationError(error.response?.data?.message || 'Failed to verify account');
                    setRecipientName('');
                } finally {
                    setIsVerifying(false);
                }
            } else {
                // Reset verification state if inputs are incomplete
                setRecipientName('');
                setVerificationError('');
            }
        };

        // Debounce the verification call
        const timer = setTimeout(() => {
            verifyAccount();
        }, 800); // Wait 800ms after user stops typing

        return () => clearTimeout(timer);
    }, [transferData.accountNumber, transferData.bankCode]);

    const handleTransferChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Only allow digits for account number and limit to 10 characters
        if (name === 'accountNumber') {
            const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
            setTransferData({ ...transferData, [name]: digitsOnly });
        } else {
            setTransferData({ ...transferData, [name]: value });
        }
    };

    const handleTransfer = (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();

        if (!savedAccount) {
            setTransferError('Please save your payout account first');
            return;
        }

        // Basic validation
        const amount = parseFloat(transferData.amount);
        if (!amount || amount <= 0) {
            setTransferError('Please enter a valid amount');
            return;
        }

        if (wallet && amount > wallet.clearedBalanceNaira) {
            setTransferError('Insufficient cleared balance');
            return;
        }

        // Show confirmation modal
        setShowConfirmation(true);
    };

    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [transferResult, setTransferResult] = useState<any>(null);

    // ... existing code ...

    const processTransfer = async () => {
        setIsTransferLoading(true);
        setTransferError('');
        setTransferSuccess('');

        try {
            const amountInKobo = Math.round(parseFloat(transferData.amount) * 100);

            const response = await api.post('/payout', {
                accountNumber: savedAccount.accountNumber,
                bankCode: savedAccount.bankCode,
                accountName: savedAccount.accountName,
                amount: amountInKobo,
                narration: transferData.narration,
            });

            setTransferResult(response.data.data);
            setShowSuccessModal(true);
            setTransferData(prev => ({ ...prev, amount: '', narration: '' }));
            setShowConfirmation(false);
            fetchWallet();
            fetchPayoutHistory();
        } catch (err: any) {
            console.error('Transfer error:', err);
            setTransferError(err.response?.data?.message || 'Withdrawal failed');
            setShowConfirmation(false);
        } finally {
            setIsTransferLoading(false);
        }
    };




    const formatCurrency = (amount: number) => {
        if (isNaN(amount) || amount === null || amount === undefined) {
            return '₦0';
        }
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Success Modal Component
    const SuccessModal = () => {
        if (!showSuccessModal || !transferResult) return null;

        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-sm md:max-w-md rounded-3xl shadow-2xl overflow-hidden animate-bounce-in relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>

                    <div className="p-8 pb-6 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm relative">
                            <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-25"></div>
                            <CheckCircle2 size={40} className="text-green-600 relative z-10" />
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 mb-2">Withdrawal Successful!</h2>
                        <p className="text-sm text-gray-500 font-medium mb-6">Your funds are on the way to your bank account.</p>

                        <div className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-100 border-dashed">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount Sent</span>
                                <span className="text-xl font-black text-gray-900">{formatCurrency(transferResult.amount / 100)}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recipient</span>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-900">{transferResult.accountName}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{transferResult.bankName}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reference</span>
                                <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{transferResult.reference}</span>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</span>
                                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    Processing
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 pt-2 bg-white">
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Payout</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Securely withdraw your cleared funds to your bank account</p>
                </div>
                <Link to="/dashboard/wallet" className="w-full md:w-auto px-6 py-3 rounded-xl md:rounded-2xl border border-gray-200 hover:border-green-200 hover:bg-green-50 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold text-gray-700 shadow-sm">
                    <Wallet size={18} className="text-green-600" />
                    Back to Wallet
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Left Column: Form and Balance */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    {/* Balance Card */}
                    <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-white/10 rounded-full -mr-24 md:-mr-32 -mt-24 md:-mt-32 blur-3xl"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-green-100 mb-2">
                                <ShieldCheck size={18} />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Available for Withdrawal</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">
                                {isWalletLoading ? '...' : formatCurrency(wallet?.clearedBalanceNaira || 0)}
                            </h2>
                            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 md:gap-8 pt-6 border-t border-white/10">
                                <div className="flex-1">
                                    <p className="text-green-200 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                        Total Balance
                                        <span title="Your total balance including pending settlements" className="cursor-help">
                                            <Info size={10} />
                                        </span>
                                    </p>
                                    <p className="text-lg md:text-xl font-bold text-white">{isWalletLoading ? '...' : formatCurrency(wallet?.balanceNaira || 0)}</p>
                                </div>
                                <div className="hidden sm:block w-px h-8 bg-white/10"></div>
                                <div className="flex-1">
                                    <p className="text-green-200 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                        Locked Funds
                                        <span title="Funds currently being processed for payout" className="cursor-help">
                                            <Info size={10} />
                                        </span>
                                    </p>
                                    <p className="text-lg md:text-xl font-bold text-white">{isWalletLoading ? '...' : formatCurrency(wallet?.lockedBalanceNaira || 0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transfer Section */}
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-xl md:rounded-2xl flex items-center justify-center">
                                    <Send className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-bold text-gray-900">Withdraw Funds</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">Transfer to your verified bank account</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 md:p-8">
                            {transferSuccess && (
                                <div className="mb-6 md:mb-8 p-4 bg-green-50 border border-green-200 rounded-xl md:rounded-2xl flex items-start gap-3 animate-fade-in">
                                    <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-800 font-bold">{transferSuccess}</p>
                                </div>
                            )}

                            {transferError && (
                                <div className="mb-6 md:mb-8 p-4 bg-red-50 border border-red-200 rounded-xl md:rounded-2xl flex items-start gap-3 animate-fade-in">
                                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800 font-bold">{transferError}</p>
                                </div>
                            )}

                            {savedAccount && showSavedAccount ? (
                                <div className="animate-fade-in space-y-6 md:space-y-8">
                                    {/* Saved Accounts Selection */}
                                    {/* Quick Send Horizontal List */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <Sparkles size={16} className="text-yellow-500 fill-yellow-500" />
                                                Quick Send
                                            </h3>
                                            <button
                                                onClick={() => setShowSavedAccount(false)}
                                                className="text-[10px] font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors flex items-center gap-1 border border-green-100"
                                            >
                                                <Plus size={12} /> New Beneficiary
                                            </button>
                                        </div>

                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                                            {savedAccounts.map((acc) => (
                                                <div
                                                    key={acc._id}
                                                    onClick={() => handleSelectAccount(acc)}
                                                    className={`min-w-[100px] p-3 rounded-2xl border transition-all cursor-pointer relative group flex-shrink-0 flex flex-col items-center text-center gap-2 ${selectedAccountId === acc._id
                                                        ? 'border-green-500 bg-green-50 shadow-md transform scale-105'
                                                        : 'border-gray-100 bg-white hover:border-green-200 hover:shadow-sm'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${selectedAccountId === acc._id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600'
                                                        }`}>
                                                        {acc.accountName.charAt(0)}
                                                    </div>

                                                    <div className="w-full">
                                                        <p className="text-[10px] font-black text-gray-900 truncate w-full leading-tight">{acc.accountName.split(' ')[0]}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 truncate w-full">{acc.bankName}</p>
                                                    </div>

                                                    {selectedAccountId === acc._id && (
                                                        <div className="absolute top-1 right-1">
                                                            <div className="bg-white rounded-full p-0.5">
                                                                <CheckCircle2 size={12} className="text-green-600 fill-green-100" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <form onSubmit={handleTransfer} className="space-y-8 mt-6">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="flex items-center justify-between w-full">
                                                <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400">Enter Amount</label>
                                                {wallet && (
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md cursor-pointer hover:bg-green-100 transition-colors"
                                                        onClick={() => setTransferData({ ...transferData, amount: wallet.clearedBalanceNaira.toString() })}
                                                    >
                                                        Max: {formatCurrency(wallet.clearedBalanceNaira)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="relative group w-full max-w-sm mx-auto">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-3xl sm:text-4xl group-focus-within:text-green-500 transition-colors">₦</span>
                                                <input
                                                    type="number"
                                                    name="amount"
                                                    value={transferData.amount}
                                                    onChange={handleTransferChange}
                                                    min="100"
                                                    required
                                                    placeholder="0"
                                                    className="w-full pl-12 sm:pl-14 pr-4 py-3 bg-transparent border-b-2 border-gray-100 focus:border-green-500 outline-none transition-all font-black text-5xl sm:text-6xl text-center tracking-tighter text-gray-900 placeholder:text-gray-200"
                                                />
                                            </div>

                                            {/* Quick Amount Pills */}
                                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                                {['1000', '2000', '5000', '10000', '20000', '50000'].map((amt) => (
                                                    <button
                                                        key={amt}
                                                        type="button"
                                                        onClick={() => setTransferData({ ...transferData, amount: amt })}
                                                        className="px-3 py-1.5 bg-gray-50 border border-gray-100 hover:border-green-500 hover:bg-green-50 hover:text-green-700 rounded-full text-[10px] sm:text-xs font-bold text-gray-500 transition-all whitespace-nowrap"
                                                    >
                                                        ₦{parseInt(amt).toLocaleString()}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 w-full text-center sm:text-left">
                                                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider mx-auto sm:mx-0">Min: ₦100.00</p>
                                                {wallet && parseFloat(transferData.amount) > wallet.clearedBalanceNaira && (
                                                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1 animate-pulse mx-auto sm:mx-0">
                                                        <AlertTriangle size={12} />
                                                        Insufficient funds
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="relative">
                                                <MessageSquare className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    name="narration"
                                                    value={transferData.narration}
                                                    onChange={handleTransferChange}
                                                    placeholder="Add a note (optional)"
                                                    className="w-full pl-12 pr-6 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-green-100 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-sm text-gray-700 placeholder:text-gray-400"
                                                />
                                            </div>
                                        </div>

                                        {isCalculatingFees && (
                                            <div className="flex items-center justify-center gap-2 py-4 text-xs text-blue-600 font-bold bg-blue-50 rounded-xl border border-blue-100 animate-pulse">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Calculating network fees...
                                            </div>
                                        )}

                                        {fees && !isCalculatingFees && (
                                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 md:p-6 space-y-4 border border-gray-100 shadow-sm animate-scale-up">
                                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount to Send</span>
                                                    <span className="text-base font-black text-gray-900">{formatCurrency(parseFloat(transferData.amount))}</span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Network Fees</span>
                                                            {fees.isInternal && <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded uppercase">Internal</span>}
                                                        </div>
                                                        <span className="text-xs font-bold text-red-500">-{formatCurrency(((fees.vtpayFee || 0) + (fees.providerFee || 0)) / 100)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-3 border-t-2 border-dashed border-gray-200">
                                                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">You Receive</span>
                                                    <span className="text-xl font-black text-green-600">{formatCurrency((fees.netAmount || 0) / 100)}</span>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={(e) => handleTransfer(e)}
                                            disabled={isTransferLoading || !transferData.amount || parseFloat(transferData.amount) <= 0 || (wallet && parseFloat(transferData.amount) > wallet.clearedBalanceNaira)}
                                            className="w-full py-4 md:py-5 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black text-base md:text-lg shadow-xl hover:shadow-2xl mt-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1 active:translate-y-0 relative overflow-hidden group"
                                        >
                                            {isTransferLoading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin relative z-10" />
                                                    <span className="relative z-10">Processing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="relative z-10">Review Withdrawal</span>
                                                    <ArrowRight size={22} className="relative z-10" />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Confirmation Modal */}
                                    {showConfirmation && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                                            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
                                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                                    <h3 className="text-xl font-bold text-gray-900">Confirm Withdrawal</h3>
                                                    <button
                                                        onClick={() => setShowConfirmation(false)}
                                                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                                                    >
                                                        <XCircle size={24} className="text-gray-500" />
                                                    </button>
                                                </div>

                                                <div className="p-6 space-y-6">
                                                    <div className="bg-green-50 rounded-2xl p-6 text-center border border-green-100">
                                                        <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-2">You are sending</p>
                                                        <p className="text-4xl font-black text-green-700 tracking-tight">{formatCurrency(parseFloat(transferData.amount))}</p>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recipient</span>
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-gray-900">{savedAccount?.accountName}</p>
                                                                <p className="text-xs font-bold text-gray-500">{savedAccount?.bankName} - {savedAccount?.accountNumber}</p>
                                                            </div>
                                                        </div>

                                                        {fees && (
                                                            <>
                                                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Fee</span>
                                                                    <span className="text-sm font-bold text-red-500">-{formatCurrency(((fees?.vtpayFee || 0) + (fees?.providerFee || 0)) / 100)}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center py-3">
                                                                    <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Total Debit</span>
                                                                    <span className="text-lg font-black text-gray-900">{formatCurrency((fees?.totalDeducted || 0) / 100)}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3">
                                                        <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
                                                        <p className="text-xs text-yellow-800 font-medium leading-relaxed">
                                                            Please verify the recipient details carefully. Transfers are final and cannot be reversed once processed.
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={processTransfer}
                                                        disabled={isTransferLoading}
                                                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-green-200 flex items-center justify-center gap-3 transition-all"
                                                    >
                                                        {isTransferLoading ? (
                                                            <>
                                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                                Processing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                Confirm & Send
                                                                <Send size={20} />
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="mb-6">
                                        <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <ShieldCheck size={22} className="text-green-600" />
                                            {savedAccount ? 'Update Payout Account' : 'Setup Payout Account'}
                                        </h3>
                                        <p className="text-[10px] md:text-sm text-gray-500 mt-1 font-medium">Link your bank account to start receiving payouts.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-3">Select Bank</label>

                                            <div
                                                onClick={() => !isBanksLoading && setShowBankList(true)}
                                                className={`w-full px-5 md:px-6 py-4 rounded-xl md:rounded-2xl border-2 border-gray-100 cursor-pointer flex items-center justify-between hover:border-green-500 hover:bg-green-50/10 transition-all ${banksError ? 'border-red-500' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {transferData.bankCode && banks.find(b => b.code === transferData.bankCode)?.bankUrl && (
                                                        <img
                                                            src={banks.find(b => b.code === transferData.bankCode)?.bankUrl}
                                                            alt="Bank"
                                                            className="w-8 h-8 object-contain"
                                                        />
                                                    )}
                                                    <span className={transferData.bankCode ? 'text-gray-900 font-bold text-lg' : 'text-gray-400 font-medium text-lg'}>
                                                        {transferData.bankCode
                                                            ? banks.find(b => b.code === transferData.bankCode)?.name
                                                            : isBanksLoading ? 'Loading banks...' : 'Choose a bank'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isBanksLoading && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
                                                    <ChevronDown className="text-gray-400" size={24} />
                                                </div>
                                            </div>

                                            {/* Bank Selection Modal/Overlay */}
                                            {showBankList && (
                                                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                                                    <div
                                                        className="bg-white w-full sm:max-w-lg h-[85vh] sm:h-auto sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {/* Modal Header */}
                                                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                                                            <h3 className="text-xl font-bold text-gray-900">Select Bank</h3>
                                                            <button
                                                                onClick={() => {
                                                                    setShowBankList(false);
                                                                    setBankSearch('');
                                                                }}
                                                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                                                            >
                                                                <XCircle size={24} className="text-gray-500" />
                                                            </button>
                                                        </div>

                                                        {/* Search Bar */}
                                                        <div className="p-5 pb-2 bg-white">
                                                            <div className="relative">
                                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search for your bank..."
                                                                    className="w-full pl-12 pr-4 py-4 text-base bg-gray-50 border-2 border-transparent focus:bg-white focus:border-green-500 rounded-2xl focus:outline-none transition-all font-bold"
                                                                    value={bankSearch}
                                                                    onChange={(e) => setBankSearch(e.target.value)}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Bank List */}
                                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pt-2">
                                                            {!bankSearch && (
                                                                <div className="mb-6">
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Popular Banks</p>
                                                                    <div className="grid grid-cols-3 gap-3">
                                                                        {banks.slice(0, 6).map(bank => (
                                                                            <div
                                                                                key={bank.code}
                                                                                onClick={() => {
                                                                                    setTransferData({ ...transferData, bankCode: bank.code });
                                                                                    setShowBankList(false);
                                                                                    setBankSearch('');
                                                                                }}
                                                                                className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all text-center h-24"
                                                                            >
                                                                                {bank.bankUrl ? (
                                                                                    <img src={bank.bankUrl} className="w-8 h-8 object-contain" alt={bank.name} />
                                                                                ) : (
                                                                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs">
                                                                                        {bank.name.substring(0, 2)}
                                                                                    </div>
                                                                                )}
                                                                                <span className="text-[10px] font-bold text-gray-700 leading-tight line-clamp-2">{bank.name}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{bankSearch ? 'Search Results' : 'All Banks'}</p>
                                                                {banks.filter(b => (b.name || '').toLowerCase().includes(bankSearch.toLowerCase())).length > 0 ? (
                                                                    banks
                                                                        .filter(b => (b.name || '').toLowerCase().includes(bankSearch.toLowerCase()))
                                                                        .map((bank) => (
                                                                            <div
                                                                                key={bank.code}
                                                                                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${transferData.bankCode === bank.code ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50 border border-transparent'}`}
                                                                                onClick={() => {
                                                                                    setTransferData({ ...transferData, bankCode: bank.code });
                                                                                    setShowBankList(false);
                                                                                    setBankSearch('');
                                                                                }}
                                                                            >
                                                                                {bank.bankUrl ? (
                                                                                    <div className="w-10 h-10 rounded-full bg-white p-1 border border-gray-100 flex-shrink-0 flex items-center justify-center">
                                                                                        <img src={bank.bankUrl} alt={bank.name} className="w-full h-full object-contain" onError={(e: any) => e.target.style.display = 'none'} />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">
                                                                                        {bank.name.substring(0, 2)}
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex-1">
                                                                                    <p className={`text-sm font-bold ${transferData.bankCode === bank.code ? 'text-green-900' : 'text-gray-900'}`}>{bank.name}</p>
                                                                                </div>
                                                                                {transferData.bankCode === bank.code && <CheckCircle2 size={20} className="text-green-600" />}
                                                                            </div>
                                                                        ))
                                                                ) : (
                                                                    <div className="py-12 text-center flex flex-col items-center gap-3">
                                                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                                                            <Search size={24} className="text-gray-400" />
                                                                        </div>
                                                                        <p className="text-gray-500 font-medium">No banks found for "{bankSearch}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-3">Account Number</label>
                                            <input
                                                type="text"
                                                name="accountNumber"
                                                value={transferData.accountNumber}
                                                onChange={handleTransferChange}
                                                maxLength={10}
                                                required
                                                placeholder="Enter 10-digit number"
                                                className={`w-full px-5 md:px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-2 border-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-black tracking-widest text-sm md:text-base ${recipientName ? 'border-green-500 bg-green-50' : ''}`}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-black mb-3">Account Name</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={isVerifying ? 'Verifying account...' : recipientName}
                                                    readOnly
                                                    placeholder="Account name will appear here"
                                                    className={`w-full px-5 md:px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-2 border-gray-100 bg-gray-50 font-black outline-none transition-all text-sm md:text-base ${recipientName ? 'text-green-700 border-green-200' :
                                                        verificationError ? 'text-red-600 border-red-200' :
                                                            'text-gray-400'
                                                        }`}
                                                />
                                                {isVerifying && (
                                                    <Loader2 className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-green-500 animate-spin" size={22} />
                                                )}
                                                {recipientName && !isVerifying && (
                                                    <CheckCircle2 className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-green-500" size={22} />
                                                )}
                                                {verificationError && !isVerifying && (
                                                    <AlertCircle className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-red-500" size={22} />
                                                )}
                                            </div>
                                            {verificationError && !isVerifying && (
                                                <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1">
                                                    <AlertCircle size={14} />
                                                    {verificationError}
                                                </p>
                                            )}
                                            {recipientName && !isVerifying && (
                                                <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                                                    <CheckCircle2 size={14} />
                                                    Account verified successfully
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={saveBankDetails}
                                            disabled={isSavingAccount || !recipientName}
                                            className="w-full py-4 md:py-5 bg-green-600 hover:bg-green-700 text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-xl shadow-green-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0"
                                        >
                                            {isSavingAccount ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                                                    Saving Details...
                                                </>
                                            ) : (
                                                <>
                                                    {savedAccount ? 'Update Payout Account' : 'Save Account Details'}
                                                    <CheckCircle2 size={22} />
                                                </>
                                            )}
                                        </button>

                                        {savedAccount && (
                                            <button
                                                type="button"
                                                onClick={() => setShowSavedAccount(true)}
                                                className="w-full text-center text-[10px] text-gray-400 hover:text-green-600 font-black uppercase tracking-widest transition-colors mt-2"
                                            >
                                                Cancel and use saved account
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: History and Info */}
                <div className="space-y-6 md:space-y-8">
                    {/* Payout History */}
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                                <h3 className="text-sm md:text-base font-bold text-gray-900">Recent Payouts</h3>
                            </div>
                            <Link to="/dashboard/transactions" className="text-[10px] font-black uppercase tracking-widest text-green-600 hover:underline">View All</Link>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[400px] md:max-h-[600px] custom-scrollbar p-6 space-y-6">
                            {isHistoryLoading ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-12">
                                    <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-green-600" />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Loading history...</p>
                                </div>
                            ) : payoutHistory.length > 0 ? (
                                <>
                                    {/* Actually, let's just map and do conditional headers. Much easier in React JSX */}
                                    {payoutHistory.map((payout, index) => {
                                        const date = new Date(payout.createdAt);
                                        const today = new Date();
                                        const yesterday = new Date(new Date().setDate(today.getDate() - 1));

                                        const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
                                        const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

                                        const header = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });

                                        const prevDate = index > 0 ? new Date(payoutHistory[index - 1].createdAt) : null;
                                        const prevHeader = prevDate ? (
                                            (prevDate.getDate() === today.getDate() && prevDate.getMonth() === today.getMonth() && prevDate.getFullYear() === today.getFullYear()) ? 'Today' :
                                                (prevDate.getDate() === yesterday.getDate() && prevDate.getMonth() === yesterday.getMonth() && prevDate.getFullYear() === yesterday.getFullYear()) ? 'Yesterday' :
                                                    prevDate.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
                                        ) : null;

                                        const showHeader = header !== prevHeader;

                                        const bank = banks.find(b => b.code === payout.bankCode);
                                        const bankName = bank?.name || payout.bankName || payout.bankCode || 'Unknown Bank';
                                        const bankLogo = bank?.bankUrl;

                                        return (
                                            <React.Fragment key={payout._id}>
                                                {showHeader && (
                                                    <div className="flex items-center gap-4 first:mt-0 mt-6">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/50 px-3 py-1 rounded-full border border-gray-100">{header}</span>
                                                        <div className="h-px bg-gray-100 flex-1"></div>
                                                    </div>
                                                )}

                                                <div className="group relative bg-white border border-gray-100 rounded-2xl p-4 hover:border-green-200 hover:shadow-lg hover:shadow-green-100/30 transition-all duration-300">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            {bankLogo ? (
                                                                <div className="w-10 h-10 rounded-xl bg-gray-50 p-1.5 border border-gray-100 group-hover:scale-105 transition-transform">
                                                                    <img src={bankLogo} alt={bankName} className="w-full h-full object-contain mix-blend-multiply" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-black text-xs border border-gray-200">
                                                                    {bankName.substring(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-xs md:text-sm font-black text-gray-900 leading-tight">{bankName}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] font-mono font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                                        {payout.accountNumber}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate max-w-[100px]">
                                                                        {payout.accountName ? payout.accountName.split(' ')[0] : 'Beneficiary'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border ${payout.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-100' :
                                                                payout.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                    'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                                }`}>
                                                                {payout.status === 'COMPLETED' && <CheckCircle2 size={10} />}
                                                                {payout.status === 'FAILED' && <AlertCircle size={10} />}
                                                                {payout.status === 'PROCESSING' && <Clock size={10} />}
                                                                {payout.status === 'PENDING' && <Loader2 size={10} className="animate-spin" />}
                                                                {payout.status.replace('_', ' ')}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-mono">
                                                                {new Date(payout.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-100">
                                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Ref:</span>
                                                            <span className="text-[9px] font-mono text-gray-500">{payout.reference?.substring(0, 12)}...</span>
                                                        </div>
                                                        <p className="text-base font-black text-gray-900">
                                                            {formatCurrency(payout.amount / 100)}
                                                        </p>
                                                    </div>

                                                    {payout.failureReason && (
                                                        <div className="mt-3 bg-red-50/80 p-2.5 rounded-lg border border-red-100 flex gap-2">
                                                            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                                            <p className="text-[10px] text-red-700 font-medium leading-relaxed">
                                                                <span className="font-bold block text-[9px] uppercase opacity-75 mb-0.5">Failed Reason</span>
                                                                {payout.failureReason}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </>
                            ) : (
                                <div className="p-8 md:p-12 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
                                    <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-white rounded-2xl flex items-center justify-center border border-green-100 shadow-sm mb-4 animate-bounce-custom">
                                        <History className="w-8 h-8 text-green-200" />
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 mb-1">No Payouts Yet</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed">
                                        Your withdrawal history will appear here once you make your first transfer.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Security Note */}
                    <div className="bg-green-50 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-green-100 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-20 md:w-24 h-20 md:h-24 bg-green-100 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl flex items-center justify-center shadow-sm">
                                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                                </div>
                                <h4 className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-wider">Secure Protocol</h4>
                            </div>
                            <p className="text-[10px] md:text-xs text-green-800 font-medium leading-relaxed">
                                All payouts are processed through encrypted channels. Funds are typically delivered within 60 seconds of approval.
                            </p>
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-green-700 uppercase tracking-widest">
                                    <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-green-500 rounded-full"></div>
                                    24/7 Monitoring
                                </div>
                                <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-green-700 uppercase tracking-widest">
                                    <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-green-500 rounded-full"></div>
                                    Fraud Protection
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Render Success Modal */}
                <SuccessModal />
            </div>
        </div>
    );
};
