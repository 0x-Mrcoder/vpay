import mongoose, { Document } from 'mongoose';
export interface IRiskRuleDocument extends Document {
    name: string;
    type: 'velocity' | 'amount_limit' | 'blacklist' | 'whitelist' | 'geo_block';
    condition: string;
    action: 'block' | 'flag' | 'review';
    priority: number;
    status: 'active' | 'inactive';
    hits: number;
    lastTriggered?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const RiskRule: mongoose.Model<IRiskRuleDocument, {}, {}, {}, mongoose.Document<unknown, {}, IRiskRuleDocument, {}, {}> & IRiskRuleDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default RiskRule;
//# sourceMappingURL=RiskRule.d.ts.map