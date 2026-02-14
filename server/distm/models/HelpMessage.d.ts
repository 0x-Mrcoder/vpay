import mongoose, { Document } from 'mongoose';
export interface IHelpMessageDocument extends Document {
    userId: mongoose.Types.ObjectId;
    subject: string;
    message: string;
    status: 'pending' | 'in_progress' | 'resolved';
    createdAt: Date;
    updatedAt: Date;
}
export declare const HelpMessage: mongoose.Model<IHelpMessageDocument, {}, {}, {}, mongoose.Document<unknown, {}, IHelpMessageDocument, {}, {}> & IHelpMessageDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default HelpMessage;
//# sourceMappingURL=HelpMessage.d.ts.map