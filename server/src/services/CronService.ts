import mongoose from 'mongoose';
import cron from 'node-cron';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';
import { Ledger } from '../models/Ledger';
import { SystemSetting } from '../models/SystemSetting';
import { logger } from '../utils/logger';
import { backupService } from './BackupService';
import { webhookService } from './WebhookService';

export class CronService {
    // ─── Deposit Clearance Job ─────────────────────────────────────────────
    private clearanceTask: ReturnType<typeof cron.schedule> | null = null;
    private clearanceRunning: boolean = false;
    private clearancePaused: boolean = false;
    private clearancePausedAt: Date | null = null;
    private clearanceElapsedMs: number = 0; // ms elapsed before pause
    private clearanceStartedAt: Date | null = null;
    private clearanceLastRun: Date | null = null;
    private clearanceLastError: string | null = null;

    // ─── Settlement Job (deposit clearance IS the settlement trigger) ──────
    private settlementPaused: boolean = false;
    private settlementPausedAt: Date | null = null;

    // ─── Reconciliation & Backup ───────────────────────────────────────────
    private reconciliationTask: ReturnType<typeof cron.schedule> | null = null;
    private backupTask: ReturnType<typeof cron.schedule> | null = null;

    // ──────────────────────────────────────────────────────────────────────
    //  STATUS
    // ──────────────────────────────────────────────────────────────────────
    public getCronStatus() {
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
    public pauseSettlement(): { success: boolean; message: string } {
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

        logger.warn('[CronService] ⏸ Settlement cron PAUSED by admin.');
        return { success: true, message: 'Settlement cron job paused successfully.' };
    }

    // ──────────────────────────────────────────────────────────────────────
    //  RESUME settlement cron (timer continues from where it left off)
    // ──────────────────────────────────────────────────────────────────────
    public resumeSettlement(): { success: boolean; message: string } {
        if (!this.settlementPaused) {
            return { success: false, message: 'Settlement cron is not paused.' };
        }

        this.settlementPaused = false;
        this.settlementPausedAt = null;

        // Resume accumulating time from now
        this.clearanceStartedAt = new Date();

        logger.info('[CronService] ▶️  Settlement cron RESUMED by admin.');
        return { success: true, message: 'Settlement cron job resumed successfully.' };
    }

    // ──────────────────────────────────────────────────────────────────────
    //  START DEPOSIT CLEARANCE JOB
    // ──────────────────────────────────────────────────────────────────────
    public startDepositClearanceJob() {
        this.clearanceRunning = true;
        this.clearanceStartedAt = new Date();

        this.clearanceTask = cron.schedule('* * * * *', async () => {
            // Skip if paused
            if (this.settlementPaused) {
                logger.info('[CronService] Settlement cron is paused — skipping tick.');
                return;
            }

            try {
                this.clearanceLastRun = new Date();

                // Automatic Weekend Stop: Settlements are automatically paused on weekends (Saturday & Sunday)
                const day = new Date().getDay();
                if (day === 0 || day === 6) {
                    logger.info('[CronService] Weekend reached — system automatically pausing settlements until Monday.');
                    return;
                }

                logger.info('[CronService] Running Deposit Clearance Job...');
                const now = new Date();

                const transactionsToClear = await Transaction.find({
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
                    logger.info(`[CronService] ${transactionsToClear.length} deposits found for potential clearance.`);

                    for (const txn of transactionsToClear) {
                        try {
                            // Check if tenant settlement is enabled
                            const tenant = txn.userId as any;
                            if (tenant && tenant.settlementEnabled === false) {
                                logger.info(`[CronService] Skipping settlement for ${txn.reference} (Tenant ${tenant._id} settlement disabled).`);
                                continue;
                            }
                            let session: any = null;
                            const { isReplicaSet } = await import('../config/database');
                            if (isReplicaSet) {
                                session = await mongoose.startSession();
                                session.startTransaction();
                            }

                            try {
                                const updated = await Transaction.findOneAndUpdate(
                                    { _id: txn._id, isCleared: false },
                                    { $set: { isCleared: true } },
                                    { new: true, session }
                                );
                                if (!updated) {
                                    logger.warn(`[CronService] Txn ${txn.reference} already cleared.`);
                                    if (session) await session.abortTransaction();
                                    continue;
                                }

                                const result = await Wallet.findOneAndUpdate(
                                    { _id: txn.walletId },
                                    { $inc: { clearedBalance: txn.amount } },
                                    { new: true, session }
                                );

                                if (result) {
                                    // Create Ledger record for the clearance
                                    await new Ledger({
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

                                    if (session) await session.commitTransaction();
                                    logger.info(`[CronService] Cleared ${txn.reference} → ₦${txn.amount}`);
                                } else {
                                    throw new Error(`Wallet not found for walletId: ${txn.walletId}`);
                                }
                            } catch (err: any) {
                                if (session) await session.abortTransaction();
                                throw err;
                            } finally {
                                if (session) session.endSession();
                            }
                        } catch (err: any) {
                            logger.error(`[CronService] Failed to clear ${txn.reference}`, err);
                            this.clearanceLastError = `Txn ${txn.reference}: ${err.message}`;
                        }
                    }
                }
            } catch (error: any) {
                logger.error('[CronService] Deposit Clearance Job error', error);
                this.clearanceLastError = error.message;
            }
        });

        logger.info('[CronService] ✅ Deposit Clearance Job scheduled (Every Minute).');
    }

    // ──────────────────────────────────────────────────────────────────────
    //  RECONCILIATION JOB
    // ──────────────────────────────────────────────────────────────────────
    public startReconciliationJob() {
        this.reconciliationTask = cron.schedule('*/5 * * * *', async () => {
            if (this.settlementPaused) return; // also respects pause
            try {
                await webhookService.reconcileMissedDeposits();
            } catch (error: any) {
                logger.error('[CronService] Reconciliation job failed', error);
            }
        });

        logger.info('[CronService] 🔄 Reconciliation Job scheduled (Every 5 minutes).');
    }

    // ──────────────────────────────────────────────────────────────────────
    //  BACKUP JOB
    // ──────────────────────────────────────────────────────────────────────
    public startBackupJob() {
        this.backupTask = cron.schedule('0 * * * *', async () => {
            try {
                logger.info('[CronService] Running Hourly Database Backup...');
                await backupService.createAndUploadBackup();
                logger.info('[CronService] Hourly Backup completed.');
            } catch (error: any) {
                logger.error('[CronService] Backup Job error', error);
            }
        });

        logger.info('[CronService] 💾 Backup Job scheduled (Every Hour).');
    }
}

export const cronService = new CronService();
export default cronService;
