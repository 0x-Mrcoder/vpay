import mongoose, { Document } from 'mongoose';
export interface ISettlementDispute extends Document {
    settlementReference: string;
    zainboxCode?: string;
    amount?: number;
    reason: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
    adminNote?: string;
    resolvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SettlementDispute: mongoose.Model<any, {}, {}, {}, any, any>;
export default SettlementDispute;
//# sourceMappingURL=SettlementDispute.d.ts.map