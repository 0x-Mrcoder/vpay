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
exports.cronService = exports.CronService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const node_cron_1 = __importDefault(require("node-cron"));
const Transaction_1 = require("../models/Transaction");
const Wallet_1 = require("../models/Wallet");
const Ledger_1 = require("../models/Ledger");
const logger_1 = require("../utils/logger");
const BackupService_1 = require("./BackupService");
const WebhookService_1 = require("./WebhookService");
class CronService {
    constructor() {
        // ─── Deposit Clearance Job ─────────────────────────────────────────────
        this.clearanceTask = null;
        this.clearanceRunning = false;
        this.clearancePaused = false;
        this.clearancePausedAt = null;
        this.clearanceElapsedMs = 0; // ms elapsed before pause
        this.clearanceStartedAt = null;
        this.clearanceLastRun = null;
        this.clearanceLastError = null;
        // ─── Settlement Job (deposit clearance IS the settlement trigger) ──────
        this.settlementPaused = false;
        this.settlementPausedAt = null;
        // ─── Reconciliation & Backup ───────────────────────────────────────────
        this.reconciliationTask = null;
        this.backupTask = null;
    }
    // ──────────────────────────────────────────────────────────────────────
    //  STATUS
    // ──────────────────────────────────────────────────────────────────────
    getCronStatus() {
        const uptimeMs = this.clearanceStartedAt && !this.clearancePaused
            ? this.clearanceElapsedMs + (Date.now() - this.clearanceStartedAt.getTime())
            : this.clearanceElapsedMs;
        return {
            settlementCron: {
                isRunning: this.clearanceRunning && !this.settlementPaused,
                isPaused: this.settlementPaused,
                pausedAt: this.settlementPausedAt,
                elapsedMs: uptimeMs,
                lastRun: this.clearanceLastRun,
                lastError: this.clearanceLastError,
                schedule: 'Every Minute',
            },
            depositClearance: {
                isRunning: this.clearanceRunning && !this.clearancePaused,
                isPaused: this.clearancePaused,
                pausedAt: this.clearancePausedAt,
                lastRun: this.clearanceLastRun,
                lastError: this.clearanceLastError,
            }
        };
    }
    // ──────────────────────────────────────────────────────────────────────
    //  PAUSE settlement cron (deposit clearance stops; timer freezes)
    // ──────────────────────────────────────────────────────────────────────
    pauseSettlement() {
        if (this.settlementPaused) {
            return { success: false, message: 'Settlement cron is already paused.' };
        }
        this.settlementPaused = true;
        this.settlementPausedAt = new Date();
        // Freeze elapsed time counter
        if (this.clearanceStartedAt) {
            this.clearanceElapsedMs += Date.now() - this.clearanceStartedAt.getTime();
            this.clearanceStartedAt = null; // stop accumulating
        }
        logger_1.logger.warn('[CronService] ⏸ Settlement cron PAUSED by admin.');
        return { success: true, message: 'Settlement cron job paused successfully.' };
    }
    // ──────────────────────────────────────────────────────────────────────
    //  RESUME settlement cron (timer continues from where it left off)
    // ──────────────────────────────────────────────────────────────────────
    resumeSettlement() {
        if (!this.settlementPaused) {
            return { success: false, message: 'Settlement cron is not paused.' };
        }
        this.settlementPaused = false;
        this.settlementPausedAt = null;
        // Resume accumulating time from now
        this.clearanceStartedAt = new Date();
        logger_1.logger.info('[CronService] ▶️  Settlement cron RESUMED by admin.');
        return { success: true, message: 'Settlement cron job resumed successfully.' };
    }
    // ──────────────────────────────────────────────────────────────────────
    //  START DEPOSIT CLEARANCE JOB
    // ──────────────────────────────────────────────────────────────────────
    startDepositClearanceJob() {
        this.clearanceRunning = true;
        this.clearanceStartedAt = new Date();
        this.clearanceTask = node_cron_1.default.schedule('* * * * *', async () => {
            // Skip if paused
            if (this.settlementPaused) {
                logger_1.logger.info('[CronService] Settlement cron is paused — skipping tick.');
                return;
            }
            try {
                this.clearanceLastRun = new Date();
                const now = new Date();
                const transactionsToClear = await Transaction_1.Transaction.find({
                    type: 'credit',
                    category: { $in: ['deposit', 'transfer'] },
                    status: 'success',
                    isCleared: false,
                    $or: [
                        { clearedAt: { $lte: now } },
                        { clearedAt: { $exists: false }, createdAt: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
                    ]
                }).populate('userId', 'settlementEnabled').limit(50);
                if (transactionsToClear.length > 0) {
                    logger_1.logger.info(`[CronService] ${transactionsToClear.length} deposits found for potential clearance.`);
                    for (const txn of transactionsToClear) {
                        try {
                            // Check if tenant settlement is enabled
                            const tenant = txn.userId;
                            if (tenant && tenant.settlementEnabled === false) {
                                logger_1.logger.info(`[CronService] Skipping settlement for ${txn.reference} (Tenant ${tenant._id} settlement disabled).`);
                                continue;
                            }
                            let session = null;
                            const { isReplicaSet } = await Promise.resolve().then(() => __importStar(require('../config/database')));
                            if (isReplicaSet) {
                                session = await mongoose_1.default.startSession();
                                session.startTransaction();
                            }
                            try {
                                const updated = await Transaction_1.Transaction.findOneAndUpdate({ _id: txn._id, isCleared: false }, { $set: { isCleared: true } }, { new: true, session });
                                if (!updated) {
                                    logger_1.logger.warn(`[CronService] Txn ${txn.reference} already cleared.`);
                                    if (session)
                                        await session.abortTransaction();
                                    continue;
                                }
                                const result = await Wallet_1.Wallet.findOneAndUpdate({ _id: txn.walletId }, { $inc: { clearedBalance: txn.amount, lockedBalance: -txn.amount } }, { new: true, session });
                                if (result) {
                                    // Create Ledger record for the clearance
                                    await new Ledger_1.Ledger({
                                        walletId: txn.walletId,
                                        userId: txn.userId,
                                        transactionId: txn._id,
                                        reference: `CLR-${txn.reference}`,
                                        amount: txn.amount,
                                        type: 'CREDIT',
                                        purpose: 'SETTLEMENT',
                                        balanceBefore: result.balance,
                                        balanceAfter: result.balance, // Total balance doesn't change during clearance
                                    }).save({ session });
                                    if (session)
                                        await session.commitTransaction();
                                    logger_1.logger.info(`[CronService] Cleared ${txn.reference} → ₦${txn.amount}`);
                                }
                                else {
                                    throw new Error(`Wallet not found for walletId: ${txn.walletId}`);
                                }
                            }
                            catch (err) {
                                if (session)
                                    await session.abortTransaction();
                                throw err;
                            }
                            finally {
                                if (session)
                                    session.endSession();
                            }
                        }
                        catch (err) {
                            logger_1.logger.error(`[CronService] Failed to clear ${txn.reference}`, err);
                            this.clearanceLastError = `Txn ${txn.reference}: ${err.message}`;
                        }
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('[CronService] Deposit Clearance Job error', error);
                this.clearanceLastError = error.message;
            }
        });
        logger_1.logger.info('[CronService] ✅ Deposit Clearance Job scheduled (Every Minute).');
    }
    // ──────────────────────────────────────────────────────────────────────
    //  RECONCILIATION JOB
    // ──────────────────────────────────────────────────────────────────────
    startReconciliationJob() {
        this.reconciliationTask = node_cron_1.default.schedule('*/5 * * * *', async () => {
            if (this.settlementPaused)
                return; // also respects pause
            try {
                await WebhookService_1.webhookService.reconcileMissedDeposits();
            }
            catch (error) {
                logger_1.logger.error('[CronService] Reconciliation job failed', error);
            }
        });
        logger_1.logger.info('[CronService] 🔄 Reconciliation Job scheduled (Every 5 minutes).');
    }
    // ──────────────────────────────────────────────────────────────────────
    //  BACKUP JOB
    // ──────────────────────────────────────────────────────────────────────
    startBackupJob() {
        this.backupTask = node_cron_1.default.schedule('0 * * * *', async () => {
            try {
                logger_1.logger.info('[CronService] Running Hourly Database Backup...');
                await BackupService_1.backupService.createAndUploadBackup();
                logger_1.logger.info('[CronService] Hourly Backup completed.');
            }
            catch (error) {
                logger_1.logger.error('[CronService] Backup Job error', error);
            }
        });
        logger_1.logger.info('[CronService] 💾 Backup Job scheduled (Every Hour).');
    }
}
exports.CronService = CronService;
exports.cronService = new CronService();
exports.default = exports.cronService;
//# sourceMappingURL=CronService.js.map