import mongoose from 'mongoose';
import config from '../config';
import { payoutService } from '../services/PayoutService';
import { JobLock } from '../models';
import { logger } from '../utils/logger';

async function runSettlementJob() {
    const JOB_NAME = 'settlement-job';
    try {
        logger.info('Starting settlement job...');
        await mongoose.connect(config.mongodbUri);

        // Try to acquire lock
        const lock = await JobLock.findOneAndUpdate(
            { jobName: JOB_NAME },
            {
                $setOnInsert: { jobName: JOB_NAME },
            },
            { upsert: true, new: true }
        );

        if (lock.isLocked && lock.lockedAt && (Date.now() - lock.lockedAt.getTime() < 30 * 60 * 1000)) {
            logger.warn('Settlement job is already running or locked. Skipping.');
            process.exit(0);
        }

        // Lock the job
        lock.isLocked = true;
        lock.lockedAt = new Date();
        await lock.save();

        await payoutService.processSettlements();

        // Unlock the job
        lock.isLocked = false;
        lock.lastRunAt = new Date();
        await lock.save();

        logger.info('Settlement job completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Settlement job failed', error);

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

runSettlementJob();
