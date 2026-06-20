import { Transaction, SystemSetting, User } from '../models';
import { logger } from '../utils/logger';

export class LimitService {
    /**
     * Check if a transaction exceeds the user's tier limits
     * @param userId User ID
     * @param type 'withdrawal' or 'deposit'
     * @param amountKobo Amount in Kobo
     */
    async checkTierLimits(userId: string, type: 'withdrawal' | 'deposit', amountKobo: number) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const tier = (user.kyc_tier || 't1') as 't1' | 't2' | 't3';
            
            const settings = await SystemSetting.findOne();
            if (!settings || !settings.kycTierLimits) {
                logger.warn('System settings or KYC tier limits not configured. Skipping limit check.');
                return;
            }

            const limits = settings.kycTierLimits[tier] || settings.kycTierLimits.t1;

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Calculate daily total of successful transactions
            const dailyTransactions = await Transaction.aggregate([
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
            const monthlyTransactions = await Transaction.aggregate([
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

            logger.info(`Limit check passed for user ${userId} (${tier}): ${type} ₦${(amountKobo / 100).toLocaleString()}`);
        } catch (error: any) {
            logger.error(`Limit check failed for user ${userId}:`, error.message);
            throw error;
        }
    }
}

export const limitService = new LimitService();
