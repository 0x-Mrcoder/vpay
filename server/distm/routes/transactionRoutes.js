"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const services_1 = require("../services");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middleware_1.authenticate);
/**
 * Initiate fund transfer (Legacy Zainpay - Disabled)
 * POST /api/transactions/transfer
 */
router.post('/transfer', async (req, res) => {
    res.status(400).json({
        success: false,
        message: 'This transfer method is deprecated. Please use the Payout system.',
    });
});
/**
 * Check transaction status (Legacy Zainpay - Limited to Local)
 * GET /api/transactions/:txnRef/status
 */
router.get('/:txnRef/status', async (req, res) => {
    try {
        const { txnRef } = req.params;
        // First check local database
        const localTransaction = await services_1.walletService.getTransactionByExternalRef(txnRef);
        // Verify ownership if transaction exists locally
        if (localTransaction && localTransaction.userId.toString() !== req.user.id) {
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
    }
    catch (error) {
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
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = '20', offset = '0', type, category } = req.query;
        const options = {
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };
        if (type)
            options.type = type;
        if (category)
            options.category = category;
        const { transactions, total } = await services_1.walletService.getTransactionHistory(userId, options);
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
    }
    catch (error) {
        console.error('List transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list transactions',
        });
    }
});
exports.default = router;
//# sourceMappingURL=transactionRoutes.js.map