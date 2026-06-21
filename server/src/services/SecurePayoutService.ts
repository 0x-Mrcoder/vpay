import mongoose from 'mongoose';
import { Queue, Worker, Job } from 'bullmq';
import { Wallet, Payout, Transaction, Ledger, SystemSetting } from '../models';
import { palmPayService } from './PalmPayService';
import { logger } from '../utils/logger';
import { isReplicaSet } from '../config/database';

// ============================================
// Lazy BullMQ Setup — only connects if Redis is available
// ============================================
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

let payoutQueue: Queue | null = null;
let payoutWorker: Worker | null = null;
let redisAvailable = false;
let redisChecked = false;

async function checkRedisAvailability(): Promise<boolean> {
    if (redisChecked) return redisAvailable;
    redisChecked = true;

    try {
        const { default: IORedis } = await import('ioredis');
        const testClient = new IORedis({
            host: connection.host,
            port: connection.port,
            maxRetriesPerRequest: 0,
            connectTimeout: 1000,
            lazyConnect: true,
            retryStrategy: () => null,
        });

        // Handle the error event to prevent "Unhandled error event" notice
        testClient.on('error', () => {});

        try {
            await testClient.connect();
            await testClient.ping();
            await testClient.quit();
            redisAvailable = true;
            logger.info('[SecurePayoutService] ✅ Redis is available — BullMQ queue enabled');
        } catch (err) {
            redisAvailable = false;
            logger.warn('[SecurePayoutService] ⚠️  Redis not available — Secure payout queue DISABLED. Payouts will use direct processing.');
            // Ensure client is closed
            try { testClient.disconnect(); } catch {}
        }
    } catch (err) {
        redisAvailable = false;
        logger.warn('[SecurePayoutService] ⚠️  Failed to initialize Redis client.');
    }

    return redisAvailable;
}

async function getQueue(): Promise<Queue | null> {
    if (payoutQueue) return payoutQueue;
    const available = await checkRedisAvailability();
    if (!available) return null;

    payoutQueue = new Queue('secure-payouts', {
        connection,
        defaultJobOptions: { removeOnComplete: true, attempts: 3 },
    });
    payoutQueue.on('error', (err) => {
        logger.error('[BullMQ] Queue Error:', err.message);
    });
    return payoutQueue;
}

