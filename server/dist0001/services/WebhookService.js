"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookService = exports.WebhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const models_1 = require("../models");
const WalletService_1 = require("./WalletService");
const EmailService_1 = require("./EmailService");
const config_1 = __importDefault(require("../config"));
// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
/** Maximum age of an incoming PalmPay webhook (10 minutes). */
const WEBHOOK_TIMESTAMP_WINDOW_MS = 10 * 60 * 1000;
class WebhookService {
    constructor() {
        this.webhookSecret =
            process.env.VTPAY_WEBHOOK_SECRET ||
                process.env.PALMPAY_WEBHOOK_SECRET ||
                'default-webhook-secret';
        if (this.webhookSecret === 'default-webhook-secret') {
            logger_1.logger.warn('⚠️  Webhook secret not configured (using insecure default)!');
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 1️⃣  PALMPAY SIGNATURE VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Verify webhook signature using RSA.
     * Automatically URL-decodes the signature (PalmPay sends URL-encoded base64).
     * Tries RSA-SHA256 → RSA-SHA1 → RSA-SHA1(MD5(payload)).
     */
    verifySignature(payload, rawSignature) {
        if (!rawSignature || !payload) {
            logger_1.logger.error('[SIG] Missing signature or payload for verification');
            return false;
        }
        try {
            // URL-decode the signature if needed (PalmPay sends URL-encoded base64)
            const signature = rawSignature.includes('%')
                ? decodeURIComponent(rawSignature)
                : rawSignature;
            const publicKey = config_1.default.palmpay.publicKey;
            if (!publicKey) {
                logger_1.logger.error('[SIG] PalmPay public key not configured');
                return false;
            }
            // Normalise key format
            let formattedKey = publicKey
                .trim()
                .replace(/^["']|["']$/g, '')
                .replace(/\\n/g, '\n');
            if (!formattedKey.startsWith('-----BEGIN PUBLIC KEY-----')) {
                formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
            }
            // Attempt 1 – RSA-SHA256
            const verify256 = crypto_1.default.createVerify('RSA-SHA256');
            verify256.update(payload);
            if (verify256.verify(formattedKey, signature, 'base64')) {
                logger_1.logger.info('[SIG] ✅ Verified via RSA-SHA256');
                return true;
            }
            // Attempt 2 – RSA-SHA1
            const verify1 = crypto_1.default.createVerify('RSA-SHA1');
            verify1.update(payload);
            if (verify1.verify(formattedKey, signature, 'base64')) {
                logger_1.logger.info('[SIG] ✅ Verified via RSA-SHA1');
                return true;
            }
            // Attempt 3 – PalmPay V2: RSA-SHA1( MD5(payload).toUpperCase() )
            const md5Hash = crypto_1.default
                .createHash('md5')
                .update(payload)
                .digest('hex')
                .toUpperCase();
            const verifyMD5 = crypto_1.default.createVerify('RSA-SHA1');
            verifyMD5.update(md5Hash);
            if (verifyMD5.verify(formattedKey, signature, 'base64')) {
                logger_1.logger.info('[SIG] ✅ Verified via RSA-SHA1 + MD5(payload)');
                return true;
            }
            logger_1.logger.error('[SIG] ❌ All verification attempts failed (RSA-SHA256, RSA-SHA1, RSA-MD5-SHA1)');
            return false;
        }
        catch (error) {
            logger_1.logger.error('[SIG] Verification threw an exception', error);
            return false;
        }
    }
    /**
     * Alternative: verify when signature is embedded in the body.
     * PalmPay V2 requires parameters sorted alphabetically, joined as key=value&…
     */
    verifyBodySignature(body, rawSignature) {
        try {
            // Decode if URL-encoded
            const signature = rawSignature.includes('%')
                ? decodeURIComponent(rawSignature)
                : rawSignature;
            // Filter & sort params alphabetically (exclude sign/signature, nulls, objects)
            const filteredParams = {};
            for (const key of Object.keys(body).sort()) {
                if (key !== 'sign' &&
                    key !== 'signature' &&
                    body[key] !== undefined &&
                    body[key] !== null &&
                    body[key] !== '' &&
                    typeof body[key] !== 'object') {
                    filteredParams[key] = body[key];
                }
            }
            const payload = Object.keys(filteredParams)
                .map(k => `${k}=${filteredParams[k]}`)
                .join('&');
            logger_1.logger.info(`[SIG] Constructed body-signature payload: ${payload}`);
            return this.verifySignature(payload, signature);
        }
        catch (e) {
            logger_1.logger.error('[SIG] verifyBodySignature error', e);
            return false;
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 3️⃣  TIMESTAMP PROTECTION
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Returns true if the webhook's createdTime is within the allowed window.
     * PalmPay sends createdTime as a Unix timestamp in milliseconds.
     */
    isTimestampValid(createdTime) {
        if (!createdTime) {
            // No timestamp field — cannot validate; allow through (log a warning)
            logger_1.logger.warn('[TIMESTAMP] No createdTime in webhook body, skipping timestamp check');
            return true;
        }
        const webhookMs = Number(createdTime);
        const agMs = Date.now() - webhookMs;
        if (agMs > WEBHOOK_TIMESTAMP_WINDOW_MS) {
            logger_1.logger.warn(`[TIMESTAMP] ❌ Webhook is ${Math.round(agMs / 1000)}s old (max ${WEBHOOK_TIMESTAMP_WINDOW_MS / 1000}s). Rejecting.`);
            return false;
        }
        return true;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 2️⃣  WEBHOOK REPLAY PROTECTION
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Checks if this orderNo has already been logged/processed.
     * Returns true if it's a duplicate.
     */
    async isReplayWebhook(orderNo) {
        if (!orderNo)
            return false;
        const existing = await models_1.WebhookLog.findOne({ orderNo });
        if (existing) {
            logger_1.logger.warn(`[REPLAY] ⚠️  Duplicate webhook received for orderNo: ${orderNo}`);
            return true;
        }
        return false;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Webhook Logging
    // ─────────────────────────────────────────────────────────────────────────
    async logWebhook(source, event, payload, signatureValid, orderNo, processingResult) {
        try {
            return await models_1.WebhookLog.create({
                source,
                eventType: event,
                payload,
                signatureValid,
                orderNo, // Stored for future replay checks
                processingResult,
                dispatchStatus: 'pending',
                receivedAt: new Date(),
            });
        }
        catch (error) {
            // Duplicate key on orderNo means it was already logged (replay)
            if (error.code === 11000) {
                logger_1.logger.warn(`[LOG] Duplicate webhook log for orderNo: ${orderNo}`);
                return null;
            }
            logger_1.logger.error('[LOG] Failed to log webhook', error);
            return null;
        }
    }
    async updateWebhookLog(logId, updateData) {
        try {
            await models_1.WebhookLog.findByIdAndUpdate(logId, updateData);
        }
        catch (error) {
            logger_1.logger.error('[LOG] Failed to update webhook log', error);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Main Entry Point
    // ─────────────────────────────────────────────────────────────────────────
    async processWebhook(event) {
        try {
            let type = event.type || event.eventType || event.notifyType || 'UNKNOWN';
            if (Array.isArray(type))
                type = type[0];
            const data = event.data || event;
            // Auto-detect PalmPay V2 deposit if type is missing
            if (type === 'UNKNOWN' && data.orderNo && (data.amount || data.orderAmount)) {
                type = 'pay_in_order';
            }
            logger_1.logger.info(`[PROCESS] Handling webhook event type: ${type}`);
            if (type === 'pay_in_order' ||
                type === 'PAY_IN_SUCCESS' ||
                type === 'vbas_virtual_bank_account') {
                return await this.handleDeposit(data);
            }
            logger_1.logger.warn(`[PROCESS] Unhandled event type: ${type}`);
            return { success: true, message: 'Event ignored' };
        }
        catch (error) {
            logger_1.logger.error('[PROCESS] Webhook processing failed', error);
            return { success: false, message: error.message || 'Processing failed' };
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Deposit Handler
    // ─────────────────────────────────────────────────────────────────────────
    async handleDeposit(data) {
        logger_1.logger.info('[DEPOSIT] Handling PalmPay deposit event:', data);
        const orderNo = data.orderNo || data.paymentReference || data.transId;
        const amount = Number(data.amount || data.transAmount || data.orderAmount);
        const status = data.status || data.transStatus || data.orderStatus;
        const payerName = data.payerName || data.customerName || data.payerAccountName;
        const payerAccount = data.payerAccount || data.customerAccount || data.payerAccountNo;
        const payerBankName = data.payerBankName || data.bankName;
        const virtualAccountNo = data.virtualAccount || data.virtualAccountNo || data.accountNumber;
        const externalReference = data.externalReference || data.orderId || data.paymentReference;
        logger_1.logger.info(`[DEPOSIT] OrderNo=${orderNo}, Amount=${amount}, Status=${status}, VA=${virtualAccountNo}`);
        // Normalise status
        const isSuccess = status === 'SUCCESS' || status === '00' || status === 1 || status === '1';
        if (!isSuccess) {
            logger_1.logger.info(`[DEPOSIT] Status is ${status}, ignoring.`);
            return { success: true, message: 'Ignored non-success deposit' };
        }
        // Find Virtual Account
        const virtualAccount = await models_1.VirtualAccount.findOne({
            accountNumber: virtualAccountNo,
        });
        if (!virtualAccount) {
            logger_1.logger.error(`[DEPOSIT] Virtual Account not found: ${virtualAccountNo}`);
            return { success: false, message: 'Virtual Account not found' };
        }
        // 4️⃣  DUPLICATE TRANSACTION PROTECTION
        const existingTxn = await models_1.Transaction.findOne({ externalRef: orderNo });
        if (existingTxn) {
            logger_1.logger.info(`[DEPOSIT] ✅ Transaction ${orderNo} already processed. Skipping.`);
            return {
                success: true,
                message: 'Already processed',
                userId: virtualAccount.userId.toString(),
            };
        }
        // Fetch system fee settings
        const settings = await models_1.SystemSetting.findOne();
        const feePercent = settings?.deposit?.virtualAccountChargePercent ?? 1.0;
        const fee = (amount * feePercent) / 100;
        const netAmount = amount - fee;
        // Clearance date: 24h + 5m
        const clearanceDate = new Date(Date.now() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);
        logger_1.logger.info(`[DEPOSIT] Amount=₦${amount / 100}, Fee=₦${fee / 100} (${feePercent}%), Net=₦${netAmount / 100}, Clears=${clearanceDate.toISOString()}`);
        try {
            const transaction = await WalletService_1.walletService.creditWallet(virtualAccount.userId.toString(), netAmount, 'deposit', `Deposit from ${payerName || 'Unknown'} (${payerAccount || '****'})`, orderNo, {
                source: 'palmpay',
                externalReference,
                payerName,
                payerAccount,
                payerBankName,
                virtualAccount: virtualAccount.accountNumber,
                originalAmount: amount,
                appliedFee: fee,
            }, undefined, fee, false, // isCleared = false → pending settlement
            clearanceDate);
            logger_1.logger.info(`[DEPOSIT] 💰 Wallet credited for user ${virtualAccount.userId} | ref=${transaction.reference}`);
            // 5️⃣  SECURE USER WEBHOOK
            await this.sendUserWebhook(virtualAccount.userId.toString(), 'transaction.deposit', {
                reference: transaction.reference,
                amount: transaction.amount,
                currency: 'NGN',
                status: 'success',
                customer: {
                    name: payerName,
                    accountNumber: payerAccount,
                },
                virtualAccount: virtualAccount.accountNumber,
                timestamp: transaction.createdAt,
            });
            return {
                success: true,
                message: 'Deposit processed and user notified',
                userId: virtualAccount.userId.toString(),
            };
        }
        catch (error) {
            logger_1.logger.error(`[DEPOSIT] Failed to credit wallet: ${error.message}`, error);
            if (error.message?.includes('duplicate') ||
                error.message?.includes('already processed')) {
                return {
                    success: true,
                    message: 'Already processed',
                    userId: virtualAccount.userId.toString(),
                };
            }
            throw error;
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 6️⃣  AUTOMATIC DEPOSIT RECONCILIATION
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Called by the reconciliation cron job every 5 minutes.
     * Finds deposits still stuck in "pending" status and queries PalmPay to
     * confirm whether they actually succeeded, then credits accordingly.
     */
    async reconcileMissedDeposits() {
        logger_1.logger.info('[RECONCILE] 🔄 Running PalmPay deposit reconciliation job...');
        try {
            // Find any Transaction records that are deposits still pending/uncleared
            // where the source was palmpay (stored in metadata)
            const pendingDeposits = await models_1.Transaction.find({
                type: 'credit',
                category: 'deposit',
                status: 'pending',
                'metadata.source': 'palmpay',
            }).limit(50);
            if (pendingDeposits.length === 0) {
                logger_1.logger.info('[RECONCILE] No pending PalmPay deposits to reconcile.');
                return;
            }
            logger_1.logger.info(`[RECONCILE] Found ${pendingDeposits.length} pending deposits to check.`);
            const palmPayBaseUrl = process.env.PALMPAY_BASE_URL || 'https://sandbox.palmpay.com/v2';
            const palmPayApiKey = process.env.PALMPAY_API_KEY;
            for (const deposit of pendingDeposits) {
                const orderNo = deposit.externalRef;
                if (!orderNo)
                    continue;
                try {
                    const response = await axios_1.default.get(`${palmPayBaseUrl}/virtual/account/query`, {
                        params: { orderNo },
                        headers: {
                            Authorization: `Bearer ${palmPayApiKey}`,
                            countryCode: 'NG',
                            'Content-Type': 'application/json',
                        },
                        timeout: 15000,
                    });
                    const data = response.data?.data;
                    const remoteStatus = data?.status || data?.orderStatus;
                    if (remoteStatus === 'SUCCESS' ||
                        remoteStatus === '00' ||
                        remoteStatus === 1 ||
                        remoteStatus === '1') {
                        // Mark the transaction as success
                        await models_1.Transaction.findByIdAndUpdate(deposit._id, {
                            $set: { status: 'success' },
                        });
                        logger_1.logger.info(`[RECONCILE] ✅ Reconciled deposit ${orderNo} → marked as success`);
                    }
                    else {
                        logger_1.logger.info(`[RECONCILE] Deposit ${orderNo} still pending on PalmPay (status=${remoteStatus})`);
                    }
                }
                catch (err) {
                    logger_1.logger.error(`[RECONCILE] Failed to query PalmPay for orderNo=${orderNo}: ${err.message}`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('[RECONCILE] Reconciliation job error', error);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 5️⃣  SECURE OUTGOING USER WEBHOOKS
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Sends a signed webhook to the user's configured webhook URL.
     *
     * Headers sent:
     *  - X-VTStack-Signature  → HMAC-SHA256 of JSON payload (hex)
     *  - X-VTStack-Secret     → Shared static secret (process.env.USER_WEBHOOK_SECRET)
     *
     * Receivers should verify BOTH headers. The static secret catches simple
     * 403-style auth checks; the HMAC ensures payload integrity.
     */
    async sendUserWebhook(userId, event, data) {
        try {
            const user = await models_1.User.findById(userId);
            if (!user)
                return;
            if (!user.webhookUrl) {
                logger_1.logger.debug(`[WEBHOOK] User ${userId} has no webhook URL. Skipping ${event}.`);
                return;
            }
            if (!user.webhookActive) {
                logger_1.logger.debug(`[WEBHOOK] User ${userId} webhook disabled. Skipping ${event}.`);
                return;
            }
            logger_1.logger.info(`[WEBHOOK] Sending ${event} to user ${userId} @ ${user.webhookUrl}`);
            const payload = {
                event,
                data,
                timestamp: new Date().toISOString(),
            };
            const payloadJson = JSON.stringify(payload);
            // HMAC-SHA256 signature (payload integrity)
            const hmacSignature = crypto_1.default
                .createHmac('sha256', this.webhookSecret)
                .update(payloadJson)
                .digest('hex');
            // Static shared secret (simple auth, mirrors what user docs describe)
            const userWebhookSecret = process.env.USER_WEBHOOK_SECRET || this.webhookSecret;
            try {
                await axios_1.default.post(user.webhookUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-VTStack-Signature': hmacSignature,
                        'X-VTStack-Secret': userWebhookSecret,
                    },
                    timeout: 10000,
                });
                logger_1.logger.info(`[WEBHOOK] ✅ Delivered to ${user.webhookUrl}`);
            }
            catch (webhookError) {
                logger_1.logger.error(`[WEBHOOK] ❌ Failed to deliver to ${user.webhookUrl}: ${webhookError.message}`);
                // Notify user by email about the failure
                const companyName = (await models_1.SystemSetting.findOne())?.general?.companyName || 'VTStack';
                const emailHtml = `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #ef4444;">Webhook Delivery Failed</h2>
                        <p>Hello ${user.firstName},</p>
                        <p>We attempted to send a webhook notification for the event <strong>${event}</strong> to your configured URL, but it failed.</p>
                        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                            <p style="margin: 5px 0;"><strong>Webhook URL:</strong> ${user.webhookUrl}</p>
                            <p style="margin: 5px 0;"><strong>Error:</strong> ${webhookError.message}</p>
                            <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        <p>Please check your server or update your webhook URL in the ${companyName} dashboard.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </div>
                `;
                await EmailService_1.emailService.sendEmail(user.email, 'Action Required: Webhook Delivery Failed', emailHtml);
            }
        }
        catch (error) {
            logger_1.logger.error(`[WEBHOOK] Critical error in sendUserWebhook: ${error.message}`);
        }
    }
}
exports.WebhookService = WebhookService;
exports.webhookService = new WebhookService();
//# sourceMappingURL=WebhookService.js.map