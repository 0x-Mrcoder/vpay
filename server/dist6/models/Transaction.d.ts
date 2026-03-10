import mongoose, { Document } from 'mongoose';
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
export declare const Transaction: mongoose.Model<ITransactionDocument, {}, {}, {}, mongoose.Document<unknown, {}, ITransactionDocument, {}, {}> & ITransactionDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Transaction;
//# sourceMappingURL=Transaction.d.ts.map