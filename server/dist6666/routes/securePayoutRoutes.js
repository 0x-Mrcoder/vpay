"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payoutAuth_1 = require("../middleware/payoutAuth");
const SecurePayoutService_1 = require("../services/SecurePayoutService");
const router = (0, express_1.Router)();
// Private Payout Request Route
router.post('/request', payoutAuth_1.requirePayoutAuth, async (req, res) => {
    try {
        const user = req.user;
        const idempotencyKey = req.idempotencyKey;
        const payload = {
            amount: req.body.amount,
            bankCode: req.body.bankCode,
            accountNumber: req.body.accountNumber,
            accountName: req.body.accountName,
            narration: req.body.narration
        };
        if (!payload.amount || !payload.bankCode || !payload.accountNumber || !payload.accountName) {
            // Note: Use 'return' explicitly to ensure function terminates
            res.status(400).json({ success: false, message: 'Missing required payout parameters.' });
            return;
        }
        if (typeof payload.amount !== 'number' || payload.amount <= 0) {
            res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
            return;
        }
        // Enforce maximum payout limit of 299,999
        if (payload.amount > 299999) {
            res.status(400).json({ success: false, message: 'Maximum payout limit is 299,999. Transaction rejected.' });
            return;
        }
        // Processing payout atomically
        const result = await SecurePayoutService_1.securePayoutService.requestPayout(user.id, idempotencyKey, payload);
        if (result.status === 'IDEMPOTENT_HIT') {
            res.status(200).json({
                success: true,
                message: 'Returned stored idempotent response',
                data: result.payout
            });
            return;
        }
        res.status(202).json({
            success: true,
            message: result.message,
            data: {
                payoutId: result.payoutId
            }
        });
        return;
    }
    catch (error) {
        console.error('Payout Request Error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'An error occurred while processing the payout request.'
        });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=securePayoutRoutes.js.map