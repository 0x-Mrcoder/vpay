import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Wallet, Payout, Transaction, User, VirtualAccount, SystemSetting } from '../models';
import { emailService } from './EmailService';
import { palmPayService } from './PalmPayService';
import { AdminNotificationService } from './AdminNotificationService';
import { logger } from '../utils/logger';

export class PayoutService {
    /**
     * Calculate payout fees
     */
    async calculateFees(amount: number, isInternal: boolean) {
        const safeAmount = Number(amount);
        if (isNaN(safeAmount)) {
            return { fee: 0, gatewayFee: 0, totalDebit: 0, netAmount: 0 };
        }

        const settings = await SystemSetting.findOne();
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
        } else {
            // --- Tiered flat fee: fee = ceil(amount / (tierStep * 100)) * (tierFeeStep * 100) ---
            const tierStepKobo = (Number(payoutSettings.payoutTierStep) || 2500) * 100;
            const tierFeeStepKobo = (Number(payoutSettings.payoutTierFeeStep) || 25) * 100;
            fee = Math.ceil(safeAmount / tierStepKobo) * tierFeeStepKobo;

            // Gateway fee (bank settlement — kept for future usage, set to 0 by default)
            const bankSettlementFee = Number(payoutSettings.bankSettlementFee) || 0;
            const threshold = Number(payoutSettings.bankSettlementThreshold) || 0;
            gatewayFee = safeAmount >= threshold && threshold > 0 ? bankSettlementFee : 0;

            netAmount = safeAmount - fee - gatewayFee;
            if (netAmount < 0) netAmount = 0;
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
    async initiatePayout(
        userId: string,
        amount: number,
        details: { bankCode: string; accountNumber: string; accountName: string }
    ): Promise<any> {
        // 1. Validation
        const user = await User.findById(userId);
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

        // 2. Minimum payout check (dynamic from system settings)
        const payoutSettings = await SystemSetting.findOne();
        const minPayout = payoutSettings?.payout?.minAmount || 1000;
        if (amount < minPayout) {
            throw new Error(`Minimum withdrawal amount is ₦${minPayout.toLocaleString()}`);
        }

        // 3. Fees & Internal Check
        const isInternal = await VirtualAccount.exists({ accountNumber: details.accountNumber });
        const fees = await this.calculateFees(amount, !!isInternal);
        const totalDeducted = amount;

        // 3. Check Balance & Deduct
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) throw new Error('Wallet not found');

        if (wallet.clearedBalance < totalDeducted) {
            throw new Error('Insufficient cleared balance for this withdrawal');
        }

        // Deduct from wallet
        wallet.clearedBalance -= totalDeducted;
        wallet.balance -= totalDeducted;
        await wallet.save();

        try {
            // Create Payout Record
            const payout = new Payout({
                userId,
                amount: fees.netAmount,
                fee: fees.fee,
                payrantFee: fees.gatewayFee, // Keep field name for DB compatibility
                totalDebit: totalDeducted,
                bankCode: details.bankCode,
                accountNumber: details.accountNumber,
                accountName: details.accountName,
                payoutType: isInternal ? 'internal' : 'external',
                reference: `PAYOUT-${uuidv4()}`,
                status: 'INITIATED',
                retryCount: 0,
            });
            await payout.save();

            // Notify admins
            emailService.sendPayoutRequestAdminNotification(user, payout).catch(err => 
                logger.error('[PayoutService] Failed to send admin notification:', err)
            );

            AdminNotificationService.notifyNewPayout(user, totalDeducted).catch(err =>
                logger.error('[PayoutService] Failed to create admin notification:', err)
            );

            // Create Transaction Record (Pending)
            const transaction = new Transaction({
                userId,
                walletId: wallet._id,
                type: 'debit',
                category: 'withdrawal',
                amount: totalDeducted,
                fee: fees.fee + fees.gatewayFee,
                balanceBefore: wallet.balance + totalDeducted,
                balanceAfter: wallet.balance,
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
                isCleared: true, // Balance is already deducted
                clearedAt: new Date()
            });
            await transaction.save();

            // Process with PalmPay
            try {
                const transferResponse = await palmPayService.initiateTransfer({
                    amount: fees.netAmount, // PalmPay expects minor unit (kobo)
                    currency: 'NGN',
                    transactionReference: payout.reference,
                    description: `Payout to ${details.accountNumber}`,
                    beneficiary: {
                        accountNumber: details.accountNumber,
                        bankCode: details.bankCode,
                        accountName: details.accountName
                    }
                });

                logger.info(`PalmPay transfer initiated: ${JSON.stringify(transferResponse)}`);

                // Update reference with PalmPay's orderNo if available
                if (transferResponse.orderNo) {
                    const orderNo = transferResponse.orderNo;
                    
                    // Update payout reference
                    payout.reference = orderNo;
                    payout.externalRef = orderNo; // Also store as externalRef
                    await payout.save();

                    // Update transaction reference using findOneAndUpdate to be safe
                    await Transaction.findOneAndUpdate(
                        { 'metadata.payoutId': payout._id },
                        { $set: { reference: orderNo, externalRef: orderNo } }
                    );
                }

                // Automatically mark as successful if transfer initiated successfully
                // Note: Ideally we wait for webhook, but user requested automatic success
                await this.handlePayoutSuccess(payout);
                return payout;

            } catch (gatewayError: any) {
                // If gateway call fails, fail the payout immediately
                logger.error('PalmPay transfer failed:', gatewayError);

                // Mark transaction as failed
                await Transaction.findOneAndUpdate(
                    { 'metadata.payoutId': payout._id },
                    { $set: { status: 'failed', narration: `Withdrawal Failed: ${gatewayError.message || 'Gateway Error'}` } }
                );

                throw new Error(gatewayError.message || 'Payment gateway failed to process transfer');
            }

        } catch (error) {
            // Rollback wallet
            wallet.clearedBalance += totalDeducted;
            wallet.balance += totalDeducted;
            await wallet.save().catch(e => logger.error('CRITICAL: Failed to rollback wallet', e));

            throw error;
        }
    }

