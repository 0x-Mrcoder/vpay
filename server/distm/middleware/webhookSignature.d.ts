import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to verify PalmPay webhook signature
 * This will be updated in Phase 2 with PalmPay signature verification logic
 */
export declare const verifyWebhookSignature: (req: Request, res: Response, next: NextFunction) => void;
export default verifyWebhookSignature;
//# sourceMappingURL=webhookSignature.d.ts.map