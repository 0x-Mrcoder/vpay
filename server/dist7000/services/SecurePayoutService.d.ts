import mongoose from 'mongoose';
import { Queue, Worker } from 'bullmq';
declare let payoutQueue: Queue | null;
declare let payoutWorker: Worker | null;
export { payoutQueue, payoutWorker };
export declare class SecurePayoutService {
    /**
     * POST /payouts/request logic
     */
    requestPayout(userId: string, idempotencyKey: string, payload: {
        amount: number;
        bankCode: string;
        accountNumber: string;
        accountName: string;
        narration?: string;
    }): Promise<{
        status: string;
        payout: mongoose.Document<unknown, {}, import("../models").IPayoutDocument, {}, {}> & import("../models").IPayoutDocument & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        message?: undefined;
        payoutId?: undefined;
    } | {
        status: string;
        message: string;
        payoutId: string;
        payout?: undefined;
    }>;
    /**
     * Direct payout processing fallback (when Redis/BullMQ is unavailable)
     */
    processPayoutDirectly(payoutId: string): Promise<void>;
}
export declare const securePayoutService: SecurePayoutService;
//# sourceMappingURL=SecurePayoutService.d.ts.map