    /**
     * Handle Payout Success
     */
    async handlePayoutSuccess(payout: any): Promise<void> {
        if (payout.status === 'COMPLETED') return;

        payout.status = 'COMPLETED';
        await payout.save();

        // Update Transaction Record
        const wallet = await Wallet.findOne({ userId: payout.userId });
        if (wallet) {
            // Try to find existing transaction
            let transaction = await Transaction.findOne({
                $or: [
                    { reference: payout.reference },
                    { 'metadata.payoutId': payout._id }
                ]
            });

            if (transaction) {
                transaction.status = 'success';
                await transaction.save();
            } else {
                // Fallback: Create new if not found (for old payouts or race conditions)
                await Transaction.create({
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
        }

        logger.info(`Payout ${payout.reference} marked as COMPLETED`);
    }

    /**
     * Handle Payout Failure
     */
    async handlePayoutFailure(payout: any, reason: string, skipRefund: boolean = false): Promise<void> {
        if (payout.status === 'FAILED') return;

        payout.status = 'FAILED';
        payout.failureReason = reason;
        await payout.save();

        if (skipRefund) {
            logger.info(`Payout ${payout.reference} failed. Refund skipped. Reason: ${reason}`);
            return;
        }

        // Refund wallet
        const wallet = await Wallet.findOne({ userId: payout.userId });
        if (wallet) {
            const refundAmount = payout.totalDebit;
            wallet.clearedBalance += refundAmount;
            wallet.balance += refundAmount;
            await wallet.save();

            logger.info(`Payout ${payout.reference} failed. Wallet refunded. Reason: ${reason}`);

            // Mark transaction as failed
            const transaction = await Transaction.findOne({
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
        logger.warn('PayoutService.reconcilePayouts called (Stub)');
    }

    async processSettlements() {
        logger.warn('PayoutService.processSettlements called (Stub)');
    }
}

export const payoutService = new PayoutService();
export default payoutService;
