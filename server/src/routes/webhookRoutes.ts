import { Router, Request, Response } from 'express';
import { webhookService } from '../services';

const router = Router();

/**
 * Webhook health check (for testing)
 * GET /api/webhooks/health
 */
router.get('/health', (req: Request, res: Response): void => {
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
router.post('/palmpay', async (req: Request, res: Response): Promise<void> => {
    try {
        const signature = req.headers['signature'] as string || req.headers['x-palm-signature'] as string;
        const payload = (req as any).rawBody || JSON.stringify(req.body);

        const isValid = webhookService.verifySignature(payload, signature);

        // Log the webhook
        await webhookService.logWebhook('palmpay', req.body.type || 'unknown', req.body, isValid);

        if (!isValid && process.env.NODE_ENV === 'production') {
            res.status(401).json({ success: false, message: 'Invalid signature' });
            return;
        }

        const result = await webhookService.processWebhook(req.body);

        res.status(200).json({
            success: result.success,
            message: result.message,
        });
    } catch (error) {
        console.error('PalmPay Webhook error:', error);
        res.status(200).json({ success: false, message: 'Internal error' });
    }
});

/**
 * Payrant Webhook Handler (Payouts/Transfers)
 * POST /api/webhooks/payrant
 */
router.post('/payout', async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('====== [PAYRANT WEBHOOK START] ======');
        console.log('Body:', JSON.stringify(req.body, null, 2));

        // Payrant signature verification would go here (Phase 2)

        // Process payout update
        // await payoutService.handleWebhook(req.body);

        res.status(200).json({ success: true, message: 'Webhook received' });
    } catch (error) {
        console.error('Payrant Webhook error:', error);
        res.status(200).json({ success: false });
    }
});

export default router;
