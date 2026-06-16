import mongoose, { Document } from 'mongoose';
export interface IWalletDocument extends Document {
    userId: mongoose.Types.ObjectId;
    balance: number;
    clearedBalance: number;
    lockedBalance: number;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Wallet: mongoose.Model<IWalletDocument, {}, {}, {}, mongoose.Document<unknown, {}, IWalletDocument, {}, {}> & IWalletDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Wallet;
//# sourceMappingURL=Wallet.d.ts.map