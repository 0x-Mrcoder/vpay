"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const middleware_1 = require("../middleware");
const config_1 = __importDefault(require("../config"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middleware_1.authenticate);
/**
 * Get current API Key
 * GET /api/developer/apikey
 */
router.get('/apikey', async (req, res) => {
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
            data: {
                apiKey: user.apiKey || null,
            },
        });
    }
    catch (error) {
        console.error('Get API key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get API key',
        });
    }
});
/**
 * Generate/Regenerate API Key
 * POST /api/developer/apikey
 */
router.post('/apikey', async (req, res) => {
    try {
        const userId = req.user.id;
        // Check if user exists (already mostly handled by auth middleware but good specific check)
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Generate a new API key
        const randomPart = crypto_1.default.randomBytes(24).toString('hex');
        // If KYC level is less than 3 (Approved), generate a test key
        const prefix = user.kycLevel < 3 ? 'sk_test_' : 'sk_live_';
        const newApiKey = `${prefix}${randomPart}`;
        user.apiKey = newApiKey;
        await user.save();
        res.json({
            success: true,
            message: 'API key generated successfully',
            data: {
                apiKey: newApiKey,
            },
        });
    }
    catch (error) {
        console.error('Generate API key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate API key',
        });
    }
});
/**
 * Get Webhook URL
 * GET /api/developer/webhook
 */
router.get('/webhook', async (req, res) => {
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
            data: {
                webhookUrl: user.webhookUrl || null,
            },
        });
    }
    catch (error) {
        console.error('Get webhook URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get webhook URL',
        });
    }
});
/**
 * Update Webhook URL
 * PUT /api/developer/webhook
 */
router.put('/webhook', async (req, res) => {
    try {
        const userId = req.user.id;
        const { webhookUrl } = req.body;
        // Validate webhook URL if provided
        if (webhookUrl) {
            // Prevent recursive webhooks (User setting VTPay server as their webhook)
            if (webhookUrl.includes('vtpayapi.vtfree.com.ng') ||
                (config_1.default.webhookBaseUrl && webhookUrl.includes(config_1.default.webhookBaseUrl))) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid Webhook URL: You cannot use the VTPay server URL as your notification endpoint. Please use your own server URL.',
                });
                return;
            }
            // Basic URL validation
            try {
                const url = new URL(webhookUrl);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    res.status(400).json({
                        success: false,
                        message: 'Webhook URL must use HTTP or HTTPS protocol',
                    });
                    return;
                }
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid webhook URL format',
                });
                return;
            }
        }
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        user.webhookUrl = webhookUrl || undefined;
        await user.save();
        res.json({
            success: true,
            message: webhookUrl ? 'Webhook URL updated successfully' : 'Webhook URL removed successfully',
            data: {
                webhookUrl: user.webhookUrl || null,
            },
        });
    }
    catch (error) {
        console.error('Update webhook URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update webhook URL',
        });
    }
});
exports.default = router;
//# sourceMappingURL=developerRoutes.js.map