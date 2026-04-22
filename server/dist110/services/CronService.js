"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronService = exports.CronService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Transaction_1 = require("../models/Transaction");
const Wallet_1 = require("../models/Wallet");
const SystemSetting_1 = require("../models/SystemSetting");
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
                // Weekend check from settings
                const settings = await SystemSetting_1.SystemSetting.findOne();
                const weekendEnabled = settings?.globalSettlement?.weekendSettlementEnabled ?? true;
                if (!weekendEnabled) {
                    const day = new Date().getDay();
                    if (day === 0 || day === 6) {
                        logger_1.logger.info('[CronService] Weekend settlement disabled — skipping.');
                        return;
                    }
                }
                logger_1.logger.info('[CronService] Running Deposit Clearance Job...');
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
                }).limit(50);
                if (transactionsToClear.length > 0) {
                    logger_1.logger.info(`[CronService] ${transactionsToClear.length} deposits pending clearance.`);
                    for (const txn of transactionsToClear) {
                        try {
                            const updated = await Transaction_1.Transaction.findOneAndUpdate({ _id: txn._id, isCleared: false }, { $set: { isCleared: true } }, { new: true });
                            if (!updated) {
                                logger_1.logger.warn(`[CronService] Txn ${txn.reference} already cleared.`);
                                continue;
                            }
                            const result = await Wallet_1.Wallet.findOneAndUpdate({ _id: txn.walletId }, { $inc: { clearedBalance: txn.amount } }, { new: true });
                            if (result) {
                                logger_1.logger.info(`[CronService] Cleared ${txn.reference} → ₦${txn.amount}`);
                            }
                            else {
                                logger_1.logger.error(`[CronService] Wallet not found for ${txn.reference}`);
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