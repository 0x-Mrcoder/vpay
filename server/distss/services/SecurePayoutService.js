"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payoutWorker = exports.securePayoutService = exports.SecurePayoutService = exports.payoutQueue = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bullmq_1 = require("bullmq");
const models_1 = require("../models");
const PalmPayService_1 = require("./PalmPayService");
const logger_1 = require("../utils/logger");
// 1. Setup BullMQ Queue
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};
exports.payoutQueue = new bullmq_1.Queue('secure-payouts', { connection });
exports.payoutQueue.on('error', (err) => {
    console.error('[BullMQ] Queue Error:', err);
});
class SecurePayoutService {
    /**
     * POST /payouts/request logic
     */
    async requestPayout(userId, idempotencyKey, payload) {
        const { amount, bankCode, accountNumber, accountName, narration } = payload;
        // 1. Check Idempotency Key first (without transaction to fail fast)
        const existingPayout = await models_1.Payout.findOne({ idempotencyKey, userId });
        if (existingPayout) {
            return {
                status: 'IDEMPOTENT_HIT',
                payout: existingPayout
            };
        }
        // Calculate fees
        const settings = await models_1.SystemSetting.findOne();
        const payoutTierStep = Number(settings?.payout?.payoutTierStep) || 2500;
        const payoutTierFeeStep = Number(settings?.payout?.payoutTierFeeStep) || 25;
        // Tiered flat fee logic:
        const fee = Math.ceil(amount / (payoutTierStep * 100)) * (payoutTierFeeStep * 100);
        const totalDebit = amount + fee;
        let payoutId;
        // 2. Atomic Database Transaction
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            // Lock the wallet document using findOneAndUpdate to guarantee atomic read-modify-write if optimisticConcurrency isn't enough
            const wallet = await models_1.Wallet.findOne({ userId }).session(session);
            if (!wallet)
                throw new Error('Wallet not found');
            const availableBalance = wallet.balance - wallet.lockedBalance;
            if (availableBalance < totalDebit) {
                throw new Error('Insufficient available balance');
            }
            // Deduct available, move to locked
            wallet.lockedBalance += totalDebit;
            await wallet.save({ session }); // Will use optimistic concurrency
            // Create Payout Record
            const payout = new models_1.Payout({
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
            const transaction = new models_1.Transaction({
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
            const ledger = new models_1.Ledger({
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
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
        // 3. Push job to queue (outside of transaction guarantee it exists in DB first)
        await exports.payoutQueue.add('process-payout', { payoutId }, { removeOnComplete: true, attempts: 3 });
        return {
            status: 'ACCEPTED',
            message: 'Payout is safely locked and queued for processing.',
            payoutId
        };
    }
}
exports.SecurePayoutService = SecurePayoutService;
exports.securePayoutService = new SecurePayoutService();
// ============================================
// Worker Logic (Runs in background)
// ============================================
exports.payoutWorker = new bullmq_1.Worker('secure-payouts', async (job) => {
    const { payoutId } = job.data;
    // Retrieve the payout
    const payout = await models_1.Payout.findById(payoutId);
    if (!payout || payout.status !== 'LOCKED') {
        logger_1.logger.warn(`Job skipped, payout not found or not in LOCKED state: ${payoutId}`);
        return;
    }
    // 1. Update status to PROCESSING
    payout.status = 'PROCESSING';
    await payout.save();
    // 2. Call Payment Gateway
    try {
        const transferResponse = await PalmPayService_1.palmPayService.initiateTransfer({
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
    }
    catch (error) {
        // FAILED Path
        logger_1.logger.error(`Payout ${payout.reference} failed via Gateway:`, error);
        payout.status = 'FAILED';
        payout.failureReason = error.message;
        await payout.save();
        await finalizePayoutReversal(payout);
    }
}, { connection });
exports.payoutWorker.on('error', (err) => {
    console.error('[BullMQ] Worker Error:', err);
});
// Success finalization helper
async function finalizePayoutSuccess(payout) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const wallet = await models_1.Wallet.findOne({ userId: payout.userId }).session(session);
        if (!wallet)
            throw new Error('Wallet not found');
        // Deduct from locked, and deduct from total balance permanently
        wallet.lockedBalance -= payout.totalDebit;
        wallet.balance -= payout.totalDebit;
        await wallet.save({ session });
        // Update Transaction
        await models_1.Transaction.findOneAndUpdate({ 'metadata.payoutId': payout._id }, { $set: { status: 'success', isCleared: true, clearedAt: new Date() } }, { session });
        // Ledger entry for permanent deduction
        await new models_1.Ledger({
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
    }
    catch (err) {
        await session.abortTransaction();
        logger_1.logger.error('CRITICAL: Failed to finalize payout success DB sync:', err);
    }
    finally {
        session.endSession();
    }
}
// Failure Reversal helper
async function finalizePayoutReversal(payout) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const wallet = await models_1.Wallet.findOne({ userId: payout.userId }).session(session);
        if (!wallet)
            throw new Error('Wallet not found for reversal');
        // Unlock funds safely
        wallet.lockedBalance -= payout.totalDebit;
        await wallet.save({ session });
        // Mark Transaction failed
        await models_1.Transaction.findOneAndUpdate({ 'metadata.payoutId': payout._id }, { $set: { status: 'failed' } }, { session });
        // Ledger Entry for Reversal
        await new models_1.Ledger({
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
    }
    catch (err) {
        await session.abortTransaction();
        logger_1.logger.error('CRITICAL: Failed to reverse payout DB sync:', err);
    }
    finally {
        session.endSession();
    }
}
//# sourceMappingURL=SecurePayoutService.js.map