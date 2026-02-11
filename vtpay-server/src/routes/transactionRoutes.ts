import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware';
import { zainpayService, walletService } from '../services';
import { VirtualAccount, Zainbox } from '../models';
import config from '../config';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Initiate fund transfer
 * POST /api/transactions/transfer
 */
router.post('/transfer', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const {
            destinationAccountNumber,
            destinationBankCode,
            amount, // Amount in kobo
            narration,
            sourceAccountNumber, // Optional, will use user's first virtual account if not provided
        } = req.body;

        // Validate required fields
        if (!destinationAccountNumber || !destinationBankCode || !amount) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: destinationAccountNumber, destinationBankCode, amount',
            });
            return;
        }

        // Get user's virtual account
        let virtualAccount;
        if (sourceAccountNumber) {
            virtualAccount = await VirtualAccount.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                accountNumber: sourceAccountNumber,
                status: 'active',
            });
        } else {
            virtualAccount = await VirtualAccount.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                status: 'active',
            });
        }

        if (!virtualAccount) {
            res.status(400).json({
                success: false,
                message: 'No active virtual account found',
            });
            return;
        }

        // Check wallet balance
        const balance = await walletService.getBalance(userId);
        const amountNumber = parseInt(amount, 10);

        if (balance.availableBalance < amountNumber) {
            res.status(400).json({
                success: false,
                message: 'Insufficient balance',
                data: {
                    availableBalance: balance.availableBalance,
                    availableBalanceNaira: balance.availableBalance / 100,
                    requestedAmount: amountNumber,
                    requestedAmountNaira: amountNumber / 100,
                },
            });
            return;
        }

        // Generate unique transaction reference
        const txnRef = `TXN-${Date.now()}-${uuidv4().slice(0, 8)}`;

        // Create pending transaction (funds will be debited on webhook confirmation)
        const pendingTransaction = await walletService.createPendingTransaction(
            userId,
            amountNumber,
            0, // Fee will be determined by Zainpay
            'transfer',
            narration || `Transfer to ${destinationAccountNumber}`,
            txnRef,
            {
                destinationAccountNumber,
                destinationBankCode,
            }
        );

        // Lock funds
        await walletService.lockFunds(userId, amountNumber);

        try {
            // Get user's Zainbox
            const userZainbox = await Zainbox.findOne({ userId: new mongoose.Types.ObjectId(userId) });
            if (!userZainbox) {
                await walletService.unlockFunds(userId, amountNumber);
                await walletService.updateTransactionStatus(pendingTransaction.reference, 'failed', {
                    failureReason: 'No Zainbox found for user',
                });
                res.status(400).json({
                    success: false,
                    message: 'No Zainbox found for user. Please contact support.',
                });
                return;
            }

            // Initiate transfer via Zainpay
            const transferResponse = await zainpayService.fundTransfer({
                destinationAccountNumber,
                destinationBankCode,
                amount: amount.toString(),
                sourceAccountNumber: virtualAccount.accountNumber,
                sourceBankCode: '0013', // Wema Bank code for Zainpay virtual accounts
                zainboxCode: userZainbox.zainboxCode,
                txnRef,
                narration: narration || `Transfer to ${destinationAccountNumber}`,
                callbackUrl: config.webhookBaseUrl,
            });

            if (transferResponse.code !== '200 OK' && transferResponse.code !== '00') {
                // Unlock funds on failure
                await walletService.unlockFunds(userId, amountNumber);
                await walletService.updateTransactionStatus(pendingTransaction.reference, 'failed', {
                    failureReason: transferResponse.description,
                });

                res.status(400).json({
                    success: false,
                    message: transferResponse.description || 'Transfer failed',
                });
                return;
            }

            const transferData = transferResponse.data!;

            // Debit wallet (unlock and debit)
            await walletService.unlockFunds(userId, amountNumber);
            await walletService.debitWallet(
                userId,
                amountNumber,
                parseInt(transferData.txnFee || '0', 10),
                'transfer',
                narration || `Transfer to ${destinationAccountNumber}`,
                txnRef,
                {
                    paymentRef: transferData.paymentRef,
                    destinationAccountName: transferData.destinationAccountName,
                    destinationAccountNumber: transferData.destinationAccountNumber,
                    destinationBankCode: transferData.destinationBankCode,
                }
            );

            // Update pending transaction to success
            await walletService.updateTransactionStatus(pendingTransaction.reference, 'success', {
                paymentRef: transferData.paymentRef,
                destinationAccountName: transferData.destinationAccountName,
            });

            res.json({
                success: true,
                message: 'Transfer initiated successfully',
                data: {
                    txnRef,
                    amount: amountNumber,
                    amountNaira: amountNumber / 100,
                    fee: parseInt(transferData.txnFee || '0', 10),
                    feeNaira: parseInt(transferData.txnFee || '0', 10) / 100,
                    totalAmount: parseInt(transferData.totalTxnAmount || '0', 10),
                    totalAmountNaira: parseInt(transferData.totalTxnAmount || '0', 10) / 100,
                    destinationAccountNumber: transferData.destinationAccountNumber,
                    destinationAccountName: transferData.destinationAccountName,
                    paymentRef: transferData.paymentRef,
                    status: transferData.status,
                },
            });
        } catch (transferError) {
            // Unlock funds on error
            await walletService.unlockFunds(userId, amountNumber);
            await walletService.updateTransactionStatus(pendingTransaction.reference, 'failed', {
                failureReason: 'Transfer request failed',
            });
            throw transferError;
        }
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({
            success: false,
            message: 'Transfer failed',
        });
    }
});

/**
 * Check transaction status
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

        // Also check with Zainpay
        const verifyResponse = await zainpayService.verifyTransfer(txnRef);

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
                zainpay: verifyResponse.code === '00' ? verifyResponse.data : null,
                zainpayMessage: verifyResponse.description,
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
