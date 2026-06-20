"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.WalletService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const uuid_1 = require("uuid");
const models_1 = require("../models");
class WalletService {
    /**
     * Create a new wallet for a user
     */
    async createWallet(userId) {
        const wallet = new models_1.Wallet({
            userId: new mongoose_1.default.Types.ObjectId(userId),
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
    async getWalletByUserId(userId) {
        return models_1.Wallet.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) });
    }
    /**
     * Get wallet balance
     */
    async getBalance(userId) {
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
    async creditWallet(userId, amount, category, narration, externalRef, metadata, customerReference, fee = 0, isCleared = true, clearedAt, session) {
        try {
            const wallet = await models_1.Wallet.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) }).session(session || null);
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
            await wallet.save({ session });
            // Create transaction record
            const transaction = new models_1.Transaction({
                walletId: wallet._id,
                userId: new mongoose_1.default.Types.ObjectId(userId),
                type: 'credit',
                category,
                amount,
                fee,
                balanceBefore,
                balanceAfter,
                reference: `TXN-${(0, uuid_1.v4)()}`,
                externalRef,
                narration,
                status: 'success',
                metadata,
                customerReference,
                isCleared,
                clearedAt: isCleared ? new Date() : clearedAt
            });
            await transaction.save({ session });
            // Create Ledger record
            const ledger = new models_1.Ledger({
                walletId: wallet._id,
                userId: new mongoose_1.default.Types.ObjectId(userId),
                transactionId: transaction._id,
                reference: transaction.reference,
                amount,
                type: 'CREDIT',
                purpose: category.toUpperCase(),
                balanceBefore,
                balanceAfter: wallet.balance,
            });
            await ledger.save({ session });
            return transaction;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Debit wallet (remove funds)
     */
    async debitWallet(userId, amount, fee, category, narration, externalRef, metadata, customerReference, session) {
        try {
            const totalDebit = amount + fee;
            // Atomic update with sufficient balance check
            const wallet = await models_1.Wallet.findOneAndUpdate({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                $expr: {
                    $gte: [
                        { $subtract: ["$clearedBalance", "$lockedBalance"] },
                        totalDebit
                    ]
                }
            }, {
                $inc: {
                    balance: -totalDebit,
                    clearedBalance: -totalDebit
                }
            }, { new: true, session });
            if (!wallet) {
                // Check if wallet exists at all
                const exists = await models_1.Wallet.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) }).session(session || null);
                if (!exists)
                    throw new Error('Wallet not found');
                throw new Error('Insufficient available balance (funds must be cleared/settled first)');
            }
            const balanceBefore = wallet.balance + totalDebit;
            const balanceAfter = wallet.balance;
            // Create transaction record
            const transaction = new models_1.Transaction({
                walletId: wallet._id,
                userId: new mongoose_1.default.Types.ObjectId(userId),
                type: 'debit',
                category,
                amount,
                fee,
                balanceBefore,
                balanceAfter,
                reference: `TXN-${(0, uuid_1.v4)()}`,
                externalRef,
                narration,
                status: 'success',
                metadata,
                customerReference,
                isCleared: true,
                clearedAt: new Date()
            });
            await transaction.save({ session });
            // Create Ledger record
            const ledger = new models_1.Ledger({
                walletId: wallet._id,
                userId: new mongoose_1.default.Types.ObjectId(userId),
                transactionId: transaction._id,
                reference: transaction.reference,
                amount: totalDebit,
                type: 'DEBIT',
                purpose: category.toUpperCase(),
                balanceBefore,
                balanceAfter: wallet.balance,
            });
            await ledger.save({ session });
            return transaction;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Lock funds in wallet
     */
    async lockFunds(userId, amount) {
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
    async unlockFunds(userId, amount) {
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
    async getTransactionHistory(userId, options = {}) {
        const { limit = 20, offset = 0, type, category, startDate, endDate } = options;
        const query = {
            userId: new mongoose_1.default.Types.ObjectId(userId),
            category: { $ne: 'adjustment' } // Hide manual adjustments from tenants
        };
        if (type)
            query.type = type;
        if (category)
            query.category = category;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = startDate;
            if (endDate)
                query.createdAt.$lte = endDate;
        }
        const [transactions, total] = await Promise.all([
            models_1.Transaction.find(query)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit),
            models_1.Transaction.countDocuments(query),
        ]);
        return { transactions, total };
    }
    /**
     * Get transaction by reference
     */
    async getTransactionByReference(reference) {
        return models_1.Transaction.findOne({ reference });
    }
    /**
     * Get transaction by external reference
     */
    async getTransactionByExternalRef(externalRef) {
        return models_1.Transaction.findOne({ externalRef });
    }
    /**
     * Create pending transaction (for transfers that need verification)
     */
    async createPendingTransaction(userId, amount, fee, category, narration, externalRef, metadata) {
        const wallet = await this.getWalletByUserId(userId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        const transaction = new models_1.Transaction({
            walletId: wallet._id,
            userId: new mongoose_1.default.Types.ObjectId(userId),
            type: 'debit',
            category,
            amount,
            fee,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance, // Will be updated on success
            reference: `TXN-${(0, uuid_1.v4)()}`,
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
    async updateTransactionStatus(reference, status, metadata) {
        return models_1.Transaction.findOneAndUpdate({ reference }, {
            status,
            ...(metadata && { $set: { metadata } }),
        }, { new: true });
    }
    /**
     * Get balance by customer reference
     */
    async getBalanceByReference(userId, customerReference) {
        const result = await models_1.Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose_1.default.Types.ObjectId(userId),
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
    async getTransactionStats(userId) {
        const result = await models_1.Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose_1.default.Types.ObjectId(userId),
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
    async getDashboardStats(userId) {
        const [transactionStats, activeVirtualAccounts, pendingSettlementsCount] = await Promise.all([
            this.getTransactionStats(userId),
            models_1.VirtualAccount.countDocuments({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                status: 'active'
            }),
            models_1.Transaction.countDocuments({
                userId: new mongoose_1.default.Types.ObjectId(userId),
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
    /**
     * Manual adjustment of wallet balance (Admin only)
     */
    async manualAdjustment(userId, amount, type, narration, adminId) {
        let session = null;
        const { isReplicaSet } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        if (isReplicaSet) {
            session = await mongoose_1.default.startSession();
            session.startTransaction();
        }
        try {
            const safeAmount = Number(amount);
            if (isNaN(safeAmount) || safeAmount <= 0) {
                throw new Error('Invalid adjustment amount');
            }
            let wallet;
            if (type === 'debit') {
                // Atomic debit with guard
                wallet = await models_1.Wallet.findOneAndUpdate({
                    userId: new mongoose_1.default.Types.ObjectId(userId),
                    $expr: {
                        $gte: [
                            { $subtract: ["$clearedBalance", "$lockedBalance"] },
                            safeAmount
                        ]
                    }
                }, {
                    $inc: {
                        balance: -safeAmount,
                        clearedBalance: -safeAmount
                    }
                }, { new: true, session });
                if (!wallet) {
                    throw new Error('Insufficient available balance (funds must be cleared/settled first)');
                }
            }
            else {
                // Atomic credit
                wallet = await models_1.Wallet.findOneAndUpdate({ userId: new mongoose_1.default.Types.ObjectId(userId) }, {
                    $inc: {
                        balance: safeAmount,
                        clearedBalance: safeAmount
                    }
                }, { new: true, session });
                if (!wallet) {
                    throw new Error('Wallet not found for adjustment');
                }
            }
            const balanceBefore = type === 'credit' ? wallet.balance - safeAmount : wallet.balance + safeAmount;
            const balanceAfter = wallet.balance;
            // Create transaction record
            const transaction = new models_1.Transaction({
                walletId: wallet._id,
                userId: new mongoose_1.default.Types.ObjectId(userId),
                type,
                category: 'adjustment',
                amount: safeAmount,
                fee: 0,
                balanceBefore,
                balanceAfter,
                reference: `ADJ-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`,
                narration,
                status: 'success',
                metadata: {
                    adminId,
                    isManualAdjustment: true
                },
                isCleared: true,
                clearedAt: new Date()
            });
            await transaction.save({ session });
            // Create Ledger record
            const ledger = new models_1.Ledger({
                walletId: wallet._id,
                userId: new mongoose_1.default.Types.ObjectId(userId),
                transactionId: transaction._id,
                reference: transaction.reference,
                amount: safeAmount,
                type: type === 'credit' ? 'CREDIT' : 'DEBIT',
                purpose: 'MANUAL_ADJUSTMENT',
                balanceBefore,
                balanceAfter,
            });
            await ledger.save({ session });
            if (session)
                await session.commitTransaction();
            return transaction;
        }
        catch (error) {
            if (session)
                await session.abortTransaction();
            throw error;
        }
        finally {
            if (session)
                session.endSession();
        }
    }
}
exports.WalletService = WalletService;
exports.walletService = new WalletService();
exports.default = exports.walletService;
//# sourceMappingURL=WalletService.js.map