import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware';
import { walletService } from '../services';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get wallet details
 * GET /api/wallet
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        const wallet = await walletService.getWalletByUserId(userId);
        if (!wallet) {
            res.status(404).json({
                success: false,
                message: 'Wallet not found',
            });
            return;
        }

        res.json({
            success: true,
            data: {
                id: wallet._id,
                balance: wallet.balance,
                clearedBalance: wallet.clearedBalance,
                lockedBalance: wallet.lockedBalance,
                availableBalance: wallet.clearedBalance - wallet.lockedBalance,
                currency: wallet.currency,
                // Convert kobo to naira for display
                balanceNaira: wallet.balance / 100,
                clearedBalanceNaira: wallet.clearedBalance / 100,
                lockedBalanceNaira: wallet.lockedBalance / 100,
                availableBalanceNaira: (wallet.clearedBalance - wallet.lockedBalance) / 100,
            },
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get wallet',
        });
    }
});

/**
 * Get wallet balance
 * GET /api/wallet/balance
 */
router.get('/balance', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        const balance = await walletService.getBalance(userId);

        res.json({
            success: true,
            data: {
                ...balance,
                // Convert kobo to naira for display
                balanceNaira: balance.balance / 100,
                clearedBalanceNaira: balance.clearedBalance / 100,
                lockedBalanceNaira: balance.lockedBalance / 100,
                availableBalanceNaira: balance.availableBalance / 100,
            },
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get balance',
        });
    }
});

/**
 * Get transaction history
 * GET /api/wallet/transactions
 */
router.get('/transactions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const {
            limit = '20',
            offset = '0',
            type,
            category,
            startDate,
            endDate,
        } = req.query;

        const options: any = {
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
        };

        if (type) options.type = type as string;
        if (category) options.category = category as string;
        if (startDate) options.startDate = new Date(startDate as string);
        if (endDate) options.endDate = new Date(endDate as string);

        const { transactions, total } = await walletService.getTransactionHistory(userId, options);

        res.json({
            success: true,
            data: {
                transactions: transactions.map((txn) => ({
                    id: txn._id,
                    type: txn.type,
                    category: txn.category,
                    amount: txn.amount,
                    amountNaira: txn.amount / 100,
                    fee: txn.fee,
                    feeNaira: txn.fee / 100,
                    balanceBefore: txn.balanceBefore,
                    balanceAfter: txn.balanceAfter,
                    reference: txn.reference,
                    externalRef: txn.externalRef,
                    narration: txn.narration,
                    status: txn.status,
                    isCleared: txn.isCleared,
                    clearedAt: txn.clearedAt,
                    createdAt: txn.createdAt,
                })),
                pagination: {
                    total,
                    limit: options.limit,
                    offset: options.offset,
                    hasMore: options.offset + options.limit < total,
                },
            },
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get transactions',
        });
    }
});

/**
 * Get single transaction by reference
 * GET /api/wallet/transactions/:reference
 */
router.get('/transactions/:reference', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { reference } = req.params;

        const transaction = await walletService.getTransactionByReference(reference);
        if (!transaction) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found',
            });
            return;
        }

        // Verify transaction belongs to user
        if (transaction.userId.toString() !== req.user!.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied',
            });
            return;
        }

        res.json({
            success: true,
            data: {
                id: transaction._id,
                type: transaction.type,
                category: transaction.category,
                amount: transaction.amount,
                amountNaira: transaction.amount / 100,
                fee: transaction.fee,
                feeNaira: transaction.fee / 100,
                balanceBefore: transaction.balanceBefore,
                balanceAfter: transaction.balanceAfter,
                reference: transaction.reference,
                externalRef: transaction.externalRef,
                narration: transaction.narration,
                status: transaction.status,
                isCleared: transaction.isCleared,
                clearedAt: transaction.clearedAt,
                metadata: transaction.metadata,
                createdAt: transaction.createdAt,
            },
        });
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get transaction',
        });
    }
});

/**
 * Get wallet statistics (total money generated)
 * GET /api/wallet/stats
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        // Calculate total money generated (total credits)
        // We can filter by category if needed (e.g., 'deposit', 'transfer')
        // For now, let's sum up all successful credit transactions
        // Get comprehensive dashboard stats
        const stats = await walletService.getDashboardStats(userId);

        res.json({
            success: true,
            data: {
                totalInflow: stats.totalInflow,
                totalOutflow: stats.totalOutflow,
                totalInflowNaira: stats.totalInflow / 100,
                totalOutflowNaira: stats.totalOutflow / 100,
                transactionCount: stats.transactionCount,
                activeVirtualAccounts: stats.activeVirtualAccounts,
                pendingSettlements: stats.pendingSettlementsCount,
            },
        });
    } catch (error) {
        console.error('Get wallet stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get wallet statistics',
        });
    }
});

export default router;
