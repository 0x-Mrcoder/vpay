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
 * This will be implemented in Phase 2
 */
router.post('/palmpay', async (req: Request, res: Response): Promise<void> => {
    try {
        const signature = req.headers['x-palm-signature'] as string || req.headers['x-zm-signature'] as string;
        const rawBody = (req as any).rawBody;

        if (!signature) {
            console.warn('Missing webhook signature');
            res.status(401).json({ success: false, message: 'Missing signature' });
            return;
        }

        if (!webhookService.verifySignature(rawBody, signature)) {
            console.error('Invalid webhook signature');
            res.status(401).json({ success: false, message: 'Invalid signature' });
            return;
        }

        console.log('Received PalmPay webhook:', JSON.stringify(req.body, null, 2));

        const result = await webhookService.processWebhook(req.body);

        res.status(200).json({
            success: result.success,
            message: result.message,
        });
    } catch (error) {
        console.error('PalmPay Webhook error:', error);
        res.status(200).json({
            success: false,
            message: 'Webhook received but processing failed',
        });
    }
});

export default router;
