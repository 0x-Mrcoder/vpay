import mongoose, { Schema, Document } from 'mongoose';

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

const CommunicationSchema: Schema = new Schema(
    {
        recipientType: {
            type: String,
            enum: ['all', 'active', 'specific'],
            required: true,
        },
        recipientCount: {
            type: Number,
            required: true,
            default: 0,
        },
        selectedTenants: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        subject: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        sentBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

export const Communication = mongoose.model<ICommunication>('Communication', CommunicationSchema);
