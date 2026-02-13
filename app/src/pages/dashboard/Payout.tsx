import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ArrowRight,
    ArrowUpRight,
    Loader2,
    Wallet,
    Search,
    XCircle,
    History,
    Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { VerificationAlert } from '../../components/dashboard/VerificationAlert';

export const Payout: React.FC = () => {
    const { user } = useAuth();
    const [transferData, setTransferData] = useState({
        accountNumber: '',
        bankCode: '',
        amount: '',
        narration: '',
    });
    const [banks, setBanks] = useState<any[]>([]);
    const [isBanksLoading, setIsBanksLoading] = useState(false);
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

    const isVerified = (user?.kycLevel ?? 0) >= 3;

    useEffect(() => {
        if (isVerified) {
            fetchBanks();
            fetchSavedAccount();
            fetchWallet();
            fetchPayoutHistory();
        } else {
            setIsBanksLoading(false);
            setIsWalletLoading(false);
            setIsHistoryLoading(false);
        }
    }, [isVerified]);

    useEffect(() => {
        const amountNum = parseFloat(transferData.amount);
        // Calculate fees if amount is valid and account number is 10 digits (to check internal/external)
        if (amountNum >= 100 && transferData.accountNumber.length === 10) {
            const timer = setTimeout(() => {
                calculateFees();
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setFees(null);
        }
    }, [transferData.amount, transferData.accountNumber]);

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
                accountNumber: transferData.accountNumber
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
        try {
            const response = await api.get('/banks');
            const bankData = response.data.data || response.data;

            if (Array.isArray(bankData)) {
                const sortedBanks = [...bankData].sort((a: any, b: any) =>
                    (a.name || '').localeCompare(b.name || '')
                );
                setBanks(sortedBanks);
            } else {
                console.error('Invalid bank data received');
            }
        } catch (error: any) {
            console.error('Error fetching banks:', error);
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
                // setRecipientName(''); // Removed to avoid clearing name when re-selecting saved account? No, we should clear if manual entry changes
                // Actually, if we are typing, we should clear.
                if (!savedAccount || savedAccount.accountNumber !== transferData.accountNumber) {
                    setRecipientName('');
                }
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

        // Basic validation
        const amount = parseFloat(transferData.amount);
        if (!amount || amount <= 0) {
            setTransferError('Please enter a valid amount');
            return;
        }

        if (!transferData.accountNumber || !transferData.bankCode) {
            setTransferError('Please provide account details');
            return;
        }

        if (!recipientName) {
            setTransferError('Please wait for account verification');
            return;
        }

        // Calculate total deduction (Amount + Logic Fee)
        // If fees are calculated, use totalDebit. Otherwise, use amount (risky, but fallback)
        // Better to wait for fees?
        const totalDeducted = fees ? (fees.totalDebit / 100) : amount;

        if (wallet && totalDeducted > wallet.clearedBalanceNaira) {
            setTransferError(`Insufficient balance. Total required: ₦${totalDeducted.toLocaleString()}`);
            return;
        }

        // Show confirmation modal
        setShowConfirmation(true);
    };

    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [transferResult, setTransferResult] = useState<any>(null);

    const processTransfer = async () => {
        setIsTransferLoading(true);
        setTransferError('');
        setTransferSuccess('');

        try {
            const amountInKobo = Math.round(parseFloat(transferData.amount) * 100);
            const bankName = banks.find(b => b.code === transferData.bankCode)?.name || 'Unknown Bank';

            const response = await api.post('/payout', {
                accountNumber: transferData.accountNumber,
                bankCode: transferData.bankCode,
                accountName: recipientName,
                amount: amountInKobo,
                narration: transferData.narration,
                bankName // Optional, for saving if backend supports 'saveAccount' flag?
                // Backend supports 'saveAccount' but we handle saving separately in UI via 'Save as beneficiary' button
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
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            {!isVerified ? (
                <VerificationAlert />
            ) : (
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left Panel: Transfer Form */}
                    <div className="w-full lg:w-7/12 space-y-6">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Send Money</h1>
                            <p className="text-gray-500 text-sm mt-1">Transfer funds to any bank account instantly.</p>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 md:p-8 space-y-8">
                                {/* Available Balance Widget */}
                                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm text-gray-500">
                                            <Wallet size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Available Balance</p>
                                            <p className="text-lg font-bold text-gray-900">{isWalletLoading ? '...' : formatCurrency(wallet?.clearedBalanceNaira || 0)}</p>
                                        </div>
                                    </div>
                                    <Link to="/dashboard/wallet" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                                        Top up
                                    </Link>
                                </div>

                                {/* Notifications */}
                                {transferSuccess && (
                                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3 animate-fade-in">
                                        <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-green-800 font-medium">{transferSuccess}</p>
                                    </div>
                                )}

                                {transferError && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-fade-in">
                                        <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-800 font-medium">{transferError}</p>
                                    </div>
                                )}

                                <form onSubmit={handleTransfer} className="space-y-6">
                                    {/* Amount Input */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Amount to send</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xl">₦</span>
                                            <input
                                                type="number"
                                                name="amount"
                                                value={transferData.amount}
                                                onChange={handleTransferChange}
                                                min="100"
                                                required
                                                placeholder="0.00"
                                                className="w-full pl-10 pr-4 py-4 bg-transparent border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all font-semibold text-2xl text-gray-900 placeholder:text-gray-300"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {['5000', '10000', '20000', '50000'].map((amt) => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setTransferData({ ...transferData, amount: amt })}
                                                    className="px-3 py-1 bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-all"
                                                >
                                                    ₦{parseInt(amt).toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Beneficiary Selection */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-gray-700">Beneficiary</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowSavedAccount(false)}
                                                className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                            >
                                                <Plus size={14} /> New
                                            </button>
                                        </div>

                                        {savedAccount && showSavedAccount ? (
                                            <div onClick={() => setShowSavedAccount(false)} className="group cursor-pointer p-4 border border-primary-200 bg-primary-50/30 rounded-xl flex items-center justify-between hover:bg-primary-50/50 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm">
                                                        {savedAccount.accountName ? savedAccount.accountName.charAt(0) : '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{savedAccount.accountName || 'Unknown Beneficiary'}</p>
                                                        <p className="text-xs text-gray-500">{savedAccount.bankName} • {savedAccount.accountNumber}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-medium text-primary-600 group-hover:underline">Change</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-fade-in p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                                                <div
                                                    onClick={() => !isBanksLoading && setShowBankList(true)}
                                                    className="w-full bg-white p-3 border border-gray-200 rounded-lg cursor-pointer flex items-center justify-between hover:border-gray-300 transition-all"
                                                >
                                                    <span className={transferData.bankCode ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                                        {transferData.bankCode
                                                            ? banks.find(b => b.code === transferData.bankCode)?.name
                                                            : isBanksLoading ? 'Loading banks...' : 'Select Bank'}
                                                    </span>
                                                    <ChevronDown size={18} className="text-gray-400" />
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="accountNumber"
                                                        value={transferData.accountNumber}
                                                        onChange={handleTransferChange}
                                                        placeholder="Account Number"
                                                        maxLength={10}
                                                        className="w-full bg-white p-3 border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                                    />
                                                    {isVerifying && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-600 animate-spin" size={18} />}
                                                    {recipientName && !isVerifying && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600" size={18} />}
                                                </div>

                                                {isVerifying && <p className="text-xs text-blue-600">Verifying account...</p>}
                                                {recipientName && <p className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> {recipientName}</p>}
                                                {verificationError && <p className="text-xs text-red-600">{verificationError}</p>}

                                                {recipientName && (
                                                    <button
                                                        type="button"
                                                        onClick={saveBankDetails}
                                                        disabled={isSavingAccount}
                                                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                                    >
                                                        {isSavingAccount ? 'Saving...' : 'Save as beneficiary'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Narration */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Narration (Optional)</label>
                                        <input
                                            type="text"
                                            name="narration"
                                            value={transferData.narration}
                                            onChange={handleTransferChange}
                                            placeholder="What's this for?"
                                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all font-medium text-sm text-gray-900 placeholder:text-gray-400"
                                        />
                                    </div>

                                    {/* Fees Breakdown */}
                                    {fees && !isCalculatingFees && (
                                        <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Fees</span>
                                                <span className="font-medium text-gray-900">{formatCurrency(((fees.fee || 0) + (fees.gatewayFee || 0)) / 100)}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                                <span className="font-semibold text-gray-900">Total Debit</span>
                                                <span className="font-bold text-gray-900">{formatCurrency((fees.totalDebit || 0) / 100)}</span>
                                            </div>
                                            <div className="flex justify-between pt-1">
                                                <span className="text-gray-500">Recipient Gets</span>
                                                <span className="font-medium text-gray-900">{formatCurrency((fees.netAmount || 0) / 100)}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={(e) => handleTransfer(e)}
                                        disabled={isTransferLoading || !transferData.amount || parseFloat(transferData.amount) <= 0}
                                        className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isTransferLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Send Money <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                    {/* Right Panel: History & Saved */}
                    <div className="w-full lg:w-8/12 space-y-6">
                        {/* Saved Beneficiaries */}
                        <br />  <br />
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-10">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900 text-sm">Saved Beneficiaries</h3>
                                <Link to="/dashboard/beneficiaries" className="text-xs font-semibold text-primary-600 hover:text-primary-700">View All</Link>
                            </div>
                            <div className="p-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {savedAccounts.length > 0 ? (
                                    <div className="space-y-1">
                                        {savedAccounts.slice(0, 5).map((acc) => (
                                            <div
                                                key={acc._id}
                                                onClick={() => handleSelectAccount(acc)}
                                                className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${selectedAccountId === acc._id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedAccountId === acc._id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {acc.accountName ? acc.accountName.charAt(0) : '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{acc.accountName}</p>
                                                    <p className="text-xs text-gray-500 truncate">{acc.bankName}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-6 text-sm text-gray-500">No saved beneficiaries yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Payouts */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1">
                            <div className="p-4 border-b border-gray-100">
                                <h3 className="font-semibold text-gray-900 text-sm">Recent Transactions</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {isHistoryLoading ? (
                                    <div className="p-8 flex justify-center">
                                        <Loader2 className="animate-spin text-gray-400" size={24} />
                                    </div>
                                ) : payoutHistory.length > 0 ? (
                                    payoutHistory.slice(0, 8).map((payout) => (
                                        <div key={payout._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${payout.status === 'success' ? 'bg-green-100 text-green-600' :
                                                    payout.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                                                    }`}>
                                                    <ArrowUpRight size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{payout.accountName}</p>
                                                    <p className="text-xs text-gray-500">{new Date(payout.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">-{formatCurrency(payout.amount)}</p>
                                                <p className={`text-[10px] font-bold uppercase ${payout.status === 'success' ? 'text-green-600' :
                                                    payout.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                                                    }`}>{payout.status}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <History size={20} className="text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500">No recent transactions</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bank List Modal */}
            {showBankList && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-md h-[500px] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Select Bank</h3>
                            <button onClick={() => setShowBankList(false)} className="p-1 hover:bg-gray-100 rounded-full"><XCircle size={20} className="text-gray-500" /></button>
                        </div>
                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search banks..."
                                    value={bankSearch}
                                    onChange={(e) => setBankSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-primary-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {banks.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase())).map((bank) => (
                                <div
                                    key={bank.code}
                                    onClick={() => {
                                        setTransferData({ ...transferData, bankCode: bank.code });
                                        setShowBankList(false);
                                    }}
                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0"
                                >
                                    {bank.bankUrl && <img src={bank.bankUrl} alt="" className="w-6 h-6 object-contain" />}
                                    <span className="text-sm text-gray-700 font-medium">{bank.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Confirm Withdrawal</h3>
                            <button onClick={() => setShowConfirmation(false)} className="p-1 hover:bg-gray-100 rounded-full"><XCircle size={20} className="text-gray-400" /></button>
                        </div>
                        <div className="p-6 text-center space-y-4">
                            <div>
                                <p className="text-xs text-uppercase text-gray-500 font-bold tracking-widest">YOU ARE SENDING</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(parseFloat(transferData.amount))}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">To</span>
                                    <span className="font-medium text-gray-900 text-right">{savedAccount?.accountName}<br /><span className="text-xs text-gray-500 font-normal">{savedAccount?.bankName}</span></span>
                                </div>
                            </div>
                            <button
                                onClick={processTransfer}
                                disabled={isTransferLoading}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                            >
                                {isTransferLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SuccessModal />
        </div>
    );
};
