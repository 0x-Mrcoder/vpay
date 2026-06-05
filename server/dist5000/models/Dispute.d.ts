import mongoose, { Document } from 'mongoose';
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
export declare const Dispute: mongoose.Model<IDisputeDocument, {}, {}, {}, mongoose.Document<unknown, {}, IDisputeDocument, {}, {}> & IDisputeDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Dispute.d.ts.map