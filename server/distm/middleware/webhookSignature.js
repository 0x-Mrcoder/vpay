"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = void 0;
/**
 * Middleware to verify PalmPay webhook signature
 * This will be updated in Phase 2 with PalmPay signature verification logic
 */
const verifyWebhookSignature = (req, res, next) => {
    try {
        // Placeholder for PalmPay signature verification
        // Will be implemented in Phase 2
        console.log('Webhook signature verification not yet implemented for PalmPay');
        next();
    }
    catch (error) {
        console.error('Webhook signature verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Signature verification error',
        });
    }
};
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.default = exports.verifyWebhookSignature;
//# sourceMappingURL=webhookSignature.js.map