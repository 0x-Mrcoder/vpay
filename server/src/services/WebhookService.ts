import crypto from 'crypto';
import axios from 'axios';
import { logger } from '../utils/logger';
import { VirtualAccount, WebhookLog } from '../models';
import { walletService } from './WalletService';

export class WebhookService {
    private webhookSecret: string;

    constructor() {
        this.webhookSecret = process.env.PALMPAY_WEBHOOK_SECRET || process.env.VTPAY_WEBHOOK_SECRET || 'default-webhook-secret';
        if (this.webhookSecret === 'default-webhook-secret') {
            logger.warn('Webhook secret not configured properly (using default)!');
        }
    }

    /**
     * Verify webhook signature using HMAC-SHA256
     * PalmPay sends signature in 'x-palm-signature' header (or similar, depending on docs)
     * For now assuming standard HMAC-SHA256 of raw body
     */
    verifySignature(payload: string, signature: string): boolean {
        if (!signature || !payload) {
            logger.error('Missing signature or payload for verification');
            return false;
        }

        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(payload)
                .digest('hex');

            // Use timingSafeEqual to prevent timing attacks
            const signatureBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(expectedSignature);

            if (signatureBuffer.length !== expectedBuffer.length) {
                return false;
            }

            return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
        } catch (error) {
            logger.error('Signature verification error', error);
            return false;
        }
    }

    /**
     * Log webhook for debugging and audit
     */
    async logWebhook(source: string, event: string, payload: any, signatureValid: boolean, processingResult?: any): Promise<void> {
        try {
            await WebhookLog.create({
                source,
                event,
                payload,
                signatureValid,
                processingResult,
                receivedAt: new Date(),
            });
        } catch (error) {
            logger.error('Failed to log webhook', error);
        }
    }

    /**
     * Placeholder for PalmPay webhook processing
     * This will be implemented in Phase 2
     */
    /**
     * Process PalmPay webhook event
     */
    async processWebhook(event: any): Promise<{ success: boolean; message: string }> {
        try {
            logger.info('Processing PalmPay webhook event', { type: event.type });

            switch (event.type) {
                case 'pay_in_order': // Deposit
                    return await this.handleDeposit(event.data);

                case 'transfer_notify': // Payout/Transfer
                    return await this.handleTransferUpdate(event.data);

                default:
                    logger.warn(`Unknown webhook event type: ${event.type}`);
                    return { success: true, message: 'Event ignored' };
            }
        } catch (error: any) {
            logger.error('Webhook processing failed', error);
            return {
                success: false,
                message: error.message || 'Processing failed',
            };
        }
    }

    private async handleDeposit(data: any) {
        // Data structure: { orderNo, amount, currency, status, paymentTime, externalReference, payerName... }
        // externalReference should match our Virtual Account reference or be linked to a user.
        // Actually, for Virtual Accounts, the externalReference might be the one we set when creating the VA?
        // OR the VA number itself is the key.

        // We need to find the Virtual Account by number or reference.
        // PalmPay payload usually includes the Virtual Account Number.

        const { orderNo, amount, status, externalReference, payerAccount, payerName } = data;

        if (status !== 'SUCCESS') {
            logger.info(`Deposit ${orderNo} status is ${status}, ignoring.`);
            return { success: true, message: 'Ignored non-success deposit' };
        }

        // Check if transaction already processed
        const existingTxn = await walletService.getTransactionByReference(orderNo); // Using orderNo as unique ref
        if (existingTxn) {
            logger.info(`Deposit ${orderNo} already processed.`);
            return { success: true, message: 'Already processed' };
        }

        // Find Virtual Account
        // Assuming externalReference helps, or we search by VA number if in payload
        // If data doesn't have VA number, we rely on externalReference which we saved in VA.

        let virtualAccount = await VirtualAccount.findOne({ reference: externalReference });

        // If not found by reference, try to match via other means if payload has VA number (e.g. data.virtualAccount)
        // Adjust based on actual payload structure.

        if (!virtualAccount && data.virtualAccount) {
            virtualAccount = await VirtualAccount.findOne({ accountNumber: data.virtualAccount });
        }

        if (!virtualAccount) {
            logger.error(`Virtual Account not found for deposit: ${JSON.stringify(data)}`);
            return { success: false, message: 'Virtual Account not found' };
        }

        // Credit Wallet
        await walletService.creditWallet(
            virtualAccount.userId.toString(),
            amount, // kobo
            'deposit',
            orderNo,
            `Deposit from ${payerName || 'Unknown'} (${payerAccount || '****'})`,
            {
                source: 'palmpay',
                externalReference,
                payerName,
                payerAccount
            }
        );

        return { success: true, message: 'Deposit processed successfully' };
    }

    private async handleTransferUpdate(data: any) {
        // Data: { orderNo, amount, status, ... }
        // orderNo should correspond to our Payout Transaction Reference

        const { orderNo, status, failReason } = data;

        // Find Payout by reference (orderNo)
        const { Payout } = await import('../models'); // Dynamic import to avoid circular dependency if any
        const payout = await Payout.findOne({ reference: orderNo });

        if (!payout) {
            logger.warn(`Payout not found for update: ${orderNo}`);
            return { success: true, message: 'Payout not found' };
        }

        const { payoutService } = await import('./PayoutService');

        if (status === 'SUCCESS') {
            await payoutService.handlePayoutSuccess(payout);
        } else if (status === 'FAILED') {
            await payoutService.handlePayoutFailure(payout, failReason || 'Transfer failed');
        }

        return { success: true, message: 'Transfer update processed' };
    }

    /**
     * Retry a webhook dispatch
     */
    async retryDispatch(webhookId: string): Promise<{ success: boolean; message?: string }> {
        try {
            const webhook = await WebhookLog.findById(webhookId).populate('userId');
            if (!webhook) {
                return { success: false, message: 'Webhook log not found' };
            }

            if (webhook.source !== 'vtpay') {
                return { success: false, message: 'Only VTPay (outbound) webhooks can be retried' };
            }

            const user = webhook.userId as any;
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
        } catch (error: any) {
            logger.error('Retry dispatch error', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Dispatch webhook to tenant
     */
    async dispatchWebhook(url: string, event: string, payload: any, logId?: string) {
        try {
            const axios = require('axios');
            const signature = crypto
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
                await WebhookLog.findByIdAndUpdate(logId, {
                    dispatchStatus: 'success',
                    lastAttemptAt: new Date()
                });
            }
        } catch (error: any) {
            logger.error(`Failed to dispatch webhook to ${url}`, error.message);
            if (logId) {
                await WebhookLog.findByIdAndUpdate(logId, {
                    dispatchStatus: 'failed',
                    lastAttemptAt: new Date(),
                    processingResult: { error: error.message }
                });
            }
        }
    }
}

export const webhookService = new WebhookService();
