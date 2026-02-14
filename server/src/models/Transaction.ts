import mongoose, { Schema, Document } from 'mongoose';

export interface ITransactionDocument extends Document {
    walletId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type: 'credit' | 'debit';
    category: 'deposit' | 'transfer' | 'withdrawal' | 'refund' | 'fee' | 'settlement';
    amount: number;
    fee: number;
    balanceBefore: number;
    balanceAfter: number;
    reference: string;
    customerReference?: string;
    externalRef?: string;
    narration: string;
    status: 'pending' | 'success' | 'failed';
    metadata?: Record<string, any>;
    isCleared: boolean;
    clearedAt?: Date;
    createdAt: Date;
}

const TransactionSchema = new Schema<ITransactionDocument>(
    {
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
        },
        category: {
            type: String,
            enum: ['deposit', 'transfer', 'withdrawal', 'refund', 'fee', 'settlement'],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        fee: {
            type: Number,
            default: 0,
            min: 0,
        },
        balanceBefore: {
            type: Number,
            required: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },
        reference: {
            type: String,
            required: true,
            unique: true,
        },
        customerReference: {
            type: String,
            index: true,
        },
        externalRef: {
            type: String,
        },
        narration: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['pending', 'success', 'failed'],
            default: 'pending',
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        isCleared: {
            type: Boolean,
            default: true, // Default to true for non-deposit transactions or legacy data
        },
        clearedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes (reference index is implicit from unique: true)
TransactionSchema.index({ walletId: 1 });
TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ externalRef: 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ status: 1, type: 1 });

export const Transaction = mongoose.model<ITransactionDocument>('Transaction', TransactionSchema);
export default Transaction;
