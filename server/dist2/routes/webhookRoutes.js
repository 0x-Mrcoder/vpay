"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const services_1 = require("../services");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// GET /api/webhooks/health
// ─────────────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Webhook endpoint is active',
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
router.post('/palmpay', async (req, res) => {
    const body = req.body;
    try {
        logger_1.logger.info('[WEBHOOK] ══════ PalmPay Webhook Received ══════');
        logger_1.logger.info('[WEBHOOK] Body: ' + JSON.stringify(body, null, 2));
        // ── 1️⃣  SIGNATURE VERIFICATION ───────────────────────────────────────
        // Collect signature from header or body (PalmPay V2 puts it in body.sign)
        const rawSignature = (req.headers['signature'] ||
            req.headers['x-palm-signature'] ||
            req.headers['sign'] ||
            body.sign ||
            '');
        const rawPayload = req.rawBody || JSON.stringify(body);
        const skipSigVerify = process.env.PALMPAY_SKIP_SIG_VERIFY === 'true';
        let isValidSignature = skipSigVerify
            ? true
            : services_1.webhookService.verifySignature(rawPayload, rawSignature);
        // Fallback: verify using body-params style (PalmPay V2 body signing)
        if (!isValidSignature && !skipSigVerify && body.sign) {
            isValidSignature = services_1.webhookService.verifyBodySignature(body, body.sign);
        }
        if (!isValidSignature && !skipSigVerify) {
            logger_1.logger.warn('[WEBHOOK] ❌ Invalid signature — rejecting webhook');
            // Log the failed attempt for audit
            await services_1.webhookService.logWebhook('palmpay', body.type || body.notifyType || 'unknown', body, false, body.orderNo, 'Rejected: invalid signature');
            res.status(400).json({ success: false, message: 'Invalid PalmPay signature' });
            return;
        }
        if (skipSigVerify) {
            logger_1.logger.warn('[WEBHOOK] ⚠️  Signature verification BYPASSED via PALMPAY_SKIP_SIG_VERIFY=true');
        }
        // ── 2️⃣  TIMESTAMP PROTECTION ─────────────────────────────────────────
        if (!services_1.webhookService.isTimestampValid(body.createdTime || body.requestTime)) {
            logger_1.logger.warn('[WEBHOOK] ❌ Expired webhook timestamp — rejecting');
            res.status(400).json({ success: false, message: 'Expired webhook (timestamp too old)' });
            return;
        }
        // ── 3️⃣  REPLAY PROTECTION ────────────────────────────────────────────
        const orderNo = body.orderNo || body.data?.orderNo;
        if (orderNo && await services_1.webhookService.isReplayWebhook(orderNo)) {
            logger_1.logger.warn(`[WEBHOOK] ⚠️  Replay detected for orderNo=${orderNo} — returning 200 (idempotent)`);
            res.status(200).json({ success: true, message: 'Already processed' });
            return;
        }
        // ── Log the incoming webhook ──────────────────────────────────────────
        const webhookLog = await services_1.webhookService.logWebhook('palmpay', body.type || body.notifyType || 'unknown', body, isValidSignature, orderNo);
        // Duplicate orderNo in log means race condition → already handled
        if (!webhookLog && orderNo) {
            logger_1.logger.warn(`[WEBHOOK] ⚠️  Log creation failed (likely race condition on orderNo=${orderNo}) — returning 200`);
            res.status(200).json({ success: true, message: 'Already processed' });
            return;
        }
        // ── 4️⃣  PROCESS (Duplicate tx guard is inside handleDeposit) ─────────
        const result = await services_1.webhookService.processWebhook(body);
        // Update log with outcome
        if (webhookLog) {
            await services_1.webhookService.updateWebhookLog(webhookLog._id, {
                dispatchStatus: result.success ? 'success' : 'failed',
                userId: result.userId,
                processingResult: result.message,
            });
        }
        logger_1.logger.info(`[WEBHOOK] ✅ Processing complete: ${result.message}`);
        res.status(200).json({ success: result.success, message: result.message });
    }
    catch (error) {
        logger_1.logger.error('[WEBHOOK] ❌ Unhandled error processing PalmPay webhook', error);
        // Always return 200 to PalmPay — prevents it from hammering your server with retries
        res.status(200).json({ success: false, message: 'Internal error' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// Payrant / Payout Webhook Handler
// POST /api/webhooks/payout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payout', async (req, res) => {
    try {
        logger_1.logger.info('[PAYOUT WEBHOOK] ══════ Payrant Webhook Received ══════');
        logger_1.logger.info('[PAYOUT WEBHOOK] Body: ' + JSON.stringify(req.body, null, 2));
        // TODO: Implement Payrant signature verification (Phase 2)
        res.status(200).json({ success: true, message: 'Webhook received' });
    }
    catch (error) {
        logger_1.logger.error('[PAYOUT WEBHOOK] Error', error);
        res.status(200).json({ success: false });
    }
});
exports.default = router;
//# sourceMappingURL=webhookRoutes.js.map