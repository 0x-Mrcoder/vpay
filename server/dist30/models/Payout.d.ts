import mongoose, { Document } from 'mongoose';
export interface IPayoutDocument extends Document {
    userId: mongoose.Types.ObjectId;
    amount: number;
    fee: number;
    payrantFee: number;
    totalDebit: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    payoutType: 'internal' | 'external';
    reference: string;
    externalRef?: string;
    idempotencyKey?: string;
    status: 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'MANUAL_REVIEW';
    failureReason?: string;
    retryCount: number;
    lastReconciledAt?: Date;
    notifyUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}
export declare const Payout: mongoose.Model<IPayoutDocument, {}, {}, {}, mongoose.Document<unknown, {}, IPayoutDocument, {}, {}> & IPayoutDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Payout;
//# sourceMappingURL=Payout.d.ts.map