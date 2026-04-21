import mongoose, { Schema, Document } from 'mongoose';

export interface ILedgerDocument extends Document {
    walletId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    transactionId: mongoose.Types.ObjectId | string;
    reference: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    purpose: string;
    balanceBefore: number;
    balanceAfter: number;
    createdAt: Date;
    updatedAt: Date;
}

const LedgerSchema = new Schema<ILedgerDocument>(
    {
        walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        transactionId: { type: Schema.Types.Mixed, required: true },
        reference: { type: String, required: true },
        amount: { type: Number, required: true },
        type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
        purpose: { type: String, required: true },
        balanceBefore: { type: Number, required: true },
        balanceAfter: { type: Number, required: true },
    },
    { timestamps: true }
);

// Prevent updating
LedgerSchema.pre('save', function (next) {
    if (!this.isNew) {
        return next(new Error('Ledger entries are immutable and cannot be updated'));
    }
    next();
});

// Prevent deleting
LedgerSchema.pre('deleteOne', { document: true, query: false }, function(next) {
    next(new Error('Ledger entries cannot be deleted'));
});
LedgerSchema.pre('findOneAndDelete', function(next) {
    next(new Error('Ledger entries cannot be deleted'));
});

LedgerSchema.index({ userId: 1, createdAt: -1 });
LedgerSchema.index({ reference: 1 });

export const Ledger = mongoose.model<ILedgerDocument>('Ledger', LedgerSchema);
export default Ledger;
