"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.payoutService = exports.PayoutService = void 0;
const uuid_1 = require("uuid");
const models_1 = require("../models");
const EmailService_1 = require("./EmailService");
const PalmPayService_1 = require("./PalmPayService");
const AdminNotificationService_1 = require("./AdminNotificationService");
const logger_1 = require("../utils/logger");
class PayoutService {
    /**
     * Calculate payout fees
     */
    async calculateFees(amount, isInternal) {
        const safeAmount = Number(amount);
        if (isNaN(safeAmount)) {
            return { fee: 0, gatewayFee: 0, totalDebit: 0, netAmount: 0 };
        }
        const settings = await models_1.SystemSetting.findOne();
        const payoutSettings = settings?.payout || {
            vtpayFeePercent: 0.6,
            bankSettlementFee: 2500,
            bankSettlementThreshold: 0,
            payoutTierStep: 2500,
            payoutTierFeeStep: 25,
        };
        let fee = 0;
        let gatewayFee = 0;
        let netAmount = 0;
        if (isInternal) {
            fee = 0;
            gatewayFee = 0;
            netAmount = safeAmount;
        }
        else {
            // --- Tiered flat fee: fee = ceil(amount / (tierStep * 100)) * (tierFeeStep * 100) ---
            const tierStepKobo = (Number(payoutSettings.payoutTierStep) || 2500) * 100;
            const tierFeeStepKobo = (Number(payoutSettings.payoutTierFeeStep) || 25) * 100;
            fee = Math.ceil(safeAmount / tierStepKobo) * tierFeeStepKobo;
            // Gateway fee (bank settlement — kept for future usage, set to 0 by default)
            const bankSettlementFee = Number(payoutSettings.bankSettlementFee) || 0;
            const threshold = Number(payoutSettings.bankSettlementThreshold) || 0;
            gatewayFee = safeAmount >= threshold && threshold > 0 ? bankSettlementFee : 0;
            netAmount = safeAmount - fee - gatewayFee;
            if (netAmount < 0)
                netAmount = 0;
        }
        return {
            fee,
            gatewayFee,
            totalDebit: safeAmount,
            netAmount
        };
    }
    /**
     * Initiate a payout request
     */
    async initiatePayout(userId, amount, details) {
        // 1. Validation & sanitization
        const safeAmount = Number(amount);
        if (isNaN(safeAmount) || safeAmount <= 0) {
            throw new Error('Invalid withdrawal amount');
        }
        // Tier Limits Check
        const { limitService } = await Promise.resolve().then(() => __importStar(require('./LimitService')));
        await limitService.checkTierLimits(userId, 'withdrawal', safeAmount);
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (user.status === 'suspended') {
            throw new Error('Your account is suspended. Please contact support.');
        }
        if (user.status === 'pending') {
            throw new Error('Your account is pending verification.');
        }
        // KYC Check
        if (user.kycLevel < 1) {
            throw new Error('Please verify your email to enable withdrawals.');
        }
        // 2. Minimum payout check
        const payoutSettings = await models_1.SystemSetting.findOne();
        const minPayout = payoutSettings?.payout?.minAmount || 1000;
        if (safeAmount < minPayout) {
            throw new Error(`Minimum withdrawal amount is ₦${(minPayout / 100).toLocaleString()}`);
        }
        // 3. Fees & Internal Check
        const isInternal = await models_1.VirtualAccount.exists({ accountNumber: details.accountNumber });
        const fees = await this.calculateFees(safeAmount, !!isInternal);
        const totalDeducted = safeAmount;
        // 4. Use Atomic findOneAndUpdate to lock funds
        // We use availableBalance logic: clearedBalance - lockedBalance
        const wallet = await models_1.Wallet.findOneAndUpdate({
            userId,
            $expr: { $gte: [{ $subtract: ["$balance", "$lockedBalance"] }, totalDeducted] }
        }, { $inc: { lockedBalance: totalDeducted } }, { new: true });
        if (!wallet) {
            throw new Error('Insufficient available balance (funds must be cleared/settled first)');
        }
        try {
            // Create Payout Record
            const payout = new models_1.Payout({
                userId,
                amount: fees.netAmount,
                fee: fees.fee,
                payrantFee: fees.gatewayFee,
                totalDebit: totalDeducted,
                bankCode: details.bankCode,
                accountNumber: details.accountNumber,
                accountName: details.accountName,
                payoutType: isInternal ? 'internal' : 'external',
                reference: `PAYOUT-${(0, uuid_1.v4)()}`,
                status: 'INITIATED',
                retryCount: 0,
            });
            await payout.save();
            // Create Transaction Record (Pending)
            const transaction = new models_1.Transaction({
                userId,
                walletId: wallet._id,
                type: 'debit',
                category: 'withdrawal',
                amount: totalDeducted,
                fee: fees.fee + fees.gatewayFee,
                balanceBefore: wallet.balance,
                balanceAfter: wallet.balance - totalDeducted, // Transaction represents the final intended state
                reference: payout.reference,
                narration: `Withdrawal to ${details.accountNumber} - ${details.bankCode}`,
                status: 'pending',
                metadata: {
                    payoutId: payout._id,
                    beneficiary: {
                        accountNumber: details.accountNumber,
                        accountName: details.accountName,
                        bankCode: details.bankCode
                    }
                },
                isCleared: false // Funds are only locked
            });
            await transaction.save();
            // Notify admins
            EmailService_1.emailService.sendPayoutRequestAdminNotification(user, payout).catch(err => logger_1.logger.error('[PayoutService] Failed to send admin notification:', err));
            AdminNotificationService_1.AdminNotificationService.notifyNewPayout(user, totalDeducted).catch(err => logger_1.logger.error('[PayoutService] Failed to create admin notification:', err));
            // Process with PalmPay
            try {
                const transferResponse = await PalmPayService_1.palmPayService.initiateTransfer({
                    amount: fees.netAmount,
                    currency: 'NGN',
                    transactionReference: payout.reference,
                    description: `Payout to ${details.accountNumber}`,
                    beneficiary: {
                        accountNumber: details.accountNumber,
                        bankCode: details.bankCode,
                        accountName: details.accountName
                    }
                });
                logger_1.logger.info(`PalmPay transfer initiated: ${JSON.stringify(transferResponse)}`);
                if (transferResponse.orderNo) {
                    const orderNo = transferResponse.orderNo;
                    payout.reference = orderNo;
                    payout.externalRef = orderNo;
                    await payout.save();
                    await models_1.Transaction.findOneAndUpdate({ 'metadata.payoutId': payout._id }, { $set: { reference: orderNo, externalRef: orderNo } });
                }
                await this.handlePayoutSuccess(payout);
                return payout;
            }
            catch (gatewayError) {
                logger_1.logger.error('PalmPay transfer failed:', gatewayError);
                await models_1.Transaction.findOneAndUpdate({ 'metadata.payoutId': payout._id }, { $set: { status: 'failed', narration: `Withdrawal Failed: ${gatewayError.message || 'Gateway Error'}` } });
                throw new Error(gatewayError.message || 'Payment gateway failed to process transfer');
            }
        }
        catch (error) {
            // Unlock funds on failure (Restore available balance)
            await models_1.Wallet.findOneAndUpdate({ userId }, { $inc: { lockedBalance: -totalDeducted } }).catch(e => logger_1.logger.error('CRITICAL: Failed to unlock funds after error', e));
            throw error;
        }
    }
    /**
     * Handle Payout Success
     */
    async handlePayoutSuccess(payout) {
        if (payout.status === 'SUCCESS')
            return;
        payout.status = 'SUCCESS';
        payout.completedAt = new Date();
        await payout.save();
        // 1. Deduct from balance and clearedBalance, and release lockedBalance
        // Guard: only proceed if lockedBalance is >= payout.totalDebit
        const wallet = await models_1.Wallet.findOneAndUpdate({
            userId: payout.userId,
            lockedBalance: { $gte: payout.totalDebit }
        }, {
            $inc: {
                balance: -payout.totalDebit,
                clearedBalance: -payout.totalDebit,
                lockedBalance: -payout.totalDebit
            }
        }, { new: true });
        if (!wallet) {
            // This might happen if the wallet was already debited (idempotency) 
            // or if the locked balance is insufficient (should not happen if initiatePayout worked)
            logger_1.logger.warn(`[PayoutService] Wallet update failed for payout ${payout.reference}. Possibly already processed or insufficient locked balance.`);
            // Check if transaction already exists as 'success' to confirm it was already processed
            const existingTxn = await models_1.Transaction.findOne({
                $or: [
                    { reference: payout.reference },
                    { 'metadata.payoutId': payout._id }
                ],
                status: 'success'
            });
            if (existingTxn) {
                logger_1.logger.info(`[PayoutService] Payout ${payout.reference} already has a success transaction. Skipping.`);
                return;
            }
            // If no success transaction exists and wallet update failed, something is wrong
            throw new Error(`Failed to deduct funds from wallet for payout ${payout.reference}. Locked balance might be insufficient.`);
        }
        // Update Transaction Record
        let transaction = await models_1.Transaction.findOne({
            $or: [
                { reference: payout.reference },
                { 'metadata.payoutId': payout._id }
            ]
        });
        if (transaction) {
            transaction.status = 'success';
            transaction.isCleared = true;
            transaction.clearedAt = new Date();
            await transaction.save();
        }
        else {
            // Fallback: Create new if not found (for old payouts or race conditions)
            await models_1.Transaction.create({
                userId: payout.userId,
                walletId: wallet._id,
                type: 'debit',
                category: 'withdrawal',
                amount: payout.totalDebit,
                reference: payout.reference,
                narration: `Withdrawal of ₦${(payout.amount / 100).toLocaleString()} (Fee: ₦${((payout.totalDebit - payout.amount) / 100).toLocaleString()})`,
                status: 'success',
                balanceBefore: wallet.balance + payout.totalDebit,
                balanceAfter: wallet.balance,
                payoutId: payout._id,
                metadata: {
                    fees: {
                        fee: payout.fee,
                        gatewayFee: payout.payrantFee,
                        totalDebit: payout.totalDebit,
                        netAmount: payout.amount
                    },
                    beneficiary: {
                        accountNumber: payout.accountNumber,
                        accountName: payout.accountName,
                        bankCode: payout.bankCode
                    }
                },
                isCleared: true,
                clearedAt: new Date()
            });
        }
        logger_1.logger.info(`Payout ${payout.reference} marked as SUCCESS. Funds deducted and unlocked.`);
    }
    /**
     * Handle Payout Failure
     */
    async handlePayoutFailure(payout, reason, skipRefund = false) {
        if (payout.status === 'FAILED')
            return;
        payout.status = 'FAILED';
        payout.failureReason = reason;
        await payout.save();
        if (skipRefund) {
            logger_1.logger.info(`Payout ${payout.reference} failed. Refund skipped. Reason: ${reason}`);
            return;
        }
        // Refund wallet (Release locked funds)
        const wallet = await models_1.Wallet.findOneAndUpdate({ userId: payout.userId }, { $inc: { lockedBalance: -payout.totalDebit } }, { new: true });
        if (wallet) {
            logger_1.logger.info(`Payout ${payout.reference} failed. Locked funds released. Reason: ${reason}`);
            // Mark transaction as failed
            const transaction = await models_1.Transaction.findOne({
                $or: [
                    { reference: payout.reference },
                    { 'metadata.payoutId': payout._id }
                ]
            });
            if (transaction) {
                transaction.status = 'failed';
                transaction.narration += ` (Failed: ${reason})`;
                await transaction.save();
            }
        }
    }
    /**
     * Legacy stubs for build compatibility
     */
    async reconcilePayouts() {
        logger_1.logger.warn('PayoutService.reconcilePayouts called (Stub)');
    }
    async processSettlements() {
        logger_1.logger.warn('PayoutService.processSettlements called (Stub)');
    }
}
exports.PayoutService = PayoutService;
exports.payoutService = new PayoutService();
exports.default = exports.payoutService;
//# sourceMappingURL=PayoutService.js.map