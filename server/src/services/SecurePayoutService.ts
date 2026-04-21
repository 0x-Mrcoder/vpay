import mongoose from 'mongoose';
import { Queue, Worker, Job } from 'bullmq';
import { Wallet, Payout, Transaction, Ledger, SystemSetting } from '../models';
import { palmPayService } from './PalmPayService';
import { logger } from '../utils/logger';

// 1. Setup BullMQ Queue
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const payoutQueue = new Queue('secure-payouts', { connection });

export class SecurePayoutService {

    /**
     * POST /payouts/request logic
     */
    async requestPayout(
        userId: string,
        idempotencyKey: string,
        payload: { amount: number; bankCode: string; accountNumber: string; accountName: string; narration?: string }
    ) {
        const { amount, bankCode, accountNumber, accountName, narration } = payload;

        // 1. Check Idempotency Key first (without transaction to fail fast)
        const existingPayout = await Payout.findOne({ idempotencyKey, userId });
        if (existingPayout) {
            return {
                status: 'IDEMPOTENT_HIT',
                payout: existingPayout
            };
        }

        // Calculate fees
        const settings = await SystemSetting.findOne();
        const payoutTierStep = Number(settings?.payout?.payoutTierStep) || 2500;
        const payoutTierFeeStep = Number(settings?.payout?.payoutTierFeeStep) || 25;
        // Tiered flat fee logic:
        const fee = Math.ceil(amount / (payoutTierStep * 100)) * (payoutTierFeeStep * 100);
        const totalDebit = amount + fee;

        let payoutId: string;

        // 2. Atomic Database Transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Lock the wallet document using findOneAndUpdate to guarantee atomic read-modify-write if optimisticConcurrency isn't enough
            const wallet = await Wallet.findOne({ userId }).session(session);
            if (!wallet) throw new Error('Wallet not found');

            const availableBalance = wallet.balance - wallet.lockedBalance;
            if (availableBalance < totalDebit) {
                throw new Error('Insufficient available balance');
            }

            // Deduct available, move to locked
            wallet.lockedBalance += totalDebit;
            await wallet.save({ session }); // Will use optimistic concurrency

            // Create Payout Record
            const payout = new Payout({
                userId,
                amount,
                fee,
                totalDebit,
                bankCode,
                accountNumber,
                accountName,
                payoutType: 'external',
                reference: `SEC-PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                idempotencyKey,
                status: 'LOCKED',
                retryCount: 0,
            });
            await payout.save({ session });
            payoutId = payout._id.toString();

            // Create Transaction Record (LOCKED)
            const transaction = new Transaction({
                userId,
                walletId: wallet._id,
                type: 'debit',
                category: 'withdrawal',
                amount: totalDebit,
                fee,
                balanceBefore: wallet.balance,
                balanceAfter: wallet.balance, // still same because it is locked, not fully deducted
                reference: payout.reference,
                narration: narration || `Payout to ${accountNumber}`,
                status: 'pending',
                isCleared: false,
                metadata: { payoutId: payout._id, idempotencyKey }
            });
            await transaction.save({ session });

            // Create Immutable Ledger entry representing the hold/lock
            const ledger = new Ledger({
                walletId: wallet._id,
                userId,
                transactionId: transaction._id,
                reference: `LOCK-${payout.reference}`,
                amount: totalDebit,
                type: 'DEBIT',
                purpose: 'PAYOUT_LOCK',
                balanceBefore: wallet.balance,
                balanceAfter: wallet.balance - totalDebit, // representing available balance impact
            });
            await ledger.save({ session });

            await session.commitTransaction();

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        // 3. Push job to queue (outside of transaction guarantee it exists in DB first)
        await payoutQueue.add('process-payout', { payoutId }, { removeOnComplete: true, attempts: 3 });

        return {
            status: 'ACCEPTED',
            message: 'Payout is safely locked and queued for processing.',
            payoutId
        };
    }
}

export const securePayoutService = new SecurePayoutService();

// ============================================
// Worker Logic (Runs in background)
// ============================================

export const payoutWorker = new Worker('secure-payouts', async (job: Job) => {
    const { payoutId } = job.data;

    // Retrieve the payout
    const payout = await Payout.findById(payoutId);
    if (!payout || payout.status !== 'LOCKED') {
        logger.warn(`Job skipped, payout not found or not in LOCKED state: ${payoutId}`);
        return;
    }

    // 1. Update status to PROCESSING
    payout.status = 'PROCESSING';
    await payout.save();

    // 2. Call Payment Gateway
    try {
        const transferResponse = await palmPayService.initiateTransfer({
            amount: payout.amount,
            currency: 'NGN',
            transactionReference: payout.reference,
            description: `Payout to ${payout.accountNumber}`,
            beneficiary: {
                accountNumber: payout.accountNumber,
                bankCode: payout.bankCode,
                accountName: payout.accountName
            }
        });

        // SUCCESS Path (Or Gateway Accepted Path)
        payout.status = 'SUCCESS';
        payout.externalRef = transferResponse.orderNo || payout.externalRef;
        await payout.save();

        // Finalize balances
        await finalizePayoutSuccess(payout);

    } catch (error: any) {
        // FAILED Path
        logger.error(`Payout ${payout.reference} failed via Gateway:`, error);
        payout.status = 'FAILED';
        payout.failureReason = error.message;
        await payout.save();

        await finalizePayoutReversal(payout);
    }
}, { connection });

// Success finalization helper
async function finalizePayoutSuccess(payout: any) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const wallet = await Wallet.findOne({ userId: payout.userId }).session(session);
        if (!wallet) throw new Error('Wallet not found');

        // Deduct from locked, and deduct from total balance permanently
        wallet.lockedBalance -= payout.totalDebit;
        wallet.balance -= payout.totalDebit;
        await wallet.save({ session });

        // Update Transaction
        await Transaction.findOneAndUpdate(
            { 'metadata.payoutId': payout._id },
            { $set: { status: 'success', isCleared: true, clearedAt: new Date() } },
            { session }
        );

        // Ledger entry for permanent deduction
        await new Ledger({
            walletId: wallet._id,
            userId: payout.userId,
            transactionId: payout._id,
            reference: `SUCCESS-${payout.reference}`,
            amount: payout.totalDebit,
            type: 'DEBIT',
            purpose: 'PAYOUT_SUCCESS',
            balanceBefore: wallet.balance + payout.totalDebit,
            balanceAfter: wallet.balance,
        }).save({ session });

        await session.commitTransaction();
    } catch (err) {
        await session.abortTransaction();
        logger.error('CRITICAL: Failed to finalize payout success DB sync:', err);
    } finally {
        session.endSession();
    }
}

// Failure Reversal helper
async function finalizePayoutReversal(payout: any) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const wallet = await Wallet.findOne({ userId: payout.userId }).session(session);
        if (!wallet) throw new Error('Wallet not found for reversal');

        // Unlock funds safely
        wallet.lockedBalance -= payout.totalDebit;
        await wallet.save({ session });

        // Mark Transaction failed
        await Transaction.findOneAndUpdate(
            { 'metadata.payoutId': payout._id },
            { $set: { status: 'failed' } },
            { session }
        );

        // Ledger Entry for Reversal
        await new Ledger({
            walletId: wallet._id,
            userId: payout.userId,
            transactionId: payout._id,
            reference: `REVERSAL-${payout.reference}`,
            amount: payout.totalDebit,
            type: 'CREDIT',
            purpose: 'PAYOUT_REVERSED',
            balanceBefore: wallet.balance - payout.totalDebit, // Re-adding conceptually to available
            balanceAfter: wallet.balance,
        }).save({ session });

        await session.commitTransaction();
    } catch (err) {
        await session.abortTransaction();
        logger.error('CRITICAL: Failed to reverse payout DB sync:', err);
    } finally {
        session.endSession();
    }
}
