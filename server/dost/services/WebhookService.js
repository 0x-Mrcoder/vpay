"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookService = exports.WebhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
const models_1 = require("../models");
const WalletService_1 = require("./WalletService");
class WebhookService {
    constructor() {
        this.webhookSecret = process.env.PALMPAY_WEBHOOK_SECRET || process.env.VTPAY_WEBHOOK_SECRET || 'default-webhook-secret';
        if (this.webhookSecret === 'default-webhook-secret') {
            logger_1.logger.warn('Webhook secret not configured properly (using default)!');
        }
    }
    /**
     * Verify webhook signature using HMAC-SHA256
     * PalmPay sends signature in 'x-palm-signature' header (or similar, depending on docs)
     * For now assuming standard HMAC-SHA256 of raw body
     */
    verifySignature(payload, signature) {
        if (!signature || !payload) {
            logger_1.logger.error('Missing signature or payload for verification');
            return false;
        }
        try {
            const expectedSignature = crypto_1.default
                .createHmac('sha256', this.webhookSecret)
                .update(payload)
                .digest('hex');
            // Use timingSafeEqual to prevent timing attacks
            const signatureBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(expectedSignature);
            if (signatureBuffer.length !== expectedBuffer.length) {
                return false;
            }
            return crypto_1.default.timingSafeEqual(signatureBuffer, expectedBuffer);
        }
        catch (error) {
            logger_1.logger.error('Signature verification error', error);
            return false;
        }
    }
    /**
     * Log webhook for debugging and audit
     */
    async logWebhook(source, event, payload, signatureValid, processingResult) {
        try {
            await models_1.WebhookLog.create({
                source,
                event,
                payload,
                signatureValid,
                processingResult,
                receivedAt: new Date(),
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to log webhook', error);
        }
    }
    /**
     * Placeholder for PalmPay webhook processing
     * This will be implemented in Phase 2
     */
    /**
     * Process PalmPay webhook event
     */
    async processWebhook(event) {
        try {
            logger_1.logger.info('Processing PalmPay webhook event', { type: event.type });
            switch (event.type) {
                case 'pay_in_order': // Deposit
                    return await this.handleDeposit(event.data);
                case 'transfer_notify': // Payout/Transfer
                    return await this.handleTransferUpdate(event.data);
                default:
                    logger_1.logger.warn(`Unknown webhook event type: ${event.type}`);
                    return { success: true, message: 'Event ignored' };
            }
        }
        catch (error) {
            logger_1.logger.error('Webhook processing failed', error);
            return {
                success: false,
                message: error.message || 'Processing failed',
            };
        }
    }
    async handleDeposit(data) {
        // Data structure: { orderNo, amount, currency, status, paymentTime, externalReference, payerName... }
        // externalReference should match our Virtual Account reference or be linked to a user.
        // Actually, for Virtual Accounts, the externalReference might be the one we set when creating the VA?
        // OR the VA number itself is the key.
        // We need to find the Virtual Account by number or reference.
        // PalmPay payload usually includes the Virtual Account Number.
        const { orderNo, amount, status, externalReference, payerAccount, payerName } = data;
        if (status !== 'SUCCESS') {
            logger_1.logger.info(`Deposit ${orderNo} status is ${status}, ignoring.`);
            return { success: true, message: 'Ignored non-success deposit' };
        }
        // Check if transaction already processed
        const existingTxn = await WalletService_1.walletService.getTransactionByReference(orderNo); // Using orderNo as unique ref
        if (existingTxn) {
            logger_1.logger.info(`Deposit ${orderNo} already processed.`);
            return { success: true, message: 'Already processed' };
        }
        // Find Virtual Account
        // Assuming externalReference helps, or we search by VA number if in payload
        // If data doesn't have VA number, we rely on externalReference which we saved in VA.
        let virtualAccount = await models_1.VirtualAccount.findOne({ reference: externalReference });
        // If not found by reference, try to match via other means if payload has VA number (e.g. data.virtualAccount)
        // Adjust based on actual payload structure.
        if (!virtualAccount && data.virtualAccount) {
            virtualAccount = await models_1.VirtualAccount.findOne({ accountNumber: data.virtualAccount });
        }
        if (!virtualAccount) {
            logger_1.logger.error(`Virtual Account not found for deposit: ${JSON.stringify(data)}`);
            return { success: false, message: 'Virtual Account not found' };
        }
        // Credit Wallet
        await WalletService_1.walletService.creditWallet(virtualAccount.userId.toString(), amount, // kobo
        'deposit', orderNo, `Deposit from ${payerName || 'Unknown'} (${payerAccount || '****'})`, {
            source: 'palmpay',
            externalReference,
            payerName,
            payerAccount
        });
        return { success: true, message: 'Deposit processed successfully' };
    }
    async handleTransferUpdate(data) {
        // Data: { orderNo, amount, status, ... }
        // orderNo should correspond to our Payout Transaction Reference
        const { orderNo, status, failReason } = data;
        // Find Payout by reference (orderNo)
        const { Payout } = await Promise.resolve().then(() => __importStar(require('../models'))); // Dynamic import to avoid circular dependency if any
        const payout = await Payout.findOne({ reference: orderNo });
        if (!payout) {
            logger_1.logger.warn(`Payout not found for update: ${orderNo}`);
            return { success: true, message: 'Payout not found' };
        }
        const { payoutService } = await Promise.resolve().then(() => __importStar(require('./PayoutService')));
        if (status === 'SUCCESS') {
            await payoutService.handlePayoutSuccess(payout);
        }
        else if (status === 'FAILED') {
            await payoutService.handlePayoutFailure(payout, failReason || 'Transfer failed');
        }
        return { success: true, message: 'Transfer update processed' };
    }
    /**
     * Retry a webhook dispatch
     */
    async retryDispatch(webhookId) {
        try {
            const webhook = await models_1.WebhookLog.findById(webhookId).populate('userId');
            if (!webhook) {
                return { success: false, message: 'Webhook log not found' };
            }
            if (webhook.source !== 'vtpay') {
                return { success: false, message: 'Only VTPay (outbound) webhooks can be retried' };
            }
            const user = webhook.userId;
            if (!user || !user.webhookUrl) {
                return { success: false, message: 'Tenant webhook URL not configured' };
            }
            // Simple retry logic: just log that we are retrying and maybe call axios 
            // In a real system, we'd have a dispatch queue. 
            // Here we'll simulate a dispatch or just create a new log entry/update old one.
            // For now, let's just update the status to pending to simulate retry
            // Ideally we should actually send the request.
            webhook.dispatchStatus = 'pending';
            webhook.dispatchAttempts = (webhook.dispatchAttempts || 0) + 1;
            await webhook.save();
            // Fire and forget dispatch (mock)
            this.dispatchWebhook(user.webhookUrl, webhook.eventType, webhook.payload, webhookId).catch(console.error);
            return { success: true, message: 'Webhook retry initiated' };
        }
        catch (error) {
            logger_1.logger.error('Retry dispatch error', error);
            return { success: false, message: error.message };
        }
    }
    /**
     * Dispatch webhook to tenant
     */
    async dispatchWebhook(url, event, payload, logId) {
        try {
            const axios = require('axios');
            const signature = crypto_1.default
                .createHmac('sha256', this.webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');
            await axios.post(url, payload, {
                headers: {
                    'X-VTPay-Signature': signature,
                    'X-VTPay-Event': event,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            if (logId) {
                await models_1.WebhookLog.findByIdAndUpdate(logId, {
                    dispatchStatus: 'success',
                    lastAttemptAt: new Date()
                });
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to dispatch webhook to ${url}`, error.message);
            if (logId) {
                await models_1.WebhookLog.findByIdAndUpdate(logId, {
                    dispatchStatus: 'failed',
                    lastAttemptAt: new Date(),
                    processingResult: { error: error.message }
                });
            }
        }
    }
}
exports.WebhookService = WebhookService;
exports.webhookService = new WebhookService();
//# sourceMappingURL=WebhookService.js.map