import mongoose, { Document, Schema } from 'mongoose';

export interface IDispute {
    settlementReference: string;
    reason: string;
    amount?: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
    adminNote?: string;
    resolvedBy?: string;
}

export interface IDisputeDocument extends IDispute, Document {
    createdAt: Date;
    updatedAt: Date;
}

const disputeSchema = new Schema(
    {
        settlementReference: { type: String, required: true },
        reason: { type: String, required: true },
        amount: { type: Number },
        priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
        status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], default: 'OPEN' },
        adminNote: { type: String },
        resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
    }
);

export const Dispute = mongoose.model<IDisputeDocument>('Dispute', disputeSchema);
