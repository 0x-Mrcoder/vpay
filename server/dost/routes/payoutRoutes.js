"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const PayoutService_1 = require("../services/PayoutService");
const PalmPayService_1 = require("../services/PalmPayService");
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middleware_1.authenticate);
/**
 * Initiate Payout
 * POST /api/payout
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, // in kobo
        bankCode, accountNumber, accountName, saveAccount } = req.body;
        if (!amount || !bankCode || !accountNumber || !accountName) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields',
            });
            return;
        }
        // 1. Initiate Payout via Service (handles locking funds and PalmPay call)
        const payout = await PayoutService_1.payoutService.initiatePayout(userId, amount, {
            bankCode,
            accountNumber,
            accountName
        });
        // 2. Optionally save bank details for future use
        if (saveAccount) {
            await models_1.User.findByIdAndUpdate(userId, {
                savedBankDetails: {
                    bankCode,
                    accountNumber,
                    accountName,
                    bankName: req.body.bankName || 'Unknown Bank'
                }
            });
        }
        res.json({
            success: true,
            message: 'Payout initiated successfully and is being processed.',
            data: payout
        });
    }
    catch (error) {
        logger_1.logger.error('Payout initiation error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to initiate payout',
        });
    }
});
/**
 * Calculate Payout Fees
 * POST /api/payout/calculate-fees
 */
router.post('/calculate-fees', async (req, res) => {
    try {
        const { accountNumber } = req.body;
        const amount = Number(req.body.amount);
        if (isNaN(amount) || amount <= 0) {
            res.status(400).json({
                success: false,
                message: 'Amount is required and must be greater than 0',
            });
            return;
        }
        const isInternal = await models_1.VirtualAccount.exists({ accountNumber });
        const fees = await PayoutService_1.payoutService.calculateFees(amount, !!isInternal);
        res.json({
            success: true,
            data: {
                ...fees,
                isInternal: !!isInternal
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Calculate fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate fees',
        });
    }
});
/**
 * Verify Bank Account
 * POST /api/payout/verify-account
 */
router.post('/verify-account', async (req, res) => {
    try {
        const { accountNumber, bankCode } = req.body;
        if (!accountNumber || !bankCode) {
            res.status(400).json({
                success: false,
                message: 'Account number and bank code are required',
            });
            return;
        }
        // Validate account number format (should be 10 digits for Nigerian banks)
        if (!/^\d{10}$/.test(accountNumber)) {
            res.status(400).json({
                success: false,
                message: 'Account number must be exactly 10 digits',
            });
            return;
        }
        // Use PalmPay service to verify the account
        const accountDetails = await PalmPayService_1.palmPayService.resolveBankAccount({
            bankCode,
            accountNumber
        });
        if (!accountDetails || !accountDetails.accountName) {
            res.status(404).json({
                success: false,
                message: 'Could not verify account. Please check the account number and bank.',
            });
            return;
        }
        res.json({
            success: true,
            data: {
                accountName: accountDetails.accountName,
                accountNumber: accountDetails.accountNumber,
                bankCode: accountDetails.bankCode,
                verified: true
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Account verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify account',
        });
    }
});
/**
 * Get Payout History
 * GET /api/payout/history
 */
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.id;
        const payouts = await models_1.Payout.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({
            success: true,
            data: payouts
        });
    }
    catch (error) {
        logger_1.logger.error('Get payout history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payout history',
        });
    }
});
/**
 * Get Saved Bank Details
 * GET /api/payout/saved-account
 */
router.get('/saved-account', async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        res.json({
            success: true,
            data: user.savedBankDetails || null,
        });
    }
    catch (error) {
        logger_1.logger.error('Get saved account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get saved account',
        });
    }
});
/**
 * Get All Saved Payout Accounts
 * GET /api/payout/saved-accounts
 */
router.get('/saved-accounts', async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        res.json({
            success: true,
            data: user.payoutAccounts || [],
        });
    }
    catch (error) {
        logger_1.logger.error('Get saved accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get saved accounts',
        });
    }
});
/**
 * Add a Payout Account
 * POST /api/payout/saved-accounts
 */
router.post('/saved-accounts', async (req, res) => {
    try {
        const userId = req.user.id;
        const { bankCode, bankName, accountNumber, accountName } = req.body;
        if (!bankCode || !bankName || !accountNumber || !accountName) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields',
            });
            return;
        }
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Limit to 5 accounts
        if (user.payoutAccounts && user.payoutAccounts.length >= 5) {
            res.status(400).json({
                success: false,
                message: 'You can only save up to 5 payout accounts',
            });
            return;
        }
        // Check if account already exists
        const exists = user.payoutAccounts?.some(acc => acc.accountNumber === accountNumber && acc.bankCode === bankCode);
        if (exists) {
            res.status(400).json({
                success: false,
                message: 'This account is already saved',
            });
            return;
        }
        const newAccount = {
            bankCode,
            bankName,
            accountNumber,
            accountName,
            isPrimary: !user.payoutAccounts || user.payoutAccounts.length === 0
        };
        user.payoutAccounts = user.payoutAccounts || [];
        user.payoutAccounts.push(newAccount);
        // Also update the legacy savedBankDetails if it's the first one
        if (user.payoutAccounts.length === 1) {
            user.savedBankDetails = { bankCode, bankName, accountNumber, accountName };
        }
        await user.save();
        res.json({
            success: true,
            message: 'Payout account saved successfully',
            data: user.payoutAccounts,
        });
    }
    catch (error) {
        logger_1.logger.error('Save payout account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save payout account',
        });
    }
});
/**
 * Delete a Payout Account
 * DELETE /api/payout/saved-accounts/:accountId
 */
router.delete('/saved-accounts/:accountId', async (req, res) => {
    try {
        const userId = req.user.id;
        const { accountId } = req.params;
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        user.payoutAccounts = user.payoutAccounts?.filter(acc => acc._id.toString() !== accountId);
        // If we deleted the primary/legacy one, update it to the next available one
        if (user.payoutAccounts && user.payoutAccounts.length > 0) {
            const first = user.payoutAccounts[0];
            user.savedBankDetails = {
                bankCode: first.bankCode,
                bankName: first.bankName,
                accountNumber: first.accountNumber,
                accountName: first.accountName
            };
        }
        else {
            user.savedBankDetails = undefined;
        }
        await user.save();
        res.json({
            success: true,
            message: 'Payout account removed successfully',
            data: user.payoutAccounts,
        });
    }
    catch (error) {
        logger_1.logger.error('Delete payout account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove payout account',
        });
    }
});
exports.default = router;
//# sourceMappingURL=payoutRoutes.js.map