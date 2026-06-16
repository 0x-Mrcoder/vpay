export declare class AdminNotificationService {
    /**
     * Create a notification for admins
     */
    static notify(data: {
        userId: any;
        title: string;
        message: string;
        type: 'kyc' | 'payout' | 'system' | 'payout_access';
        priority?: 'low' | 'medium' | 'high';
        metadata?: any;
    }): Promise<(import("mongoose").Document<unknown, {}, import("../models").INotificationDocument, {}, {}> & import("../models").INotificationDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    /**
     * Notify about KYC Submission
     */
    static notifyKycSubmission(user: any, level: number): Promise<(import("mongoose").Document<unknown, {}, import("../models").INotificationDocument, {}, {}> & import("../models").INotificationDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    /**
     * Notify about Payout Access Request
     */
    static notifyPayoutAccessRequest(user: any): Promise<(import("mongoose").Document<unknown, {}, import("../models").INotificationDocument, {}, {}> & import("../models").INotificationDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    /**
     * Notify about New Payout
     */
    static notifyNewPayout(user: any, amount: number): Promise<(import("mongoose").Document<unknown, {}, import("../models").INotificationDocument, {}, {}> & import("../models").INotificationDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
}
//# sourceMappingURL=AdminNotificationService.d.ts.map