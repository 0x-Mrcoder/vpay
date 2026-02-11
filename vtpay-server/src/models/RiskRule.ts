import mongoose, { Schema, Document } from 'mongoose';

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

const RiskRuleSchema = new Schema<IRiskRuleDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['velocity', 'amount_limit', 'blacklist', 'whitelist', 'geo_block'],
            required: true,
        },
        condition: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            enum: ['block', 'flag', 'review'],
            required: true,
        },
        priority: {
            type: Number,
            default: 1,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        hits: {
            type: Number,
            default: 0,
        },
        lastTriggered: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

export const RiskRule = mongoose.model<IRiskRuleDocument>('RiskRule', RiskRuleSchema);
export default RiskRule;
