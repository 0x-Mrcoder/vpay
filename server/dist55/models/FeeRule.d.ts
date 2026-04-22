import mongoose, { Document } from 'mongoose';
export interface IFeeRuleDocument extends Document {
    name: string;
    type: 'flat' | 'percentage' | 'tiered';
    value: number;
    currency: string;
    minAmount?: number;
    maxAmount?: number;
    cap?: number;
    category: 'deposit' | 'transfer' | 'withdrawal' | 'utility';
    paymentMethod?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
export declare const FeeRule: mongoose.Model<IFeeRuleDocument, {}, {}, {}, mongoose.Document<unknown, {}, IFeeRuleDocument, {}, {}> & IFeeRuleDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default FeeRule;
//# sourceMappingURL=FeeRule.d.ts.map