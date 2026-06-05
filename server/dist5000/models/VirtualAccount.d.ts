import mongoose, { Document } from 'mongoose';
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
export declare const VirtualAccount: mongoose.Model<IVirtualAccountDocument, {}, {}, {}, mongoose.Document<unknown, {}, IVirtualAccountDocument, {}, {}> & IVirtualAccountDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default VirtualAccount;
//# sourceMappingURL=VirtualAccount.d.ts.map