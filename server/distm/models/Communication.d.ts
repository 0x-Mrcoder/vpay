import mongoose, { Document } from 'mongoose';
export interface ICommunication extends Document {
    recipientType: 'all' | 'active' | 'specific';
    recipientCount: number;
    selectedTenants?: string[];
    subject: string;
    message: string;
    sentBy: mongoose.Types.ObjectId;
    sentAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Communication: mongoose.Model<ICommunication, {}, {}, {}, mongoose.Document<unknown, {}, ICommunication, {}, {}> & ICommunication & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Communication.d.ts.map