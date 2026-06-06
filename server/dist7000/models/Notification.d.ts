import mongoose, { Document } from 'mongoose';
export interface INotificationDocument extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: 'kyc' | 'payout' | 'system' | 'payout_access';
    priority: 'low' | 'medium' | 'high';
    isRead: boolean;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Notification: mongoose.Model<INotificationDocument, {}, {}, {}, mongoose.Document<unknown, {}, INotificationDocument, {}, {}> & INotificationDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Notification.d.ts.map