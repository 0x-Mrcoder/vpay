import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware';
import { walletService } from '../services';
import { VirtualAccount } from '../models';
import config from '../config';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Initiate fund transfer (Legacy Zainpay - Disabled)
 * POST /api/transactions/transfer
 */
router.post('/transfer', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(400).json({
        success: false,
        message: 'This transfer method is deprecated. Please use the Payout system.',
    });
});

/**
 * Check transaction status (Legacy Zainpay - Limited to Local)
 * GET /api/transactions/:txnRef/status
 */
router.get('/:txnRef/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { txnRef } = req.params;

        // First check local database
        const localTransaction = await walletService.getTransactionByExternalRef(txnRef);

        // Verify ownership if transaction exists locally
        if (localTransaction && localTransaction.userId.toString() !== req.user!.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied',
            });
            return;
        }

        res.json({
            success: true,
            data: {
                local: localTransaction ? {
                    reference: localTransaction.reference,
                    status: localTransaction.status,
                    amount: localTransaction.amount,
                    amountNaira: localTransaction.amount / 100,
                    createdAt: localTransaction.createdAt,
                } : null,
                zainpay: null,
                zainpayMessage: 'Zainpay integration removed',
            },
        });
    } catch (error) {
        console.error('Check transaction status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check transaction status',
        });
    }
});

/**
 * List all transactions
 * GET /api/transactions
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { limit = '20', offset = '0', type, category } = req.query;

        const options: any = {
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
        };

        if (type) options.type = type as string;
        if (category) options.category = category as string;

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
                    reference: txn.reference,
                    externalRef: txn.externalRef,
                    narration: txn.narration,
                    status: txn.status,
                    metadata: txn.metadata,
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
        console.error('List transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list transactions',
        });
    }
});

export default router;
