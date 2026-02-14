"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const services_1 = require("../services");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
// Routes might be public or protected depending on use case.
// Listing banks usually can be public or require auth. Let's require auth to be safe.
router.use(middleware_1.authenticate);
/**
 * Get list of banks
 * GET /api/banks
 */
router.get('/', async (req, res) => {
    try {
        const banks = await services_1.palmPayService.getBankList();
        res.json({
            success: true,
            data: banks
        });
    }
    catch (error) {
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
router.get('/verify', async (req, res) => {
    try {
        const { bankCode, accountNumber } = req.query;
        if (!bankCode || !accountNumber) {
            res.status(400).json({
                success: false,
                message: 'bankCode and accountNumber are required',
            });
            return;
        }
        const accountDetails = await services_1.palmPayService.resolveBankAccount({
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
    }
    catch (error) {
        console.error('Name enquiry error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to verify account',
        });
    }
});
exports.default = router;
//# sourceMappingURL=bankRoutes.js.map