async function ensureWorker(): Promise<void> {
    if (payoutWorker) return;
    const available = await checkRedisAvailability();
    if (!available) return;

    payoutWorker = new Worker('secure-payouts', async (job: Job) => {
        const { payoutId } = job.data;

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

            // SUCCESS Path
            payout.status = 'SUCCESS';
            payout.externalRef = transferResponse.orderNo || payout.externalRef;
            await payout.save();

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

    payoutWorker.on('error', (err) => {
        logger.error('[BullMQ] Worker Error:', err.message);
    });

    logger.info('[SecurePayoutService] ✅ BullMQ Worker started');
}

// Boot the worker lazily on first import (non-blocking)
setImmediate(() => ensureWorker().catch(() => {}));

export { payoutQueue, payoutWorker };

export class SecurePayoutService {

    /**
     * POST /payouts/request logic
     * @param amountKobo Amount in Kobo
     */
    async requestPayout(
        userId: string,
        idempotencyKey: string,
        payload: { amount: number; bankCode: string; accountNumber: string; accountName: string; narration?: string }
    ) {
        const { bankCode, accountNumber, accountName, narration } = payload;
        const amountKobo = Math.round(Number(payload.amount));

        // 0. Check Tier Limits
        const { limitService } = await import('./LimitService');
        await limitService.checkTierLimits(userId, 'withdrawal', amountKobo);

        // 1. Check Idempotency Key first
        const existingPayout = await Payout.findOne({ idempotencyKey, userId });
        if (existingPayout) {
            return { status: 'IDEMPOTENT_HIT', payout: existingPayout };
        }

        // Calculate fees matching PayoutService (Tiered flat fee)
        const settings = await SystemSetting.findOne();
        const payoutSettings = settings?.payout || {
            payoutTierStep: 2500,
            payoutTierFeeStep: 25,
        };

        const tierStepKobo = (Number(payoutSettings.payoutTierStep) || 2500) * 100;
        const tierFeeStepKobo = (Number(payoutSettings.payoutTierFeeStep) || 25) * 100;
        
        // Fee calculation logic matched with PayoutService.ts
        const feeKobo = Math.ceil(amountKobo / tierStepKobo) * tierFeeStepKobo;
        const totalDebitKobo = amountKobo + feeKobo;

        // Validation for Minimum Payout (matching normal payout)
        const minPayoutKobo = payoutSettings.minAmount || 100000; // 1,000 Naira default
        if (amountKobo < minPayoutKobo) {
            throw new Error(`Minimum withdrawal amount is ₦${(minPayoutKobo / 100).toLocaleString()}`);
        }

        let payoutId: string;

        // 2. Atomic Database Transaction (Handles standalone MongoDB fallback)
        let session: any = null;
        if (isReplicaSet) {
            try {
                session = await mongoose.startSession();
                session.startTransaction();
                logger.info('[SecurePayoutService] ✅ Transaction started');
            } catch (e: any) {
                logger.warn(`[SecurePayoutService] Failed to start transaction: ${e.message}`);
                session = null;
            }
        } else {
            logger.warn('[SecurePayoutService] ⚠️ Standalone MongoDB detected. Proceeding WITHOUT transaction.');
        }

        try {
            const wallet = await Wallet.findOne({ userId }).session(session);
            if (!wallet) throw new Error('Wallet not found');

            // Available balance check MUST use clearedBalance (settled funds)
            const availableBalance = wallet.balance - wallet.lockedBalance;
            if (availableBalance < totalDebitKobo) {
                throw new Error('Insufficient available balance (funds must be cleared/settled first)');
            }

            // Deduct available, move to locked
            wallet.lockedBalance += totalDebitKobo;
            await wallet.save({ session });

            // Create Payout Record
            const payout = new Payout({
                userId,
                amount: amountKobo, // Store in kobo
                fee: feeKobo,      // Store in kobo
                totalDebit: totalDebitKobo,
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
                amount: totalDebitKobo,
                fee: feeKobo,
                balanceBefore: wallet.balance,
                balanceAfter: wallet.balance - totalDebitKobo,
                reference: payout.reference,
                narration: narration || `Payout to ${accountNumber}`,
                status: 'pending',
                isCleared: false,
                metadata: { 
                    payoutId: payout._id, 
                    idempotencyKey,
                    accountName,
                    accountNumber,
                    bankCode,
                }
            });
            await transaction.save({ session });

            // Create Immutable Ledger entry representing the hold/lock
            const ledger = new Ledger({
                walletId: wallet._id,
                userId,
                transactionId: transaction._id,
                reference: `LOCK-${payout.reference}`,
                amount: totalDebitKobo,
                type: 'DEBIT',
                purpose: 'PAYOUT_LOCK',
                balanceBefore: wallet.balance,
                balanceAfter: wallet.balance - totalDebitKobo,
            });
            await ledger.save({ session });

            if (session) await session.commitTransaction();

        } catch (error) {
            if (session) await session.abortTransaction();
            throw error;
        } finally {
            if (session) session.endSession();
        }

        // 3. Push job to queue if Redis is available, otherwise process directly
        const queue = await getQueue();
        if (queue) {
            await queue.add('process-payout', { payoutId }, { removeOnComplete: true, attempts: 3 });
        } else {
            // Fallback: process directly without queue (development / no-Redis mode)
            logger.warn('[SecurePayoutService] Redis unavailable — processing payout directly (no queue)');
            setImmediate(() => this.processPayoutDirectly(payoutId).catch(err =>
                logger.error('[SecurePayoutService] Direct payout processing failed:', err)
            ));
        }

        return {
            status: 'ACCEPTED',
            message: 'Payout is safely locked and queued for processing.',
            payoutId
        };
    }

    /**
     * Direct payout processing fallback (when Redis/BullMQ is unavailable)
     */
    async processPayoutDirectly(payoutId: string) {
        const payout = await Payout.findById(payoutId);
        if (!payout || payout.status !== 'LOCKED') {
            logger.warn(`Direct processing skipped, payout not found or not LOCKED: ${payoutId}`);
            return;
        }

        payout.status = 'PROCESSING';
        await payout.save();

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

            payout.status = 'SUCCESS';
            payout.externalRef = transferResponse.orderNo || payout.externalRef;
            await payout.save();

            await finalizePayoutSuccess(payout);
        } catch (error: any) {
            logger.error(`Payout ${payout.reference} failed via Gateway:`, error);
            payout.status = 'FAILED';
            payout.failureReason = error.message;
            await payout.save();

            await finalizePayoutReversal(payout);
        }
    }
}

export const securePayoutService = new SecurePayoutService();

// ============================================
// Finalization Helpers
// ============================================

async function finalizePayoutSuccess(payout: any) {
    let session: any = null;
    if (isReplicaSet) {
        try {
            session = await mongoose.startSession();
            session.startTransaction();
        } catch (e) {
            session = null;
        }
    }

    try {
        const wallet = await Wallet.findOne({ userId: payout.userId }).session(session);
        if (!wallet) throw new Error('Wallet not found');

        wallet.lockedBalance -= payout.totalDebit;
        wallet.balance -= payout.totalDebit;
        wallet.clearedBalance -= payout.totalDebit;
        await wallet.save({ session });

        await Transaction.findOneAndUpdate(
            { 'metadata.payoutId': payout._id },
            { $set: { status: 'success', isCleared: true, clearedAt: new Date() } },
            { session }
        );

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

        if (session) await session.commitTransaction();
    } catch (err) {
        if (session) await session.abortTransaction();
        logger.error('CRITICAL: Failed to finalize payout success DB sync:', err);
    } finally {
        if (session) session.endSession();
    }
}

async function finalizePayoutReversal(payout: any) {
    let session: any = null;
    if (isReplicaSet) {
        try {
            session = await mongoose.startSession();
            session.startTransaction();
        } catch (e) {
            session = null;
        }
    }

    try {
        const wallet = await Wallet.findOne({ userId: payout.userId }).session(session);
        if (!wallet) throw new Error('Wallet not found for reversal');

        wallet.lockedBalance -= payout.totalDebit;
        await wallet.save({ session });

        await Transaction.findOneAndUpdate(
            { 'metadata.payoutId': payout._id },
            { $set: { status: 'failed' } },
            { session }
        );

        await new Ledger({
            walletId: wallet._id,
            userId: payout.userId,
            transactionId: payout._id,
            reference: `REVERSAL-${payout.reference}`,
            amount: payout.totalDebit,
            type: 'CREDIT',
            purpose: 'PAYOUT_REVERSED',
            balanceBefore: wallet.balance - payout.totalDebit,
            balanceAfter: wallet.balance,
        }).save({ session });

        if (session) await session.commitTransaction();
    } catch (err) {
        if (session) await session.abortTransaction();
        logger.error('CRITICAL: Failed to reverse payout DB sync:', err);
    } finally {
        if (session) session.endSession();
    }
}
