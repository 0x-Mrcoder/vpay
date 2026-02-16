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
     * Verify webhook signature using RSA
     * PalmPay sends signature in 'signature' header
     */
    verifySignature(payload, signature) {
        if (!signature || !payload) {
            logger_1.logger.error('Missing signature or payload for verification');
            return false;
        }
        try {
            const publicKey = process.env.PALMPAY_PUBLIC_KEY;
            if (!publicKey) {
                logger_1.logger.error('PalmPay public key not configured for webhook verification');
                return false;
            }
            // Normalize public key format
            let formattedKey = publicKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
            if (!formattedKey.startsWith('-----BEGIN PUBLIC KEY-----')) {
                formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
            }
            // Verify RSA signature
            const verify = crypto_1.default.createVerify('RSA-SHA256'); // Or RSA-SHA1 depending on PalmPay version
            verify.update(payload);
            return verify.verify(formattedKey, signature, 'base64');
        }
        catch (error) {
            logger_1.logger.error('Signature verification error', error);
            return false;
        }
    }
    /**
     * Alternative verification for when signature is in the body
     * Some providers sign the body payload excluding the signature field
     */
    verifyBodySignature(body, signature) {
        try {
            // Clone and remove signature
            const cleanBody = { ...body };
            delete cleanBody.sign;
            delete cleanBody.signature;
            // Start with simplest assumption: JSON stringify cleanly
            // Note: This is brittle without exact ordering rules from provider
            const payload = JSON.stringify(cleanBody);
            return this.verifySignature(payload, signature);
        }
        catch (e) {
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
    /**
     * Process PalmPay webhook event
     */
    async processWebhook(event) {
        try {
            // PalmPay V2 might send data directly or wrapped in 'event'
            // We inspect the structure
            const type = event.type || event.eventType || 'UNKNOWN';
            const data = event.data || event;
            logger_1.logger.info(`Processing PalmPay webhook event: ${type}`);
            // Detect "Pay In" (Virtual Account Funding)
            // Common types: 'pay_in_order', 'PAY_IN_SUCCESS', 'virtual_account_transaction'
            if (type === 'pay_in_order' || type === 'PAY_IN_SUCCESS' || (data.orderNo && data.amount)) {
                return await this.handleDeposit(data);
            }
            logger_1.logger.warn(`Unknown or Unhandled webhook event type: ${type}`);
            return { success: true, message: 'Event ignored' };
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
        logger_1.logger.info('Handling Deposit Event:', data);
        // Extract fields (flexible matching for debugging)
        const orderNo = data.orderNo || data.paymentReference || data.transId;
        const amount = data.amount || data.transAmount; // Check limits (kobo vs naira)
        const status = data.status || data.transStatus;
        const payerName = data.payerName || data.customerName;
        const payerAccount = data.payerAccount || data.customerAccount;
        // Try to find target Virtual Account
        let virtualAccountNo = data.virtualAccount || data.virtualAccountNo || data.accountNumber;
        let externalReference = data.externalReference || data.orderId;
        logger_1.logger.info(`Extracted Data - OrderNo: ${orderNo}, Amount: ${amount}, Status: ${status}, VA: ${virtualAccountNo}`);
        if (status !== 'SUCCESS') {
            logger_1.logger.info(`Deposit ${orderNo} status is ${status}, ignoring.`);
            return { success: true, message: 'Ignored non-success deposit' };
        }
        const virtualAccount = await models_1.VirtualAccount.findOne({ accountNumber: virtualAccountNo });
        if (!virtualAccount) {
            logger_1.logger.error(`Virtual Account not found: ${virtualAccountNo}`);
            return { success: false, message: 'Virtual Account not found' };
        }
        // Credit Wallet
        try {
            const transaction = await WalletService_1.walletService.creditWallet(virtualAccount.userId.toString(), amount, // kobo
            'deposit', orderNo, `Deposit from ${payerName || 'Unknown'} (${payerAccount || '****'})`, {
                source: 'palmpay',
                externalReference,
                payerName,
                payerAccount
            });
            // Notify User via Webhook
            await this.sendUserWebhook(virtualAccount.userId.toString(), 'transaction.deposit', {
                reference: transaction.reference,
                amount: transaction.amount,
                currency: 'NGN',
                status: 'success',
                customer: {
                    name: payerName,
                    accountNumber: payerAccount
                },
                virtualAccount: virtualAccount.accountNumber,
                timestamp: transaction.createdAt
            });
            return { success: true, message: 'Deposit processed and user notified' };
        }
        catch (error) {
            logger_1.logger.error(`Failed to credit wallet: ${error.message}`);
            // If duplicate, it's fine
            if (error.message.includes('duplicate') || error.message.includes('already processed')) {
                return { success: true, message: 'Already processed' };
            }
            throw error; // Retry for actual errors
        }
    }
    // Removed Payout logic for now to focus on PayIn logic
    async handleTransferUpdate(data) {
        return { success: true, message: 'Not implemented' };
    }
    /**
     * Send webhook notification to user
     */
    async sendUserWebhook(userId, event, data) {
        try {
            const { User } = await Promise.resolve().then(() => __importStar(require('../models'))); // Dynamic import
            const user = await User.findById(userId);
            if (!user || !user.webhookUrl) {
                return;
            }
            logger_1.logger.info(`Sending ${event} webhook to user ${userId} at ${user.webhookUrl}`);
            const payload = {
                event,
                data,
                timestamp: new Date().toISOString(),
            };
            // Sign the payload using our App Secret (User's API Key or a shared secret)
            // For now, using the user's API Key if available, or just a system signature
            const signature = crypto_1.default
                .createHmac('sha256', process.env.VTPAY_WEBHOOK_SECRET || 'default')
                .update(JSON.stringify(payload))
                .digest('hex');
            const axios = require('axios');
            await axios.post(user.webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VTStack-Signature': signature,
                },
                timeout: 10000,
            });
            logger_1.logger.info(`Webhook sent successfully to ${user.webhookUrl}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to send user webhook: ${error.message}`);
            // Don't throw, just log. We don't want to fail the transaction processing
        }
    }
}
exports.WebhookService = WebhookService;
exports.webhookService = new WebhookService();
//# sourceMappingURL=WebhookService.js.map