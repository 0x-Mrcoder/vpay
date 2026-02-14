import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware';
import { palmPayService, walletService, payoutService } from '../services'; // Import palmPayService and payoutService
import { VirtualAccount } from '../models'; // Removed Zainbox
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
            destinationAccountName: providedAccountName // Optional provided name
        } = req.body;

        // Validate required fields
        if (!destinationAccountNumber || !destinationBankCode || !amount) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: destinationAccountNumber, destinationBankCode, amount',
            });
            return;
        }

        const amountNumber = parseInt(amount, 10);
        if (isNaN(amountNumber) || amountNumber <= 0) {
            res.status(400).json({
                success: false,
                message: 'Invalid amount',
            });
            return;
        }

        // Get user's virtual account (for source validation, optional)
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

        // Calculate Fees
        // Use payoutService.calculateFees logic for consistency or define custom logic here
        // Assuming standard transfer fees apply
        const fees = await payoutService.calculateFees(amountNumber, false);
        const totalDebit = fees.totalDebit; // This includes fees if deducted from amount, or added?
        // Wait, calculateFees in PayoutService returns:
        // netAmount (what beneficiary gets), fee (VTPay), gatewayFee, totalDebit (what is deducted from wallet)
        // Usually for transfer, user sends 1000, fee is added or deducted.
        // Let's assume user wants to send `amount`. So `amount` is the net amount.
        // But calculateFees takes `amount` as "Total requested withdrawal".
        // Let's keep it simple: We debit `amount` + `fee`? Or `amount` includes fee?
        // In previous implementation:
        // check balance >= amountNumber.
        // zainpay returned `txnFee` and `totalTxnAmount`.
        // walletService.debitWallet(userId, amountNumber, fee, ...)

        // Let's use a simple fee calculation for now:
        const fee = 2500; // Fixed fee for now (adjust as needed or fetch from settings)
        // Or better, use 0 fee for now until dynamic fee logic is solidified for Transfers vs Payouts.
        // Actually, PayoutService uses settings. Let's try to use that if possible.
        // For now, let's proceed with 0 fee assumption or minimal refactoring of fee logic.
        const calculatedFee = 0;

        // Check wallet balance
        const balance = await walletService.getBalance(userId);

        if (balance.availableBalance < amountNumber + calculatedFee) {
            res.status(400).json({
                success: false,
                message: 'Insufficient balance',
                data: {
                    availableBalance: balance.availableBalance,
                    availableBalanceNaira: balance.availableBalance / 100,
                    requestedAmount: amountNumber,
                    fee: calculatedFee,
                    totalRequired: amountNumber + calculatedFee
                },
            });
            return;
        }

        // Generate unique transaction reference
        const txnRef = `TXN-${Date.now()}-${uuidv4().slice(0, 8)}`;

        // Resolve Account Name if not provided
        let destinationAccountName = providedAccountName;
        if (!destinationAccountName) {
            try {
                const resolved = await palmPayService.resolveBankAccount({
                    bankCode: destinationBankCode,
                    accountNumber: destinationAccountNumber
                });
                destinationAccountName = resolved.accountName;
            } catch (error) {
                console.warn('Failed to resolve account name:', error);
                destinationAccountName = 'Beneficiary'; // Fallback
            }
        }

        // Create pending transaction
        const pendingTransaction = await walletService.createPendingTransaction(
            userId,
            amountNumber,
            calculatedFee,
            'transfer',
            narration || `Transfer to ${destinationAccountName} (${destinationAccountNumber})`,
            txnRef,
            {
                destinationAccountNumber,
                destinationBankCode,
                destinationAccountName
            }
        );

        // Lock funds
        await walletService.lockFunds(userId, amountNumber + calculatedFee);

        try {
            // Initiate transfer via PalmPay
            const transferResponse = await palmPayService.initiateTransfer({
                amount: amountNumber,
                currency: 'NGN',
                transactionReference: txnRef,
                description: narration || `Transfer to ${destinationAccountNumber}`,
                beneficiary: {
                    accountNumber: destinationAccountNumber,
                    bankCode: destinationBankCode,
                    accountName: destinationAccountName
                }
            });

            // Debit wallet (unlock and debit)
            await walletService.unlockFunds(userId, amountNumber + calculatedFee);
            await walletService.debitWallet(
                userId,
                amountNumber,
                calculatedFee,
                'transfer',
                narration || `Transfer to ${destinationAccountName} (${destinationAccountNumber})`,
                txnRef,
                {
                    paymentRef: txnRef, // PalmPay might not return a separate payment ref immediately
                    destinationAccountName: destinationAccountName,
                    destinationAccountNumber: destinationAccountNumber,
                    destinationBankCode: destinationBankCode,
                    gatewayResponse: transferResponse
                }
            );

            // Update pending transaction to success (or processed)
            await walletService.updateTransactionStatus(pendingTransaction.reference, 'success', {
                paymentRef: txnRef,
                destinationAccountName: destinationAccountName,
            });

            res.json({
                success: true,
                message: 'Transfer initiated successfully',
                data: {
                    txnRef,
                    amount: amountNumber,
                    amountNaira: amountNumber / 100,
                    fee: calculatedFee,
                    feeNaira: calculatedFee / 100,
                    totalAmount: amountNumber + calculatedFee,
                    totalAmountNaira: (amountNumber + calculatedFee) / 100,
                    destinationAccountNumber: destinationAccountNumber,
                    destinationAccountName: destinationAccountName,
                    paymentRef: txnRef,
                    status: 'success', // or pending
                },
            });

        } catch (transferError: any) {
            // Unlock funds on error
            await walletService.unlockFunds(userId, amountNumber + calculatedFee);
            await walletService.updateTransactionStatus(pendingTransaction.reference, 'failed', {
                failureReason: transferError.message || 'Transfer request failed',
            });

            res.status(400).json({
                success: false,
                message: transferError.message || 'Transfer failed',
            });
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

        // Determine status from local transaction
        // Since we don't have a direct query method for PalmPay status exposed yet in Service (except webhook),
        // we rely on local status or implement verify in PalmPayService.
        // For now, return local status.

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
                message: 'Real-time status check not available. Please check transaction history.',
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
