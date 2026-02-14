import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { VirtualAccount, User } from '../models';
import { palmPayService } from '../services';
import { authenticate, AuthenticatedRequest } from '../middleware';
import config from '../config';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get list of supported banks for virtual account creation
 * GET /api/virtual-accounts/supported-banks
 */
router.get('/supported-banks', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // PalmPay assigns the bank automatically, but we can return the likely provider
        // or a generic "PalmPay" option if frontend requires a selection.
        const supportedBanks = [
            { code: '999998', name: 'PalmPay (Auto-assigned)' }
        ];

        res.json({
            success: true,
            data: supportedBanks,
        });
    } catch (error) {
        console.error('Get supported banks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supported banks',
        });
    }
});

/**
 * Create a virtual account for the user
 * POST /api/virtual-accounts
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    console.log('Incoming virtual account creation request:', req.body);
    try {
        const userId = req.user!.id;
        const {
            accountName,
            reference,
            firstName,
            lastName,
            email,
            phone,
            bvn
        } = req.body;

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        // Check KYC Level (PalmPay might require KYC too)
        if (user.kycLevel < 3) {
            res.status(403).json({
                success: false,
                message: 'Account verification required. Please complete KYC.',
            });
            return;
        }

        // Prepare request for PalmPay
        // Use provided details or fallback to user profile
        const customerName = accountName || `${firstName || user.firstName} ${lastName || user.lastName}`;
        const externalReference = reference || `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const payload = {
            customerName: customerName.trim(),
            customerEmail: email || user.email,
            customerMobile: phone || user.phone,
            bvn: bvn || user.bvn, // PalmPay might make BVN optional for basic tiers, or required
            externalReference
        };

        console.log('Sending payload to PalmPay:', JSON.stringify(payload, null, 2));

        const accountData = await palmPayService.createVirtualAccount(payload);

        // Save virtual account to database
        const virtualAccount = new VirtualAccount({
            userId: new mongoose.Types.ObjectId(userId),
            accountNumber: accountData.accountNumber,
            accountName: accountData.accountName,
            bankName: accountData.bankName,
            bankType: accountData.bankCode, // Saving bank code as type for now
            email: payload.customerEmail,
            alias: accountName,
            reference: externalReference,
            status: 'active',
        });
        await virtualAccount.save();

        res.status(201).json({
            success: true,
            message: 'Virtual account created successfully',
            data: {
                id: virtualAccount._id,
                accountNumber: virtualAccount.accountNumber,
                accountName: virtualAccount.accountName,
                alias: virtualAccount.alias,
                reference: virtualAccount.reference,
                bankName: virtualAccount.bankName,
                status: virtualAccount.status,
            },
        });
    } catch (error: any) {
        console.error('Create virtual account error:', error);

        const errorMessage = error.response?.data?.respMsg || error.message || 'Failed to create virtual account';

        res.status(500).json({
            success: false,
            message: errorMessage,
            details: error.response?.data
        });
    }
});

/**
 * Get all virtual accounts for the user
 * GET /api/virtual-accounts
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const query: any = {};

        if (req.user!.role !== 'admin') {
            query.userId = new mongoose.Types.ObjectId(userId);
        }

        const accounts = await VirtualAccount.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: accounts.map((account) => ({
                id: account._id,
                accountNumber: account.accountNumber,
                accountName: account.accountName,
                alias: account.alias,
                reference: account.reference,
                bankName: account.bankName,
                bankType: account.bankType,
                status: account.status,
                createdAt: account.createdAt,
            })),
        });
    } catch (error) {
        console.error('Get virtual accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get virtual accounts',
        });
    }
});

/**
 * Get virtual account balance
 * GET /api/virtual-accounts/:accountNumber/balance
 */
router.get('/:accountNumber/balance', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // PalmPay Virtual Accounts often don't have a queryable "balance" endpoint 
    // unless they are wallets. Assuming they are collection accounts that settle immediately.
    // For now, return 0 or implement check if API supports it.
    res.json({
        success: true,
        data: {
            balanceAmount: 0,
            availableBalance: 0,
            currency: 'NGN'
        }
    });
});

/**
 * Update virtual account status (Local)
 * PATCH /api/virtual-accounts/:accountNumber/status
 */
router.patch('/:accountNumber/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { accountNumber } = req.params;
        const { status } = req.body;

        // Verify account belongs to user (or user is admin)
        const query: any = { accountNumber };
        if (req.user!.role !== 'admin') {
            query.userId = new mongoose.Types.ObjectId(userId);
        }

        const account = await VirtualAccount.findOne(query);

        if (!account) {
            res.status(404).json({
                success: false,
                message: 'Virtual account not found',
            });
            return;
        }

        // Ideally call PalmPay to freeze account if supported.
        // For now just update local status.

        account.status = status ? 'active' : 'inactive';
        await account.save();

        res.json({
            success: true,
            message: `Virtual account ${status ? 'activated' : 'deactivated'} successfully`,
            data: {
                accountNumber: account.accountNumber,
                status: account.status,
            },
        });
    } catch (error) {
        console.error('Update virtual account status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status',
        });
    }
});

/**
 * Delete virtual account (Local only)
 * DELETE /api/virtual-accounts/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(403).json({
        success: false,
        message: 'Virtual account deletion is not allowed',
    });
});

export default router;
