import mongoose, { Schema, Document } from 'mongoose';

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

const FeeRuleSchema = new Schema<IFeeRuleDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['flat', 'percentage', 'tiered'],
            required: true,
        },
        value: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: 'NGN',
        },
        minAmount: {
            type: Number,
        },
        maxAmount: {
            type: Number,
        },
        cap: {
            type: Number,
        },
        category: {
            type: String,
            enum: ['deposit', 'transfer', 'withdrawal', 'utility'],
            required: true,
        },
        paymentMethod: {
            type: String,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

export const FeeRule = mongoose.model<IFeeRuleDocument>('FeeRule', FeeRuleSchema);
export default FeeRule;
