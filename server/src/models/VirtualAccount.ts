import mongoose, { Schema, Document } from 'mongoose';

export interface IVirtualAccountDocument extends Document {
    userId: mongoose.Types.ObjectId;
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankType: string;
    email: string;
    alias?: string;
    reference?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
}

const VirtualAccountSchema = new Schema<IVirtualAccountDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        accountNumber: {
            type: String,
            required: true,
            unique: true,
        },
        accountName: {
            type: String,
            required: true,
        },
        bankName: {
            type: String,
            required: true,
        },
        bankType: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        alias: {
            type: String,
            required: false,
        },
        reference: {
            type: String,
            required: false,
            index: true,
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

// Indexes (accountNumber index is implicit from unique: true)
VirtualAccountSchema.index({ userId: 1 });

export const VirtualAccount = mongoose.model<IVirtualAccountDocument>('VirtualAccount', VirtualAccountSchema);
export default VirtualAccount;
