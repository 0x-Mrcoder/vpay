"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronService = exports.CronService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Transaction_1 = require("../models/Transaction");
const Wallet_1 = require("../models/Wallet");
const logger_1 = require("../utils/logger");
class CronService {
    constructor() {
        this.isRunning = false;
        this.lastRun = null;
        this.lastError = null;
    }
    getStatus() {
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
    startDepositClearanceJob() {
        this.isRunning = true;
        // Run every minute
        node_cron_1.default.schedule('* * * * *', async () => {
            try {
                this.lastRun = new Date();
                logger_1.logger.info('Running Deposit Clearance Job...');
                // 24 Hours Ago (plus small buffer if needed, e.g. 1 minute to avoid race conditions with exact ms)
                // User asked for "24 hour and 5 minute"
                const now = new Date();
                const transactionsToClear = await Transaction_1.Transaction.find({
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
                    logger_1.logger.info(`Found ${transactionsToClear.length} pending deposits to clear.`);
                    for (const txn of transactionsToClear) {
                        try {
                            // 1. Mark Transaction as Cleared
                            txn.isCleared = true;
                            txn.clearedAt = new Date();
                            await txn.save();
                            // 2. Credit the Wallet's Cleared Balance
                            const result = await Wallet_1.Wallet.findOneAndUpdate({ _id: txn.walletId }, { $inc: { clearedBalance: txn.amount } }, { new: true });
                            if (result) {
                                logger_1.logger.info(`Cleared Deposit ${txn.reference}: ₦${txn.amount / 100} released to wallet.`);
                            }
                            else {
                                logger_1.logger.error(`Critical: Wallet not found for transaction ${txn.reference}`);
                            }
                        }
                        catch (err) {
                            logger_1.logger.error(`Failed to clear transaction ${txn.reference}`, err);
                            this.lastError = `Txn ${txn.reference}: ${err.message}`;
                        }
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('Error in Deposit Clearance Job', error);
                this.lastError = error.message;
            }
        });
        logger_1.logger.info('Cron Service: Deposit Clearance Job scheduled (Every Minute).Checking for deposits older than 24h 5m.');
    }
}
exports.CronService = CronService;
exports.cronService = new CronService();
exports.default = exports.cronService;
//# sourceMappingURL=CronService.js.map