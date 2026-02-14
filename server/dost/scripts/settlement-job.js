"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../config"));
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
async function runSettlementJob() {
    const JOB_NAME = 'settlement-job';
    try {
        logger_1.logger.info('Starting settlement job...');
        await mongoose_1.default.connect(config_1.default.mongodbUri);
        // Try to acquire lock
        const lock = await models_1.JobLock.findOneAndUpdate({ jobName: JOB_NAME }, {
            $setOnInsert: { jobName: JOB_NAME },
        }, { upsert: true, new: true });
        if (lock.isLocked && lock.lockedAt && (Date.now() - lock.lockedAt.getTime() < 30 * 60 * 1000)) {
            logger_1.logger.warn('Settlement job is already running or locked. Skipping.');
            process.exit(0);
        }
        // Lock the job
        lock.isLocked = true;
        lock.lockedAt = new Date();
        await lock.save();
        // await payoutService.processSettlements();
        // Unlock the job
        lock.isLocked = false;
        lock.lastRunAt = new Date();
        await lock.save();
        logger_1.logger.info('Settlement job completed successfully');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Settlement job failed', error);
        // Attempt to unlock on failure
        try {
            await models_1.JobLock.findOneAndUpdate({ jobName: JOB_NAME }, { isLocked: false });
        }
        catch (unlockError) {
            logger_1.logger.error('Failed to unlock job after failure', unlockError);
        }
        process.exit(1);
    }
}
runSettlementJob();
//# sourceMappingURL=settlement-job.js.map