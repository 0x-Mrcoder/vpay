import crypto from 'crypto';
import { logger } from '../utils/logger';
import { VirtualAccount, WebhookLog, SystemSetting, Transaction } from '../models';
import { walletService } from './WalletService';
import config from '../config';

export class WebhookService {
    private webhookSecret: string;

    constructor() {
        this.webhookSecret = process.env.PALMPAY_WEBHOOK_SECRET || process.env.VTPAY_WEBHOOK_SECRET || 'default-webhook-secret';
        if (this.webhookSecret === 'default-webhook-secret') {
            logger.warn('Webhook secret not configured properly (using default)!');
        }
    }

    /**
     * Verify webhook signature using RSA
     * PalmPay sends signature in 'signature' header
     */
    verifySignature(payload: string, signature: string): boolean {
        if (!signature || !payload) {
            logger.error('Missing signature or payload for verification');
            return false;
        }

        try {
            const publicKey = config.palmpay.publicKey;
            if (!publicKey) {
                logger.error('PalmPay public key not configured for webhook verification');
                return false;
            }

            // Normalize public key format
            let formattedKey = publicKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
            if (!formattedKey.startsWith('-----BEGIN PUBLIC KEY-----')) {
                formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
            }

            // Verify RSA signature
            const verify = crypto.createVerify('RSA-SHA256'); // Or RSA-SHA1 depending on PalmPay version
            verify.update(payload);

            return verify.verify(formattedKey, signature, 'base64');
        } catch (error) {
            logger.error('Signature verification error', error);
            return false;
        }
    }

    /**
     * Alternative verification for when signature is in the body
     * Some providers sign the body payload excluding the signature field
     */
    verifyBodySignature(body: any, signature: string): boolean {
        try {
            // Clone and remove signature
            const cleanBody = { ...body };
            delete cleanBody.sign;
            delete cleanBody.signature;

            // Start with simplest assumption: JSON stringify cleanly
            // Note: This is brittle without exact ordering rules from provider
            const payload = JSON.stringify(cleanBody);

            return this.verifySignature(payload, signature);
        } catch (e) {
            return false;
        }
    }

    /**
     * Log webhook for debugging and audit
     */
    async logWebhook(source: string, event: string, payload: any, signatureValid: boolean, processingResult?: any): Promise<any> {
        try {
            return await WebhookLog.create({
                source,
                eventType: event,
                payload,
                signatureValid,
                processingResult,
                dispatchStatus: 'pending', // Default to pending
                receivedAt: new Date(),
            });
        } catch (error) {
            logger.error('Failed to log webhook', error);
            return null;
        }
    }

    /**
     * Update webhook log with processing result
     */
    async updateWebhookLog(logId: string, updateData: { dispatchStatus: string, userId?: string, processingResult?: any }): Promise<void> {
        try {
            await WebhookLog.findByIdAndUpdate(logId, updateData);
        } catch (error) {
            logger.error('Failed to update webhook log', error);
        }
    }

    /**
     * Process PalmPay webhook event
     */
    async processWebhook(event: any): Promise<{ success: boolean; message: string; userId?: string }> {
        try {
            // PalmPay V2 might send data directly or wrapped in 'event'
            // We inspect the structure
            let type = event.type || event.eventType || event.notifyType || 'UNKNOWN';

            // Handle array notifyType (e.g. ["vbas_virtual_bank_account"])
            if (Array.isArray(type)) {
                type = type[0];
            }

            const data = event.data || event;

            // Fallback: check nested type if root type is UNKNOWN
            if (type === 'UNKNOWN' && data !== event) {
                type = data.type || data.eventType || data.notifyType || 'UNKNOWN';
                if (Array.isArray(type)) type = type[0];
            }

            logger.info(`Processing PalmPay webhook event: ${type}`);
            logger.info('Full Event Data:', JSON.stringify(event));

            // Detect "Pay In" (Virtual Account Funding)
            // Common types: 'pay_in_order', 'PAY_IN_SUCCESS', 'virtual_account_transaction'
            // Also match direct payload with orderAmount
            if (type === 'pay_in_order' || type === 'PAY_IN_SUCCESS' || type === 'vbas_virtual_bank_account' || (data.orderNo && (data.amount || data.orderAmount))) {
                return await this.handleDeposit(data);
            }

            logger.warn(`Unknown or Unhandled webhook event type: ${type}`);
            return { success: true, message: 'Event ignored' };

        } catch (error: any) {
            logger.error('Webhook processing failed', error);
            return {
                success: false,
                message: error.message || 'Processing failed',
            };
        }
    }

