import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Wallet, Transaction, VirtualAccount } from '../models';

export class WalletService {
    /**
     * Create a new wallet for a user
     */
    async createWallet(userId: string): Promise<typeof Wallet.prototype> {
        const wallet = new Wallet({
            userId: new mongoose.Types.ObjectId(userId),
            balance: 0,
            clearedBalance: 0,
            lockedBalance: 0,
            currency: 'NGN',
        });
        await wallet.save();
        return wallet;
    }

    /**
     * Get wallet by user ID
     */
    async getWalletByUserId(userId: string): Promise<typeof Wallet.prototype | null> {
        return Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    }

    /**
     * Get wallet balance
     */
    async getBalance(userId: string): Promise<{ balance: number; clearedBalance: number; lockedBalance: number; availableBalance: number; pendingBalance: number }> {
        const wallet = await this.getWalletByUserId(userId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        return {
            balance: wallet.balance,
            clearedBalance: wallet.clearedBalance,
            lockedBalance: wallet.lockedBalance,
            availableBalance: wallet.clearedBalance - wallet.lockedBalance,
            pendingBalance: wallet.balance - wallet.clearedBalance,
        };
    }

    /**
     * Credit wallet (add funds)
     */
    async creditWallet(
        userId: string,
        amount: number,
        category: 'deposit' | 'refund',
        narration: string,
        externalRef?: string,
        metadata?: Record<string, any>,
        customerReference?: string,
        fee: number = 0,
        isCleared: boolean = true
    ): Promise<typeof Transaction.prototype> {
        try {
            const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            const balanceBefore = wallet.balance;
            const balanceAfter = balanceBefore + amount;

            // Update wallet balance
            wallet.balance = balanceAfter;
            if (isCleared) {
                wallet.clearedBalance += amount;
            }
            await wallet.save();

            // Create transaction record
            const transaction = new Transaction({
                walletId: wallet._id,
                userId: new mongoose.Types.ObjectId(userId),
                type: 'credit',
                category,
                amount,
                fee,
                balanceBefore,
                balanceAfter,
                reference: `TXN-${uuidv4()}`,
                externalRef,
                narration,
                status: 'success',
                metadata,
                customerReference,
                isCleared,
                clearedAt: isCleared ? new Date() : undefined
            });
            await transaction.save();

            return transaction;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Debit wallet (remove funds)
     */
    async debitWallet(
        userId: string,
        amount: number,
        fee: number,
        category: 'transfer' | 'withdrawal',
        narration: string,
        externalRef?: string,
        metadata?: Record<string, any>,
        customerReference?: string
    ): Promise<typeof Transaction.prototype> {
        try {
            const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            const totalDebit = amount + fee;
            // Only cleared balance can be withdrawn/transferred
            const availableBalance = wallet.clearedBalance - wallet.lockedBalance;

            if (availableBalance < totalDebit) {
                throw new Error('Insufficient cleared balance');
            }

            const balanceBefore = wallet.balance;
            const balanceAfter = balanceBefore - totalDebit;

            // Update wallet balance
            wallet.balance = balanceAfter;
            wallet.clearedBalance -= totalDebit;
            await wallet.save();

            // Create transaction record
            const transaction = new Transaction({
                walletId: wallet._id,
                userId: new mongoose.Types.ObjectId(userId),
                type: 'debit',
                category,
                amount,
                fee,
                balanceBefore,
                balanceAfter,
                reference: `TXN-${uuidv4()}`,
                externalRef,
                narration,
                status: 'success',
                metadata,
                customerReference,
                isCleared: true,
                clearedAt: new Date()
            });
            await transaction.save();

            return transaction;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lock funds in wallet
     */
    async lockFunds(userId: string, amount: number): Promise<void> {
        const wallet = await this.getWalletByUserId(userId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        const availableBalance = wallet.clearedBalance - wallet.lockedBalance;
        if (availableBalance < amount) {
            throw new Error('Insufficient cleared balance to lock');
        }

        wallet.lockedBalance += amount;
        await wallet.save();
    }

    /**
     * Unlock funds in wallet
     */
    async unlockFunds(userId: string, amount: number): Promise<void> {
        const wallet = await this.getWalletByUserId(userId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        if (wallet.lockedBalance < amount) {
            throw new Error('Locked balance is less than amount to unlock');
        }

        wallet.lockedBalance -= amount;
        await wallet.save();
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory(
        userId: string,
        options: {
            limit?: number;
            offset?: number;
            type?: 'credit' | 'debit';
            category?: string;
            startDate?: Date;
            endDate?: Date;
        } = {}
    ): Promise<{ transactions: typeof Transaction.prototype[]; total: number }> {
        const { limit = 20, offset = 0, type, category, startDate, endDate } = options;

        const query: any = { userId: new mongoose.Types.ObjectId(userId) };

        if (type) query.type = type;
        if (category) query.category = category;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit),
            Transaction.countDocuments(query),
        ]);

        return { transactions, total };
    }

    /**
     * Get transaction by reference
     */
    async getTransactionByReference(reference: string): Promise<typeof Transaction.prototype | null> {
        return Transaction.findOne({ reference });
    }

    /**
     * Get transaction by external reference
     */
    async getTransactionByExternalRef(externalRef: string): Promise<typeof Transaction.prototype | null> {
        return Transaction.findOne({ externalRef });
    }

    /**
     * Create pending transaction (for transfers that need verification)
     */
    async createPendingTransaction(
        userId: string,
        amount: number,
        fee: number,
        category: 'transfer' | 'withdrawal',
        narration: string,
        externalRef?: string,
        metadata?: Record<string, any>
    ): Promise<typeof Transaction.prototype> {
        const wallet = await this.getWalletByUserId(userId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        const transaction = new Transaction({
            walletId: wallet._id,
            userId: new mongoose.Types.ObjectId(userId),
            type: 'debit',
            category,
            amount,
            fee,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance, // Will be updated on success
            reference: `TXN-${uuidv4()}`,
            externalRef,
            narration,
            status: 'pending',
            metadata,
            isCleared: true, // Pending transfers are usually from cleared funds
        });
        await transaction.save();
        return transaction;
    }

    /**
     * Update transaction status
     */
    async updateTransactionStatus(
        reference: string,
        status: 'success' | 'failed',
        metadata?: Record<string, any>
    ): Promise<typeof Transaction.prototype | null> {
        return Transaction.findOneAndUpdate(
            { reference },
            {
                status,
                ...(metadata && { $set: { metadata } }),
            },
            { new: true }
        );
    }

    /**
     * Get balance by customer reference
     */
    async getBalanceByReference(userId: string, customerReference: string): Promise<number> {
        const result = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    customerReference: customerReference,
                    status: 'success',
                },
            },
            {
                $group: {
                    _id: null,
                    totalCredit: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0],
                        },
                    },
                    totalDebit: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'debit'] }, { $add: ['$amount', '$fee'] }, 0],
                        },
                    },
                },
            },
            {
                $project: {
                    balance: { $subtract: ['$totalCredit', '$totalDebit'] },
                },
            },
        ]);

        return result.length > 0 ? result[0].balance : 0;
    }
    /**
     * Get transaction statistics for a user
     */
    async getTransactionStats(userId: string): Promise<{ totalInflow: number; totalOutflow: number; count: number }> {
        const result = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    status: 'success',
                },
            },
            {
                $group: {
                    _id: null,
                    totalInflow: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0],
                        },
                    },
                    totalOutflow: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
        ]);

        if (result.length > 0) {
            return {
                totalInflow: result[0].totalInflow,
                totalOutflow: result[0].totalOutflow,
                count: result[0].count,
            };
        }

        return { totalInflow: 0, totalOutflow: 0, count: 0 };
    }

    /**
     * Get comprehensive dashboard statistics
     */
    async getDashboardStats(userId: string): Promise<{
        totalInflow: number;
        totalOutflow: number;
        transactionCount: number;
        activeVirtualAccounts: number;
        pendingSettlementsCount: number;
    }> {
        const [transactionStats, activeVirtualAccounts, pendingSettlementsCount] = await Promise.all([
            this.getTransactionStats(userId),
            VirtualAccount.countDocuments({
                userId: new mongoose.Types.ObjectId(userId),
                status: 'active'
            }),
            Transaction.countDocuments({
                userId: new mongoose.Types.ObjectId(userId),
                type: 'credit',
                status: 'success',
                isCleared: false
            })
        ]);

        return {
            totalInflow: transactionStats.totalInflow,
            totalOutflow: transactionStats.totalOutflow,
            transactionCount: transactionStats.count,
            activeVirtualAccounts,
            pendingSettlementsCount
        };
    }
}

export const walletService = new WalletService();
export default walletService;
