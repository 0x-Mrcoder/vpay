"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payoutService = exports.PayoutService = void 0;
const uuid_1 = require("uuid");
const models_1 = require("../models");
const PalmPayService_1 = require("./PalmPayService");
const logger_1 = require("../utils/logger");
class PayoutService {
    /**
     * Calculate payout fees
     */
    async calculateFees(amount, isInternal) {
        const safeAmount = Number(amount);
        if (isNaN(safeAmount)) {
            return {
                fee: 0,
                gatewayFee: 0,
                totalDebit: 0,
                netAmount: 0
            };
        }
        const settings = await models_1.SystemSetting.findOne();
        const payoutSettings = settings?.payout || {
            vtpayFeePercent: 0.6,
            bankSettlementFee: 2500,
            bankSettlementThreshold: 0
        };
        let fee = 0; // VTPay fee
        let gatewayFee = 0;
        let netAmount = 0;
        if (isInternal) {
            fee = 0;
            gatewayFee = 0;
            netAmount = safeAmount;
        }
        else {
            // Bank Settlement Fee (Fixed)
            let bankSettlementFee = Number(payoutSettings.bankSettlementFee);
            if (isNaN(bankSettlementFee))
                bankSettlementFee = 2500;
            let threshold = Number(payoutSettings.bankSettlementThreshold);
            if (isNaN(threshold))
                threshold = 0;
            if (safeAmount >= threshold) {
                gatewayFee = bankSettlementFee;
            }
            else {
                gatewayFee = 0;
            }
            // VTPay fee (Percentage)
            let vtpayFeePercent = Number(payoutSettings.vtpayFeePercent);
            if (isNaN(vtpayFeePercent))
                vtpayFeePercent = 0.6;
            // Calculate Net Amount: Net = (Total - Fixed) / (1 + Rate)
            const remaining = safeAmount - gatewayFee;
            if (remaining > 0) {
                netAmount = Math.floor(remaining / (1 + vtpayFeePercent / 100));
                fee = safeAmount - netAmount - gatewayFee;
            }
            else {
                netAmount = 0;
                fee = 0;
                gatewayFee = 0;
            }
        }
        const totalDebit = safeAmount;
        return {
            fee,
            gatewayFee,
            totalDebit,
            netAmount
        };
    }
    /**
     * Initiate a payout request
     */
    async initiatePayout(userId, amount, details) {
        // 1. Validation
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
        // KYC Check (Level 2 or 3 required for payouts)
        if (user.kycLevel < 2) {
            throw new Error('Please complete your KYC verification to enable withdrawals.');
        }
        if (amount < 10000) { // 100 Naira
            throw new Error('Minimum withdrawal amount is ₦100.00');
        }
        // 2. Fees & Internal Check
        const isInternal = await models_1.VirtualAccount.exists({ accountNumber: details.accountNumber });
        const fees = await this.calculateFees(amount, !!isInternal);
        const totalDeducted = amount;
        // 3. Check Balance & Deduct
        const wallet = await models_1.Wallet.findOne({ userId });
        if (!wallet)
            throw new Error('Wallet not found');
        if (wallet.clearedBalance < totalDeducted) {
            throw new Error('Insufficient cleared balance for this withdrawal');
        }
        // Deduct from wallet
        wallet.clearedBalance -= totalDeducted;
        wallet.balance -= totalDeducted;
        await wallet.save();
        try {
            // Create Payout Record
            const payout = new models_1.Payout({
                userId,
                amount: fees.netAmount,
                fee: fees.fee,
                payrantFee: fees.gatewayFee, // Keep field name for DB compatibility
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
                // Return success (status remains INITIATED until webhook)
                return payout;
            }
            catch (gatewayError) {
                // If gateway call fails, fail the payout immediately
                logger_1.logger.error('PalmPay transfer failed:', gatewayError);
                throw new Error(gatewayError.message || 'Payment gateway failed to process transfer');
            }
        }
        catch (error) {
            // Rollback wallet
            wallet.clearedBalance += totalDeducted;
            wallet.balance += totalDeducted;
            await wallet.save().catch(e => logger_1.logger.error('CRITICAL: Failed to rollback wallet', e));
            throw error;
        }
    }
    /**
     * Handle Payout Success
     */
    async handlePayoutSuccess(payout) {
        if (payout.status === 'COMPLETED')
            return;
        payout.status = 'COMPLETED';
        await payout.save();
        // Create Transaction Record
        const wallet = await models_1.Wallet.findOne({ userId: payout.userId });
        if (wallet) {
            await models_1.Transaction.create({
                userId: payout.userId,
                walletId: wallet._id,
                type: 'debit',
                category: 'withdrawal',
                amount: payout.totalDebit,
                reference: payout.reference,
                narration: `Withdrawal of ₦${payout.amount / 100} (Fee: ₦${(payout.totalDebit - payout.amount) / 100})`,
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
                }
            });
        }
        logger_1.logger.info(`Payout ${payout.reference} marked as COMPLETED`);
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
        // Refund wallet
        const wallet = await models_1.Wallet.findOne({ userId: payout.userId });
        if (wallet) {
            const refundAmount = payout.totalDebit;
            wallet.clearedBalance += refundAmount;
            wallet.balance += refundAmount;
            await wallet.save();
            logger_1.logger.info(`Payout ${payout.reference} failed. Wallet refunded. Reason: ${reason}`);
        }
    }
}
exports.PayoutService = PayoutService;
exports.payoutService = new PayoutService();
exports.default = exports.payoutService;
//# sourceMappingURL=PayoutService.js.map