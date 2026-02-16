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
 */
router.post('/palmpay', async (req, res) => {
    try {
        const signature = (req.headers['signature'] || req.headers['x-palm-signature'] || req.headers['sign'] || req.body.sign);
        const payload = req.rawBody || JSON.stringify(req.body);
        let isValid = services_1.webhookService.verifySignature(payload, signature);
        // If standard verification fails and signature was in body, try verifying the body minus signature
        if (!isValid && req.body.sign) {
            isValid = services_1.webhookService.verifyBodySignature(req.body, req.body.sign);
        }
        // Log the webhook
        await services_1.webhookService.logWebhook('palmpay', req.body.type || 'unknown', req.body, isValid);
        if (!isValid && process.env.NODE_ENV === 'production') {
            res.status(401).json({ success: false, message: 'Invalid signature' });
            return;
        }
        const result = await services_1.webhookService.processWebhook(req.body);
        res.status(200).json({
            success: result.success,
            message: result.message,
        });
    }
    catch (error) {
        console.error('PalmPay Webhook error:', error);
        res.status(200).json({ success: false, message: 'Internal error' });
    }
});
/**
 * Payrant Webhook Handler (Payouts/Transfers)
 * POST /api/webhooks/payrant
 */
router.post('/payout', async (req, res) => {
    try {
        console.log('====== [PAYRANT WEBHOOK START] ======');
        console.log('Body:', JSON.stringify(req.body, null, 2));
        // Payrant signature verification would go here (Phase 2)
        // Process payout update
        // await payoutService.handleWebhook(req.body);
        res.status(200).json({ success: true, message: 'Webhook received' });
    }
    catch (error) {
        console.error('Payrant Webhook error:', error);
        res.status(200).json({ success: false });
    }
});
exports.default = router;
//# sourceMappingURL=webhookRoutes.js.map