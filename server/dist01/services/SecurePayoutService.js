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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securePayoutService = exports.SecurePayoutService = exports.payoutWorker = exports.payoutQueue = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bullmq_1 = require("bullmq");
const models_1 = require("../models");
const PalmPayService_1 = require("./PalmPayService");
const logger_1 = require("../utils/logger");
const database_1 = require("../config/database");
// ============================================
// Lazy BullMQ Setup — only connects if Redis is available
// ============================================
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};
let payoutQueue = null;
exports.payoutQueue = payoutQueue;
let payoutWorker = null;
exports.payoutWorker = payoutWorker;
let redisAvailable = false;
let redisChecked = false;
async function checkRedisAvailability() {
    if (redisChecked)
        return redisAvailable;
    redisChecked = true;
    try {
        const { default: IORedis } = await Promise.resolve().then(() => __importStar(require('ioredis')));
        const testClient = new IORedis({
            host: connection.host,
            port: connection.port,
            maxRetriesPerRequest: 0,
            connectTimeout: 1000,
            lazyConnect: true,
            retryStrategy: () => null,
        });
        // Handle the error event to prevent "Unhandled error event" notice
        testClient.on('error', () => { });
        try {
            await testClient.connect();
            await testClient.ping();
            await testClient.quit();
            redisAvailable = true;
            logger_1.logger.info('[SecurePayoutService] ✅ Redis is available — BullMQ queue enabled');
        }
        catch (err) {
            redisAvailable = false;
            logger_1.logger.warn('[SecurePayoutService] ⚠️  Redis not available — Secure payout queue DISABLED. Payouts will use direct processing.');
            // Ensure client is closed
            try {
                testClient.disconnect();
            }
            catch { }
        }
    }
    catch (err) {
        redisAvailable = false;
        logger_1.logger.warn('[SecurePayoutService] ⚠️  Failed to initialize Redis client.');
    }
    return redisAvailable;
}
async function getQueue() {
    if (payoutQueue)
        return payoutQueue;
    const available = await checkRedisAvailability();
    if (!available)
        return null;
    exports.payoutQueue = payoutQueue = new bullmq_1.Queue('secure-payouts', {
        connection,
        defaultJobOptions: { removeOnComplete: true, attempts: 3 },
    });
    payoutQueue.on('error', (err) => {
        logger_1.logger.error('[BullMQ] Queue Error:', err.message);
    });
    return payoutQueue;
}
async function ensureWorker() {
    if (payoutWorker)
        return;
    const available = await checkRedisAvailability();
    if (!available)
        return;
    exports.payoutWorker = payoutWorker = new bullmq_1.Worker('secure-payouts', async (job) => {
        const { payoutId } = job.data;
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
            // SUCCESS Path
            payout.status = 'SUCCESS';
            payout.externalRef = transferResponse.orderNo || payout.externalRef;
            await payout.save();
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
    payoutWorker.on('error', (err) => {
        logger_1.logger.error('[BullMQ] Worker Error:', err.message);
    });
    logger_1.logger.info('[SecurePayoutService] ✅ BullMQ Worker started');
}
// Boot the worker lazily on first import (non-blocking)
setImmediate(() => ensureWorker().catch(() => { }));
class SecurePayoutService {
    /**
     * POST /payouts/request logic
     * @param amountKobo Amount in Kobo
     */
    async requestPayout(userId, idempotencyKey, payload) {
        const { bankCode, accountNumber, accountName, narration } = payload;
        const amountKobo = Math.round(Number(payload.amount));
        // 0. Check Tier Limits
        const { limitService } = await Promise.resolve().then(() => __importStar(require('./LimitService')));
        await limitService.checkTierLimits(userId, 'withdrawal', amountKobo);
        // 1. Check Idempotency Key first
        const existingPayout = await models_1.Payout.findOne({ idempotencyKey, userId });
        if (existingPayout) {
            return { status: 'IDEMPOTENT_HIT', payout: existingPayout };
        }
        // Calculate fees matching PayoutService (Tiered flat fee)
        const settings = await models_1.SystemSetting.findOne();
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
        let payoutId;
        // 2. Atomic Database Transaction (Handles standalone MongoDB fallback)
        let session = null;
        if (database_1.isReplicaSet) {
            try {
                session = await mongoose_1.default.startSession();
                session.startTransaction();
                logger_1.logger.info('[SecurePayoutService] ✅ Transaction started');
            }
            catch (e) {
                logger_1.logger.warn(`[SecurePayoutService] Failed to start transaction: ${e.message}`);
                session = null;
            }
        }
        else {
            logger_1.logger.warn('[SecurePayoutService] ⚠️ Standalone MongoDB detected. Proceeding WITHOUT transaction.');
        }
        try {
            const wallet = await models_1.Wallet.findOne({ userId }).session(session);
            if (!wallet)
                throw new Error('Wallet not found');
            // Available balance check MUST use clearedBalance (settled funds)
            const availableBalance = wallet.balance - wallet.lockedBalance;
            if (availableBalance < totalDebitKobo) {
                throw new Error('Insufficient available balance (funds must be cleared/settled first)');
            }
            // Deduct available, move to locked
            wallet.lockedBalance += totalDebitKobo;
            await wallet.save({ session });
            // Create Payout Record
            const payout = new models_1.Payout({
                userId,
                amount: amountKobo, // Store in kobo
                fee: feeKobo, // Store in kobo
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
            const transaction = new models_1.Transaction({
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
            const ledger = new models_1.Ledger({
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
            if (session)
                await session.commitTransaction();
        }
        catch (error) {
            if (session)
                await session.abortTransaction();
            throw error;
        }
        finally {
            if (session)
                session.endSession();
        }
        // 3. Push job to queue if Redis is available, otherwise process directly
        const queue = await getQueue();
        if (queue) {
            await queue.add('process-payout', { payoutId }, { removeOnComplete: true, attempts: 3 });
        }
        else {
            // Fallback: process directly without queue (development / no-Redis mode)
            logger_1.logger.warn('[SecurePayoutService] Redis unavailable — processing payout directly (no queue)');
            setImmediate(() => this.processPayoutDirectly(payoutId).catch(err => logger_1.logger.error('[SecurePayoutService] Direct payout processing failed:', err)));
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
    async processPayoutDirectly(payoutId) {
        const payout = await models_1.Payout.findById(payoutId);
        if (!payout || payout.status !== 'LOCKED') {
            logger_1.logger.warn(`Direct processing skipped, payout not found or not LOCKED: ${payoutId}`);
            return;
        }
        payout.status = 'PROCESSING';
        await payout.save();
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
            payout.status = 'SUCCESS';
            payout.externalRef = transferResponse.orderNo || payout.externalRef;
            await payout.save();
            await finalizePayoutSuccess(payout);
        }
        catch (error) {
            logger_1.logger.error(`Payout ${payout.reference} failed via Gateway:`, error);
            payout.status = 'FAILED';
            payout.failureReason = error.message;
            await payout.save();
            await finalizePayoutReversal(payout);
        }
    }
}
exports.SecurePayoutService = SecurePayoutService;
exports.securePayoutService = new SecurePayoutService();
// ============================================
// Finalization Helpers
// ============================================
async function finalizePayoutSuccess(payout) {
    let session = null;
    if (database_1.isReplicaSet) {
        try {
            session = await mongoose_1.default.startSession();
            session.startTransaction();
        }
        catch (e) {
            session = null;
        }
    }
    try {
        const wallet = await models_1.Wallet.findOne({ userId: payout.userId }).session(session);
        if (!wallet)
            throw new Error('Wallet not found');
        wallet.lockedBalance -= payout.totalDebit;
        wallet.balance -= payout.totalDebit;
        wallet.clearedBalance -= payout.totalDebit;
        await wallet.save({ session });
        await models_1.Transaction.findOneAndUpdate({ 'metadata.payoutId': payout._id }, { $set: { status: 'success', isCleared: true, clearedAt: new Date() } }, { session });
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
        if (session)
            await session.commitTransaction();
    }
    catch (err) {
        if (session)
            await session.abortTransaction();
        logger_1.logger.error('CRITICAL: Failed to finalize payout success DB sync:', err);
    }
    finally {
        if (session)
            session.endSession();
    }
}
async function finalizePayoutReversal(payout) {
    let session = null;
    if (database_1.isReplicaSet) {
        try {
            session = await mongoose_1.default.startSession();
            session.startTransaction();
        }
        catch (e) {
            session = null;
        }
    }
    try {
        const wallet = await models_1.Wallet.findOne({ userId: payout.userId }).session(session);
        if (!wallet)
            throw new Error('Wallet not found for reversal');
        wallet.lockedBalance -= payout.totalDebit;
        await wallet.save({ session });
        await models_1.Transaction.findOneAndUpdate({ 'metadata.payoutId': payout._id }, { $set: { status: 'failed' } }, { session });
        await new models_1.Ledger({
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
        if (session)
            await session.commitTransaction();
    }
    catch (err) {
        if (session)
            await session.abortTransaction();
        logger_1.logger.error('CRITICAL: Failed to reverse payout DB sync:', err);
    }
    finally {
        if (session)
            session.endSession();
    }
}
//# sourceMappingURL=SecurePayoutService.js.map