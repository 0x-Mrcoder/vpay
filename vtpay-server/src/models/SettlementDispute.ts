import mongoose, { Schema, Document } from 'mongoose';

export interface ISettlementDispute extends Document {
    settlementReference: string; // Link to settlement if exists, or manual ref
    zainboxCode?: string; // If linked to a zainbox
    amount?: number;
    reason: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
    adminNote?: string;
    resolvedBy?: string; // Admin ID
    createdAt: Date;
    updatedAt: Date;
}

const SettlementDisputeSchema = new Schema<ISettlementDispute>(
    {
        settlementReference: { type: String, required: true },
        zainboxCode: { type: String },
        amount: { type: Number },
        reason: { type: String, required: true },
        priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
        status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], default: 'OPEN' },
        adminNote: { type: String },
        resolvedBy: { type: String },
    },
    {
        timestamps: true,
    }
);

export const SettlementDispute = mongoose.models.SettlementDispute || mongoose.model<ISettlementDispute>('SettlementDispute', SettlementDisputeSchema);
export default SettlementDispute;
