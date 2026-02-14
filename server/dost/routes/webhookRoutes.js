"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const services_1 = require("../services");
const router = (0, express_1.Router)();
/**
 * Webhook health check (for testing)
 * GET /api/webhooks/health
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Webhook endpoint is active',
        timestamp: new Date().toISOString(),
    });
});
/**
 * PalmPay Webhook Handler
 * POST /api/webhooks/palmpay
 * This will be implemented in Phase 2
 */
router.post('/palmpay', async (req, res) => {
    try {
        const signature = req.headers['x-palm-signature'] || req.headers['x-zm-signature'];
        const rawBody = req.rawBody;
        if (!signature) {
            console.warn('Missing webhook signature');
            res.status(401).json({ success: false, message: 'Missing signature' });
            return;
        }
        if (!services_1.webhookService.verifySignature(rawBody, signature)) {
            console.error('Invalid webhook signature');
            res.status(401).json({ success: false, message: 'Invalid signature' });
            return;
        }
        console.log('Received PalmPay webhook:', JSON.stringify(req.body, null, 2));
        const result = await services_1.webhookService.processWebhook(req.body);
        res.status(200).json({
            success: result.success,
            message: result.message,
        });
    }
    catch (error) {
        console.error('PalmPay Webhook error:', error);
        res.status(200).json({
            success: false,
            message: 'Webhook received but processing failed',
        });
    }
});
exports.default = router;
//# sourceMappingURL=webhookRoutes.js.map