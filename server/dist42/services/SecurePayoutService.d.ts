import mongoose from 'mongoose';
import { Queue, Worker } from 'bullmq';
export declare const payoutQueue: Queue<any, any, string, any, any, string>;
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
}
export declare const securePayoutService: SecurePayoutService;
export declare const payoutWorker: Worker<any, any, string>;
//# sourceMappingURL=SecurePayoutService.d.ts.map