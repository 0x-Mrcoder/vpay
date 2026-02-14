"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * Submit KYC details
 * POST /api/kyc/submit
 */
router.post('/submit', auth_1.authenticate, async (req, res) => {
    try {
        const { nin, bvn, idCard } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (!nin || !bvn || !idCard) {
            console.log('KYC Submission missing fields:', { nin: !!nin, bvn: !!bvn, idCard: !!idCard });
            res.status(400).json({
                success: false,
                message: `Missing required fields: ${[!nin && 'NIN', !bvn && 'BVN', !idCard && 'ID Card'].filter(Boolean).join(', ')}`,
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
        // Update user KYC details
        user.nin = nin;
        user.bvn = bvn;
        user.idCardPath = idCard; // In a real app, this would be a file path
        user.kycLevel = 2; // 2: KYC Submitted (Pending Approval)
        await user.save();
        res.json({
            success: true,
            message: 'KYC details submitted successfully. Your account is pending approval.',
            data: {
                kycLevel: user.kycLevel,
            },
        });
    }
    catch (error) {
        console.error('KYC submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit KYC details',
        });
    }
});
/**
 * Get KYC status
 * GET /api/kyc/status
 */
router.get('/status', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
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
            data: {
                kycLevel: user.kycLevel,
                status: user.status,
            },
        });
    }
    catch (error) {
        console.error('KYC status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get KYC status',
        });
    }
});
exports.default = router;
//# sourceMappingURL=kycRoutes.js.map