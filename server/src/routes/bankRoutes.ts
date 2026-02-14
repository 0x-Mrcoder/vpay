import { Router, Request, Response } from 'express';
import { palmPayService } from '../services';
import { AuthenticatedRequest, authenticate } from '../middleware';

const router = Router();

// Routes might be public or protected depending on use case.
// Listing banks usually can be public or require auth. Let's require auth to be safe.
router.use(authenticate);

/**
 * Get list of banks
 * GET /api/banks
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const banks = await palmPayService.getBankList();
        res.json({
            success: true,
            data: banks
        });
    } catch (error: any) {
        console.error('Get bank list error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get bank list',
            error: error.message
        });
    }
});

/**
 * Validate bank account (Name Enquiry)
 * GET /api/banks/verify
 */
router.get('/verify', async (req: Request, res: Response): Promise<void> => {
    try {
        const { bankCode, accountNumber } = req.query;

        if (!bankCode || !accountNumber) {
            res.status(400).json({
                success: false,
                message: 'bankCode and accountNumber are required',
            });
            return;
        }

        const accountDetails = await palmPayService.resolveBankAccount({
            bankCode: String(bankCode),
            accountNumber: String(accountNumber)
        });

        res.json({
            success: true,
            data: {
                accountName: accountDetails.accountName,
                accountNumber: accountDetails.accountNumber,
                bankCode: accountDetails.bankCode
            }
        });
    } catch (error: any) {
        console.error('Name enquiry error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to verify account',
        });
    }
});

export default router;
