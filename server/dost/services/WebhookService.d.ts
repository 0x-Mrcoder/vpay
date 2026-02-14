export declare class WebhookService {
    private webhookSecret;
    constructor();
    /**
     * Verify webhook signature using HMAC-SHA256
     * PalmPay sends signature in 'x-palm-signature' header (or similar, depending on docs)
     * For now assuming standard HMAC-SHA256 of raw body
     */
    verifySignature(payload: string, signature: string): boolean;
    /**
     * Log webhook for debugging and audit
     */
    logWebhook(source: string, event: string, payload: any, signatureValid: boolean, processingResult?: any): Promise<void>;
    /**
     * Placeholder for PalmPay webhook processing
     * This will be implemented in Phase 2
     */
    /**
     * Process PalmPay webhook event
     */
    processWebhook(event: any): Promise<{
        success: boolean;
        message: string;
    }>;
    private handleDeposit;
    private handleTransferUpdate;
    /**
     * Retry a webhook dispatch
     */
    retryDispatch(webhookId: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    /**
     * Dispatch webhook to tenant
     */
    dispatchWebhook(url: string, event: string, payload: any, logId?: string): Promise<void>;
}
export declare const webhookService: WebhookService;
//# sourceMappingURL=WebhookService.d.ts.map