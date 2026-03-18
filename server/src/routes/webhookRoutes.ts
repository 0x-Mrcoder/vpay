import { Router, Request, Response } from 'express';
import { webhookService } from '../services';
import { logger } from '../utils/logger';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// GET /api/webhooks/health
// ─────────────────────────────────────────────────────────────────────────────
router.get('/health', (_req: Request, res: Response): void => {
    res.json({
        success:   true,
        message:   'Webhook endpoint is active',
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PalmPay Webhook Handler
// POST /api/webhooks/palmpay
//
// Security layers applied (in order):
//  1. Signature verification  (reject if invalid)
//  2. Timestamp protection    (reject if older than 10 min)
//  3. Replay protection       (reject duplicate orderNo)
//  4. Duplicate tx protection (inside processWebhook → handleDeposit)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/palmpay', async (req: Request, res: Response): Promise<void> => {
    const body = req.body;

    try {
        logger.info('[WEBHOOK] ══════ PalmPay Webhook Received ══════');
        logger.info('[WEBHOOK] Body: ' + JSON.stringify(body, null, 2));

        // ── 1️⃣  SIGNATURE VERIFICATION ───────────────────────────────────────
        // Collect signature from header or body (PalmPay V2 puts it in body.sign)
        const rawSignature = (
            req.headers['signature'] ||
            req.headers['x-palm-signature'] ||
            req.headers['sign'] ||
            body.sign ||
            ''
        ) as string;

        const rawPayload = (req as any).rawBody || JSON.stringify(body);

        const skipSigVerify = process.env.PALMPAY_SKIP_SIG_VERIFY === 'true';

        let isValidSignature = skipSigVerify
            ? true
            : webhookService.verifySignature(rawPayload, rawSignature);

        // Fallback: verify using body-params style (PalmPay V2 body signing)
        if (!isValidSignature && !skipSigVerify && body.sign) {
            isValidSignature = webhookService.verifyBodySignature(body, body.sign);
        }

        if (!isValidSignature && !skipSigVerify) {
            logger.warn('[WEBHOOK] ❌ Invalid signature — rejecting webhook');
            // Log the failed attempt for audit
            await webhookService.logWebhook(
                'palmpay',
                body.type || body.notifyType || 'unknown',
                body,
                false,
                body.orderNo,
                'Rejected: invalid signature'
            );
            res.status(400).json({ success: false, message: 'Invalid PalmPay signature' });
            return;
        }

        if (skipSigVerify) {
            logger.warn('[WEBHOOK] ⚠️  Signature verification BYPASSED via PALMPAY_SKIP_SIG_VERIFY=true');
        }

        // ── 2️⃣  TIMESTAMP PROTECTION ─────────────────────────────────────────
        if (!webhookService.isTimestampValid(body.createdTime || body.requestTime)) {
            logger.warn('[WEBHOOK] ❌ Expired webhook timestamp — rejecting');
            res.status(400).json({ success: false, message: 'Expired webhook (timestamp too old)' });
            return;
        }

        // ── 3️⃣  REPLAY PROTECTION ────────────────────────────────────────────
        const orderNo = body.orderNo || body.data?.orderNo;
        if (orderNo && await webhookService.isReplayWebhook(orderNo)) {
            logger.warn(`[WEBHOOK] ⚠️  Replay detected for orderNo=${orderNo} — returning 200 (idempotent)`);
            res.status(200).json({ success: true, message: 'Already processed' });
            return;
        }

        // ── Log the incoming webhook ──────────────────────────────────────────
        const webhookLog = await webhookService.logWebhook(
            'palmpay',
            body.type || body.notifyType || 'unknown',
            body,
            isValidSignature,
            orderNo
        );

        // Duplicate orderNo in log means race condition → already handled
        if (!webhookLog && orderNo) {
            logger.warn(`[WEBHOOK] ⚠️  Log creation failed (likely race condition on orderNo=${orderNo}) — returning 200`);
            res.status(200).json({ success: true, message: 'Already processed' });
            return;
        }

        // ── 4️⃣  PROCESS (Duplicate tx guard is inside handleDeposit) ─────────
        const result = await webhookService.processWebhook(body);

        // Update log with outcome
        if (webhookLog) {
            await webhookService.updateWebhookLog(webhookLog._id, {
                dispatchStatus:  result.success ? 'success' : 'failed',
                userId:          result.userId,
                processingResult: result.message,
            });
        }

        logger.info(`[WEBHOOK] ✅ Processing complete: ${result.message}`);
        res.status(200).json({ success: result.success, message: result.message });

    } catch (error: any) {
        logger.error('[WEBHOOK] ❌ Unhandled error processing PalmPay webhook', error);
        // Always return 200 to PalmPay — prevents it from hammering your server with retries
        res.status(200).json({ success: false, message: 'Internal error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PalmPay Payout Webhook Handler
// POST /api/webhooks/palmpay/payout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/palmpay/payout', async (req: Request, res: Response): Promise<void> => {
    try {
        const body = req.body;
        logger.info('[PAYOUT WEBHOOK] ══════ PalmPay Payout Webhook Received ══════');
        logger.info('[PAYOUT WEBHOOK] Body: ' + JSON.stringify(body, null, 2));

        const { Payout } = require('../models');
        const payoutService = require('../services/PayoutService').payoutService;

        const orderNo = body.orderNo || body.orderId;
        const state = Number(body.orderStatus);

        if (!orderNo) {
            logger.warn('[PAYOUT WEBHOOK] ⚠️ Missing orderNo in payload');
            res.status(200).send('success');
            return;
        }

        const payout = await Payout.findOne({ reference: orderNo });
        if (!payout) {
            logger.warn(`[PAYOUT WEBHOOK] ⚠️ Payout not found for orderNo: ${orderNo}`);
            res.status(200).send('success');
            return;
        }

        // orderStatus = 2 (Success), 3 (Failed), 4 (Refund)
        if (state === 2) {
            await payoutService.handlePayoutSuccess(payout);
            logger.info(`[PAYOUT WEBHOOK] ✅ Payout ${orderNo} marked as success.`);
        } else if (state === 3 || state === 4 || state === -1) {
            await payoutService.handlePayoutFailure(payout, body.errorMsg || 'Transaction failed');
            logger.info(`[PAYOUT WEBHOOK] ❌ Payout ${orderNo} marked as failed. Reason: ${body.errorMsg}`);
        }

        // PalmPay expects 'success' plain text
        res.status(200).send('success');
    } catch (error) {
        logger.error('[PAYOUT WEBHOOK] Error', error);
        res.status(500).send('error');
    }
});

export default router;