    private async handleDeposit(data: any): Promise<{ success: boolean; message: string; userId?: string }> {
        logger.info('Handling Deposit Event:', data);

        // Extract fields (flexible matching for debugging)
        const orderNo = data.orderNo || data.paymentReference || data.transId;
        const amount = data.amount || data.transAmount || data.orderAmount; // Check limits (kobo vs naira)
        const status = data.status || data.transStatus || data.orderStatus;
        const payerName = data.payerName || data.customerName;
        const payerAccount = data.payerAccount || data.customerAccount || data.payerAccountNo;

        const payerBankName = data.payerBankName || data.bankName;

        // Try to find target Virtual Account
        let virtualAccountNo = data.virtualAccount || data.virtualAccountNo || data.accountNumber;
        let externalReference = data.externalReference || data.orderId;

        logger.info(`Extracted Data - OrderNo: ${orderNo}, Amount: ${amount}, Status: ${status}, VA: ${virtualAccountNo}`);

        // Normalize status check (PalmPay might send "SUCCESS", "00", or 1)
        const isSuccess = status === 'SUCCESS' || status === '00' || status === 1 || status === '1';

        if (!isSuccess) {
            logger.info(`Deposit ${orderNo} status is ${status}, ignoring.`);
            return { success: true, message: 'Ignored non-success deposit' };
        }

        const virtualAccount = await VirtualAccount.findOne({ accountNumber: virtualAccountNo });
        if (!virtualAccount) {
            logger.error(`Virtual Account not found: ${virtualAccountNo}`);
            return { success: false, message: 'Virtual Account not found' };
        }

        // Get System Settings for Fee
        const settings = await SystemSetting.findOne();
        const feePercent = settings?.deposit?.virtualAccountChargePercent || 1.0;

        // Calculate Fee and Net Amount
        const fee = (amount * feePercent) / 100;
        const netAmount = amount - fee;

        // Calculate Clearance Date (24 hours + 5 minutes)
        const clearanceDate = new Date();
        clearanceDate.setHours(clearanceDate.getHours() + 24);
        clearanceDate.setMinutes(clearanceDate.getMinutes() + 5);

        logger.info(`Deposit ${orderNo}: Amount=${amount}, Fee=${fee} (${feePercent}%), Net=${netAmount}, ClearedAt=${clearanceDate.toISOString()}`);

        // 0. Idempotency Check: Ensure we haven't processed this OrderNo before
        const existingTxn = await Transaction.findOne({ externalRef: orderNo });
        if (existingTxn) {
            logger.info(`Transaction with orderNo ${orderNo} already processed. Skipping.`);
            return { success: true, message: 'Already processed', userId: virtualAccount.userId.toString() };
        }

        // Credit Wallet
        try {
            const transaction = await walletService.creditWallet(
                virtualAccount.userId.toString(),
                netAmount, // Credit net amount
                'deposit',
                `Deposit from ${payerName || 'Unknown'} (${payerAccount || '****'})`, // Narration
                orderNo, // External Reference (OrderNo)
                {
                    source: 'palmpay',
                    externalReference, // Keep original external ref from payload in metadata too
                    payerName,
                    payerAccount,
                    payerBankName,
                    virtualAccount: virtualAccount.accountNumber, // Link transaction to VA
                    originalAmount: amount, // Store original amount in metadata
                    appliedFee: fee
                },
                undefined, // customerReference
                fee,
                false, // isCleared = false (Pending Settlement)
                clearanceDate // Custom clearance date
            );

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

            return { success: true, message: 'Deposit processed and user notified', userId: virtualAccount.userId.toString() };
        } catch (error: any) {
            logger.error(`Failed to credit wallet: ${error.message}`);
            // If duplicate, it's fine
            if (error.message.includes('duplicate') || error.message.includes('already processed')) {
                return { success: true, message: 'Already processed', userId: virtualAccount.userId.toString() };
            }
            throw error; // Retry for actual errors
        }
    }

    // Removed Payout logic for now to focus on PayIn logic
    private async handleTransferUpdate(data: any) {
        return { success: true, message: 'Not implemented' };
    }

    /**
     * Send webhook notification to user
     */
    async sendUserWebhook(userId: string, event: string, data: any): Promise<void> {
        try {
            const { User } = await import('../models'); // Dynamic import
            const user = await User.findById(userId);

            if (!user || !user.webhookUrl) {
                return;
            }

            logger.info(`Sending ${event} webhook to user ${userId} at ${user.webhookUrl}`);

            const payload = {
                event,
                data,
                timestamp: new Date().toISOString(),
            };

            // Sign the payload using our App Secret (User's API Key or a shared secret)
            // For now, using the user's API Key if available, or just a system signature
            const signature = crypto
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

            logger.info(`Webhook sent successfully to ${user.webhookUrl}`);
        } catch (error: any) {
            logger.error(`Failed to send user webhook: ${error.message}`);
            // Don't throw, just log. We don't want to fail the transaction processing
        }
    }
}

export const webhookService = new WebhookService();
