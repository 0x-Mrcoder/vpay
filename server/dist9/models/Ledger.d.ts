import mongoose, { Document } from 'mongoose';
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
export declare const Ledger: mongoose.Model<ILedgerDocument, {}, {}, {}, mongoose.Document<unknown, {}, ILedgerDocument, {}, {}> & ILedgerDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Ledger;
//# sourceMappingURL=Ledger.d.ts.map