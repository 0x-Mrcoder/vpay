import mongoose, { Schema, Document } from 'mongoose';

export interface IPayoutDocument extends Document {
    userId: mongoose.Types.ObjectId;
    amount: number; // Requested amount
    fee: number; // VTPay fee
    payrantFee: number; // Payrant fee
    totalDebit: number; // amount + fee + payrantFee
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


const PayoutSchema = new Schema<IPayoutDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        fee: {
            type: Number,
            default: 0,
        },
        payrantFee: {
            type: Number,
            default: 0,
        },
        totalDebit: {
            type: Number,
            required: true,
            min: 0,
        },
        bankCode: {
            type: String,
            required: true,
        },
        accountNumber: {
            type: String,
            required: true,
        },
        accountName: {
            type: String,
            required: true,
        },
        payoutType: {
            type: String,
            enum: ['internal', 'external'],
            required: true,
        },
        reference: {
            type: String,
            required: true,
            unique: true,
        },
        externalRef: {
            type: String,
            index: true,
        },
        idempotencyKey: {
            type: String,
            index: true,
        },
        notifyUrl: {
            type: String,
        },
        status: {
            type: String,
            enum: ['INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW'],
            default: 'INITIATED',
            index: true,
        },
        retryCount: {
            type: Number,
            default: 0,
        },
        lastReconciledAt: {
            type: Date,
        },
        failureReason: {
            type: String,
        },
        completedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
PayoutSchema.index({ userId: 1 });
PayoutSchema.index({ createdAt: -1 });

export const Payout = mongoose.model<IPayoutDocument>('Payout', PayoutSchema);
export default Payout;
