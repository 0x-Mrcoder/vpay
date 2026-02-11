import mongoose from 'mongoose';
import config from '../config';
import { payoutService } from '../services/PayoutService';
import { JobLock } from '../models';
import { logger } from '../utils/logger';

async function runReconciliationJob() {
    const JOB_NAME = 'reconciliation-job';
    try {
        logger.info('Starting payout reconciliation job...');
        await mongoose.connect(config.mongodbUri);

        // Try to acquire lock
        const lock = await JobLock.findOneAndUpdate(
            { jobName: JOB_NAME },
            {
                $setOnInsert: { jobName: JOB_NAME },
            },
            { upsert: true, new: true }
        );

        if (lock.isLocked && lock.lockedAt && (Date.now() - lock.lockedAt.getTime() < 15 * 60 * 1000)) {
            logger.warn('Reconciliation job is already running or locked. Skipping.');
            process.exit(0);
        }

        // Lock the job
        lock.isLocked = true;
        lock.lockedAt = new Date();
        await lock.save();

        await payoutService.reconcilePayouts();

        // Unlock the job
        lock.isLocked = false;
        lock.lastRunAt = new Date();
        await lock.save();

        logger.info('Reconciliation job completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Reconciliation job failed', error);

        // Attempt to unlock on failure
        try {
            await JobLock.findOneAndUpdate(
                { jobName: JOB_NAME },
                { isLocked: false }
            );
        } catch (unlockError) {
            logger.error('Failed to unlock job after failure', unlockError);
        }

        process.exit(1);
    }
}

runReconciliationJob();
