import mongoose, { Schema, Document } from 'mongoose';

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

const NotificationSchema = new Schema<INotificationDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: { 
            type: String, 
            enum: ['kyc', 'payout', 'system', 'payout_access'], 
            default: 'system' 
        },
        priority: { 
            type: String, 
            enum: ['low', 'medium', 'high'], 
            default: 'medium' 
        },
        isRead: { type: Boolean, default: false },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

export const Notification = mongoose.model<INotificationDocument>('Notification', NotificationSchema);
