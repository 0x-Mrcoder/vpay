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
        // 1. Validation & sanitization
        const safeAmount = Number(amount);
        if (isNaN(safeAmount) || safeAmount <= 0) {
            throw new Error('Invalid withdrawal amount');
        }

        // Tier Limits Check
        const { limitService } = await import('./LimitService');
        await limitService.checkTierLimits(userId, 'withdrawal', safeAmount);

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

        // KYC Check
        if (user.kycLevel < 1) {
            throw new Error('Please verify your email to enable withdrawals.');
        }

        // 2. Minimum payout check
        const payoutSettings = await SystemSetting.findOne();
        const minPayout = payoutSettings?.payout?.minAmount || 1000;
        if (safeAmount < minPayout) {
            throw new Error(`Minimum withdrawal amount is ₦${(minPayout / 100).toLocaleString()}`);
        }

        // 3. Fees & Internal Check
        const isInternal = await VirtualAccount.exists({ accountNumber: details.accountNumber });
        const fees = await this.calculateFees(safeAmount, !!isInternal);
        const totalDeducted = safeAmount;

        // 4. Use Atomic findOneAndUpdate to lock funds
        // We use availableBalance logic: clearedBalance - lockedBalance
        const wallet = await Wallet.findOneAndUpdate(
            { 
                userId, 
                $expr: { $gte: [{ $subtract: ["$balance", "$lockedBalance"] }, totalDeducted] } 
            },
            { $inc: { lockedBalance: totalDeducted } },
            { new: true }
        );

        if (!wallet) {
            throw new Error('Insufficient available balance (funds must be cleared/settled first)');
        }

        try {
            // Create Payout Record
            const payout = new Payout({
                userId,
                amount: fees.netAmount,
                fee: fees.fee,
                payrantFee: fees.gatewayFee,
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

            // Create Transaction Record (Pending)
            const transaction = new Transaction({
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
            emailService.sendPayoutRequestAdminNotification(user, payout).catch(err => 
                logger.error('[PayoutService] Failed to send admin notification:', err)
            );

            AdminNotificationService.notifyNewPayout(user, totalDeducted).catch(err =>
                logger.error('[PayoutService] Failed to create admin notification:', err)
            );

            // Process with PalmPay
            try {
                const transferResponse = await palmPayService.initiateTransfer({
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

                logger.info(`PalmPay transfer initiated: ${JSON.stringify(transferResponse)}`);

                if (transferResponse.orderNo) {
                    const orderNo = transferResponse.orderNo;
                    payout.reference = orderNo;
                    payout.externalRef = orderNo;
                    await payout.save();

                    await Transaction.findOneAndUpdate(
                        { 'metadata.payoutId': payout._id },
                        { $set: { reference: orderNo, externalRef: orderNo } }
                    );
                }

                await this.handlePayoutSuccess(payout);
                return payout;

            } catch (gatewayError: any) {
                logger.error('PalmPay transfer failed:', gatewayError);

                await Transaction.findOneAndUpdate(
                    { 'metadata.payoutId': payout._id },
                    { $set: { status: 'failed', narration: `Withdrawal Failed: ${gatewayError.message || 'Gateway Error'}` } }
                );

                throw new Error(gatewayError.message || 'Payment gateway failed to process transfer');
            }

        } catch (error) {
            // Unlock funds on failure (Restore available balance)
            await Wallet.findOneAndUpdate(
                { userId },
                { $inc: { lockedBalance: -totalDeducted } }
            ).catch(e => logger.error('CRITICAL: Failed to unlock funds after error', e));

            throw error;
        }
    }

    /**
     * Handle Payout Success
     */
    async handlePayoutSuccess(payout: any): Promise<void> {
        if (payout.status === 'SUCCESS') return;

        payout.status = 'SUCCESS';
        payout.completedAt = new Date();
        await payout.save();

        // 1. Deduct from balance and clearedBalance, and release lockedBalance
        // Guard: only proceed if lockedBalance is >= payout.totalDebit
        const wallet = await Wallet.findOneAndUpdate(
            { 
                userId: payout.userId,
                lockedBalance: { $gte: payout.totalDebit }
            },
            { 
                $inc: { 
                    balance: -payout.totalDebit, 
                    clearedBalance: -payout.totalDebit,
                    lockedBalance: -payout.totalDebit 
                } 
            },
            { new: true }
        );

        if (!wallet) {
            // This might happen if the wallet was already debited (idempotency) 
            // or if the locked balance is insufficient (should not happen if initiatePayout worked)
            logger.warn(`[PayoutService] Wallet update failed for payout ${payout.reference}. Possibly already processed or insufficient locked balance.`);
            
            // Check if transaction already exists as 'success' to confirm it was already processed
            const existingTxn = await Transaction.findOne({
                $or: [
                    { reference: payout.reference },
                    { 'metadata.payoutId': payout._id }
                ],
                status: 'success'
            });

            if (existingTxn) {
                logger.info(`[PayoutService] Payout ${payout.reference} already has a success transaction. Skipping.`);
                return;
            }

            // If no success transaction exists and wallet update failed, something is wrong
            throw new Error(`Failed to deduct funds from wallet for payout ${payout.reference}. Locked balance might be insufficient.`);
        }
            // Update Transaction Record
            let transaction = await Transaction.findOne({
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
            } else {
                // Fallback: Create new if not found (for old payouts or race conditions)
                await Transaction.create({
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
        
        logger.info(`Payout ${payout.reference} marked as SUCCESS. Funds deducted and unlocked.`);
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

        // Refund wallet (Release locked funds)
        const wallet = await Wallet.findOneAndUpdate(
            { userId: payout.userId },
            { $inc: { lockedBalance: -payout.totalDebit } },
            { new: true }
        );

        if (wallet) {
            logger.info(`Payout ${payout.reference} failed. Locked funds released. Reason: ${reason}`);

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
