"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limitService = exports.LimitService = void 0;
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
class LimitService {
    /**
     * Check if a transaction exceeds the user's tier limits
     * @param userId User ID
     * @param type 'withdrawal' or 'deposit'
     * @param amountKobo Amount in Kobo
     */
    async checkTierLimits(userId, type, amountKobo) {
        try {
            const user = await models_1.User.findById(userId);
            if (!user)
                throw new Error('User not found');
            const tier = (user.kyc_tier || 't1');
            const settings = await models_1.SystemSetting.findOne();
            if (!settings || !settings.kycTierLimits) {
                logger_1.logger.warn('System settings or KYC tier limits not configured. Skipping limit check.');
                return;
            }
            const limits = settings.kycTierLimits[tier] || settings.kycTierLimits.t1;
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            // Calculate daily total of successful transactions
            const dailyTransactions = await models_1.Transaction.aggregate([
                {
                    $match: {
                        userId: user._id,
                        category: type === 'withdrawal' ? 'withdrawal' : 'deposit',
                        status: 'success',
                        createdAt: { $gte: startOfDay }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);
            const dailyTotal = dailyTransactions.length > 0 ? dailyTransactions[0].total : 0;
            // Calculate monthly total
            const monthlyTransactions = await models_1.Transaction.aggregate([
                {
                    $match: {
                        userId: user._id,
                        category: type === 'withdrawal' ? 'withdrawal' : 'deposit',
                        status: 'success',
                        createdAt: { $gte: startOfMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);
            const monthlyTotal = monthlyTransactions.length > 0 ? monthlyTransactions[0].total : 0;
            const dailyLimit = type === 'withdrawal' ? limits.dailyWithdrawalLimit : limits.dailyDepositLimit;
            const monthlyLimit = type === 'withdrawal' ? limits.monthlyWithdrawalLimit : limits.monthlyDepositLimit;
            const formattedDailyLimit = (dailyLimit / 100).toLocaleString();
            const formattedMonthlyLimit = (monthlyLimit / 100).toLocaleString();
            if (dailyTotal + amountKobo > dailyLimit) {
                throw new Error(`Daily ${type} limit exceeded for Tier ${tier.toUpperCase()}. Your daily limit is ₦${formattedDailyLimit}. Current daily total: ₦${(dailyTotal / 100).toLocaleString()}`);
            }
            if (monthlyTotal + amountKobo > monthlyLimit) {
                throw new Error(`Monthly ${type} limit exceeded for Tier ${tier.toUpperCase()}. Your monthly limit is ₦${formattedMonthlyLimit}. Current monthly total: ₦${(monthlyTotal / 100).toLocaleString()}`);
            }
            logger_1.logger.info(`Limit check passed for user ${userId} (${tier}): ${type} ₦${(amountKobo / 100).toLocaleString()}`);
        }
        catch (error) {
            logger_1.logger.error(`Limit check failed for user ${userId}:`, error.message);
            throw error;
        }
    }
}
exports.LimitService = LimitService;
exports.limitService = new LimitService();
//# sourceMappingURL=LimitService.js.map