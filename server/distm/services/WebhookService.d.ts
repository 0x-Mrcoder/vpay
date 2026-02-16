export declare class WebhookService {
    private webhookSecret;
    constructor();
    /**
     * Verify webhook signature using RSA
     * PalmPay sends signature in 'signature' header
     */
    verifySignature(payload: string, signature: string): boolean;
    /**
     * Alternative verification for when signature is in the body
     * Some providers sign the body payload excluding the signature field
     */
    verifyBodySignature(body: any, signature: string): boolean;
    /**
     * Log webhook for debugging and audit
     */
    logWebhook(source: string, event: string, payload: any, signatureValid: boolean, processingResult?: any): Promise<any>;
    /**
     * Update webhook log with processing result
     */
    updateWebhookLog(logId: string, updateData: {
        dispatchStatus: string;
        userId?: string;
        processingResult?: any;
    }): Promise<void>;
    /**
     * Process PalmPay webhook event
     */
    processWebhook(event: any): Promise<{
        success: boolean;
        message: string;
        userId?: string;
    }>;
    private handleDeposit;
    private handleTransferUpdate;
    /**
     * Send webhook notification to user
     */
    sendUserWebhook(userId: string, event: string, data: any): Promise<void>;
}
export declare const webhookService: WebhookService;
//# sourceMappingURL=WebhookService.d.ts.map