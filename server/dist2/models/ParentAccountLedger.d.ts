import mongoose, { Document } from 'mongoose';
export interface IParentAccountLedgerDocument extends Document {
    payoutId: mongoose.Types.ObjectId;
    amount: number;
    fee: number;
    totalDebit: number;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    transferId?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ParentAccountLedger: mongoose.Model<IParentAccountLedgerDocument, {}, {}, {}, mongoose.Document<unknown, {}, IParentAccountLedgerDocument, {}, {}> & IParentAccountLedgerDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default ParentAccountLedger;
//# sourceMappingURL=ParentAccountLedger.d.ts.map