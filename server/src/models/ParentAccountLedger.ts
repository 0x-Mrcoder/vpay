import mongoose, { Schema, Document } from 'mongoose';

export interface IParentAccountLedgerDocument extends Document {
    payoutId: mongoose.Types.ObjectId;
    amount: number;
    fee: number;
    totalDebit: number;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    transferId?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ParentAccountLedgerSchema = new Schema<IParentAccountLedgerDocument>(
    {
        payoutId: {
            type: Schema.Types.ObjectId,
            ref: 'Payout',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        fee: {
            type: Number,
            default: 0,
        },
        totalDebit: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['PENDING', 'SUCCESS', 'FAILED'],
            default: 'PENDING',
        },
        transferId: {
            type: String,
        },
        description: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

export const ParentAccountLedger = mongoose.model<IParentAccountLedgerDocument>('ParentAccountLedger', ParentAccountLedgerSchema);
export default ParentAccountLedger;
