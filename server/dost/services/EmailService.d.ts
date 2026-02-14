declare class EmailService {
    private getTransporter;
    /**
     * Send a single email
     */
    sendEmail(to: string, subject: string, html: string): Promise<void>;
    /**
     * Send bulk emails
     */
    sendBulkEmail(emails: string[], subject: string, message: string): Promise<void>;
    /**
     * Send verification OTP
     */
    sendOtpEmail(email: string, otp: string): Promise<void>;
    /**
     * Send verification email (Legacy)
     */
    sendVerificationEmail(email: string, token: string): Promise<void>;
    /**
     * Send account approval email
     */
    sendApprovalEmail(email: string, name: string): Promise<void>;
    /**
     * Send transaction notification email
     */
    sendTransactionNotification(email: string, name: string, transaction: any): Promise<void>;
    /**
     * Send payout success notification email
     */
    sendPayoutSuccessEmail(email: string, name: string, payout: any): Promise<void>;
    /**
     * Send webhook failure notification email
     */
    sendWebhookFailureNotification(email: string, name: string, webhookUrl: string, error: string): Promise<void>;
}
export declare const emailService: EmailService;
export default EmailService;
//# sourceMappingURL=EmailService.d.ts.map