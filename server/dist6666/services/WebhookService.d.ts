export declare class WebhookService {
    private webhookSecret;
    constructor();
    /**
     * Verify webhook signature using RSA.
     * Automatically URL-decodes the signature (PalmPay sends URL-encoded base64).
     * Tries RSA-SHA256 → RSA-SHA1 → RSA-SHA1(MD5(payload)).
     */
    verifySignature(payload: string, rawSignature: string): boolean;
    /**
     * Alternative: verify when signature is embedded in the body.
     * PalmPay V2 requires parameters sorted alphabetically, joined as key=value&…
     */
    verifyBodySignature(body: any, rawSignature: string): boolean;
    /**
     * Returns true if the webhook's createdTime is within the allowed window.
     * PalmPay sends createdTime as a Unix timestamp in milliseconds.
     */
    isTimestampValid(createdTime: number | string | undefined): boolean;
    /**
     * Checks if this orderNo has already been logged/processed.
     * Returns true if it's a duplicate.
     */
    isReplayWebhook(orderNo: string): Promise<boolean>;
    logWebhook(source: string, event: string, payload: any, signatureValid: boolean, orderNo?: string, processingResult?: string): Promise<any>;
    updateWebhookLog(logId: string, updateData: {
        dispatchStatus: string;
        userId?: string;
        processingResult?: string;
    }): Promise<void>;
    processWebhook(event: any): Promise<{
        success: boolean;
        message: string;
        userId?: string;
    }>;
    private handleDeposit;
    /**
     * Called by the reconciliation cron job every 5 minutes.
     * Finds deposits still stuck in "pending" status and queries PalmPay to
     * confirm whether they actually succeeded, then credits accordingly.
     */
    reconcileMissedDeposits(): Promise<void>;
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
    sendUserWebhook(userId: string, event: string, data: any): Promise<void>;
}
export declare const webhookService: WebhookService;
//# sourceMappingURL=WebhookService.d.ts.map