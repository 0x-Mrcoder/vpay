import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookLogDocument extends Document {
    source: 'palmpay' | 'payrant' | 'vtpay';
    eventType: string;
    userId?: mongoose.Types.ObjectId;
    payload: any;
    signature: string;
    signatureValid: boolean;
    dispatchStatus?: 'pending' | 'success' | 'failed';
    dispatchAttempts?: number;
    responseStatus?: number;
    responseBody?: string;
    createdAt: Date;
    updatedAt: Date;
}

const WebhookLogSchema = new Schema<IWebhookLogDocument>(
    {
        source: {
            type: String,
            enum: ['palmpay', 'payrant', 'vtpay'],
            required: true,
        },
        eventType: {
            type: String,
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        payload: {
            type: Schema.Types.Mixed,
            required: true,
        },
        signature: {
            type: String,
            required: true,
        },
        signatureValid: {
            type: Boolean,
            required: true,
        },
        dispatchStatus: {
            type: String,
            enum: ['pending', 'success', 'failed'],
        },
        dispatchAttempts: {
            type: Number,
            default: 0,
        },
        responseStatus: {
            type: Number,
        },
        responseBody: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
WebhookLogSchema.index({ source: 1 });
WebhookLogSchema.index({ eventType: 1 });
WebhookLogSchema.index({ userId: 1 });
WebhookLogSchema.index({ createdAt: -1 });

export const WebhookLog = mongoose.model<IWebhookLogDocument>('WebhookLog', WebhookLogSchema);
export default WebhookLog;
