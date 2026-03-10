import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookLogDocument extends Document {
    source: 'palmpay' | 'payrant' | 'vtpay';
    eventType: string;
    userId?: mongoose.Types.ObjectId;
    orderNo?: string;           // For replay protection (unique per orderNo)
    payload: any;
    signature: string;
    signatureValid: boolean;
    processingResult?: string;  // Human-readable outcome
    dispatchStatus?: 'pending' | 'success' | 'failed';
    dispatchAttempts?: number;
    responseStatus?: number;
    responseBody?: string;
    receivedAt?: Date;          // Precise arrival time
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
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        orderNo: {
            type: String,
            sparse: true, // Allow multiple docs without orderNo, but enforce unique where set
        },
        payload: {
            type: Schema.Types.Mixed,
            required: true,
        },
        signature: {
            type: String,
        },
        signatureValid: {
            type: Boolean,
            required: true,
        },
        processingResult: {
            type: String,
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
        receivedAt: {
            type: Date,
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
WebhookLogSchema.index({ orderNo: 1 }, { unique: true, sparse: true }); // Replay protection

export const WebhookLog = mongoose.model<IWebhookLogDocument>('WebhookLog', WebhookLogSchema);
export default WebhookLog;
