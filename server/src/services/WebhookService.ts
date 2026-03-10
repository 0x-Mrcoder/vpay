import crypto from 'crypto';
import { logger } from '../utils/logger';
import { VirtualAccount, WebhookLog, SystemSetting, Transaction, User } from '../models';
import { walletService } from './WalletService';
import { emailService } from './EmailService';
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

            // Try RSA-SHA256 first
            const verify256 = crypto.createVerify('RSA-SHA256');
            verify256.update(payload);
            const isValid256 = verify256.verify(formattedKey, signature, 'base64');

            if (isValid256) {
                logger.info('Signature verified successfully using RSA-SHA256');
                return true;
            }

            // 2. Try RSA-SHA1 as fallback
            const verify1 = crypto.createVerify('RSA-SHA1');
            verify1.update(payload);
            const isValid1 = verify1.verify(formattedKey, signature, 'base64');

            if (isValid1) {
                logger.info('Signature verified successfully using RSA-SHA1');
                return true;
            }

            // 3. Try PalmPay V2 style: RSA-SHA1(MD5(payload).toUpperCase())
            // (Based on PalmPayService.generateSignatureV2 implementation)
            const md5Hash = crypto.createHash('md5').update(payload).digest('hex').toUpperCase();
            const verifyMD5_1 = crypto.createVerify('RSA-SHA1');
            verifyMD5_1.update(md5Hash);
            const isValidMD5_1 = verifyMD5_1.verify(formattedKey, signature, 'base64');

            if (isValidMD5_1) {
                logger.info('Signature verified successfully using RSA-SHA1 with MD5 hashed payload');
                return true;
            }

            logger.error('Signature verification failed with RSA-SHA256, RSA-SHA1, and RSA-MD5-SHA1');
            return false;
        } catch (error) {
            logger.error('Signature verification error', error);
            return false;
        }
    }

    /**
     * Alternative verification for when signature is in the body
     * PalmPay V2 webhooks require parameters to be sorted alphabetically
     */
    verifyBodySignature(body: any, signature: string): boolean {
        try {
            // 1. Decode signature if it's URL encoded
            let decodedSignature = signature;
            if (signature.includes('%')) {
                decodedSignature = decodeURIComponent(signature);
            }

            // 2. Filter and Sort parameters alphabetically
            const filteredParams: Record<string, any> = {};
            const keys = Object.keys(body).sort();

            for (const key of keys) {
                // Skip signature fields and empty/null/undefined values
                if (
                    key !== 'sign' &&
                    key !== 'signature' &&
                    body[key] !== undefined &&
                    body[key] !== null &&
                    body[key] !== '' &&
                    typeof body[key] !== 'object'
                ) {
                    filteredParams[key] = body[key];
                }
            }

            // 3. Construct the payload string: key=value&key=value
            const payload = Object.keys(filteredParams)
                .map(key => `${key}=${filteredParams[key]}`)
                .join('&');

            logger.info(`Constructed Signature Payload: ${payload}`);

            // 4. Verify using RSA
            return this.verifySignature(payload, decodedSignature);
        } catch (e) {
            logger.error('Error in verifyBodySignature', e);
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
            let type = event.type || event.eventType || event.notifyType || 'UNKNOWN';

            if (Array.isArray(type)) {
                type = type[0];
            }

            const data = event.data || event;

            // Detection for PalmPay V2 without explicit type field
            if (type === 'UNKNOWN') {
                if (data.orderNo && (data.amount || data.orderAmount)) {
                    type = 'pay_in_order';
                }
            }

            logger.info(`Processing PalmPay webhook event: ${type}`);

            // Handle Deposit
            if (type === 'pay_in_order' || type === 'PAY_IN_SUCCESS' || type === 'vbas_virtual_bank_account') {
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
        const amount = Number(data.amount || data.transAmount || data.orderAmount);
        const status = data.status || data.transStatus || data.orderStatus;
        const payerName = data.payerName || data.customerName || data.payerAccountName;
        const payerAccount = data.payerAccount || data.customerAccount || data.payerAccountNo;

        const payerBankName = data.payerBankName || data.bankName;

        // Try to find target Virtual Account
        let virtualAccountNo = data.virtualAccount || data.virtualAccountNo || data.accountNumber;
        let externalReference = data.externalReference || data.orderId || data.paymentReference;

        logger.info(`Extracted Data - OrderNo: ${orderNo}, Amount: ${amount}, Status: ${status}, VA: ${virtualAccountNo}`);

        // Normalize status check (00 and 1 are success in some V2 versions)
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
            const user = await User.findById(userId);

            if (!user) return;

            if (!user.webhookUrl) {
                logger.debug(`User ${userId} does not have a webhook URL configured. Skipping webhook for ${event}.`);
                return;
            }

            if (!user.webhookActive) {
                logger.debug(`User ${userId} has webhook notifications disabled. Skipping webhook for ${event}.`);
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
            try {
                await axios.post(user.webhookUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-VTStack-Signature': signature,
                    },
                    timeout: 10000,
                });
                logger.info(`Webhook sent successfully to ${user.webhookUrl}`);
            } catch (webhookError: any) {
                logger.error(`Failed to send user webhook to ${user.webhookUrl}: ${webhookError.message}`);
                
                // Notify user about webhook failure
                const companyName = (await SystemSetting.findOne())?.general?.companyName || 'VTStack';
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

                        <p>Please check your server completely or update your webhook URL in the ${companyName} dashboard.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </div>
                `;
                
                await emailService.sendEmail(user.email, 'Action Required: Webhook Delivery Failed', emailHtml);
            }
        } catch (error: any) {
            logger.error(`Critical error in sendUserWebhook: ${error.message}`);
        }
    }
}

export const webhookService = new WebhookService();
