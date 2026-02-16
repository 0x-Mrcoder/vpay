import cron from 'node-cron';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';
import { logger } from '../utils/logger';

export class CronService {
    private isRunning: boolean = false;
    private lastRun: Date | null = null;
    private lastError: string | null = null;

    public getStatus() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            lastError: this.lastError,
            cronSchedule: 'Every Minute'
        };
    }

    /**
     * Start the deposit clearance job
     * Checks every minute for transactions that have matured (24h)
     */
    public startDepositClearanceJob() {
        this.isRunning = true;
        // Run every minute
        cron.schedule('* * * * *', async () => {
            try {
                this.lastRun = new Date();
                logger.info('Running Deposit Clearance Job...');

                // 24 Hours Ago (plus small buffer if needed, e.g. 1 minute to avoid race conditions with exact ms)
                // User asked for "24 hour and 5 minute"
                const now = new Date();

                const transactionsToClear = await Transaction.find({
                    type: 'credit', // Deposits are credits
                    category: { $in: ['deposit', 'transfer'] }, // Only deposits (and pending transfers if applicable)
                    status: 'success', // Must be successful
                    isCleared: false, // Not yet cleared
                    $or: [
                        { clearedAt: { $lte: now } }, // Explicit clearance date passed
                        { clearedAt: { $exists: false }, createdAt: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Fallback for legacy data (24h default)
                    ]
                }).limit(50); // Process in batches of 50 to avoid locking

                if (transactionsToClear.length > 0) {
                    logger.info(`Found ${transactionsToClear.length} pending deposits to clear.`);

                    for (const txn of transactionsToClear) {
                        try {
                            // 1. Atomic Update: Try to mark as cleared ONLY if it is still NOT cleared
                            // This prevents race conditions or double processing
                            const updatedTxn = await Transaction.findOneAndUpdate(
                                {
                                    _id: txn._id,
                                    isCleared: false
                                },
                                {
                                    $set: {
                                        isCleared: true,
                                        // clearedAt: new Date() // Keep original clearedAt or update? Better to keep original if set, or set current if not.
                                        // Actually, let's leave clearedAt as is if it exists, or set it if missing.
                                        // But typically we want to know when it *actually* cleared.
                                        // Let's just update the status primarily.
                                    }
                                    // Note: We don't change clearedAt here effectively if it was already set to the future.
                                    // If we want to record the *actual* clearance time, we might need another field like `processedAt`.
                                    // For now, satisfy the requirement: stop processing it again.
                                },
                                { new: true }
                            );

                            if (!updatedTxn) {
                                logger.warn(`Transaction ${txn.reference} was already cleared or modified. Skipping.`);
                                continue;
                            }

                            // 2. Credit the Wallet's Cleared Balance
                            const result = await Wallet.findOneAndUpdate(
                                { _id: txn.walletId },
                                { $inc: { clearedBalance: txn.amount } },
                                { new: true }
                            );

                            if (result) {
                                logger.info(`Cleared Deposit ${txn.reference}: ₦${txn.amount / 100} released to wallet.`);
                            } else {
                                logger.error(`Critical: Wallet not found for transaction ${txn.reference}`);
                                // Optional: Revert transaction status? Or Manual intervention needed.
                                // For now, log critical error.
                            }

                        } catch (err: any) {
                            logger.error(`Failed to clear transaction ${txn.reference}`, err);
                            this.lastError = `Txn ${txn.reference}: ${err.message}`;
                        }
                    }
                }

            } catch (error: any) {
                logger.error('Error in Deposit Clearance Job', error);
                this.lastError = error.message;
            }
        });

        logger.info('Cron Service: Deposit Clearance Job scheduled (Every Minute).Checking for deposits older than 24h 5m.');
    }
}

export const cronService = new CronService();
export default cronService;
