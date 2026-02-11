import mongoose, { Schema, Document } from 'mongoose';

export interface IHelpMessageDocument extends Document {
    userId: mongoose.Types.ObjectId;
    subject: string;
    message: string;
    status: 'pending' | 'in_progress' | 'resolved';
    createdAt: Date;
    updatedAt: Date;
}

const HelpMessageSchema = new Schema<IHelpMessageDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'resolved'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
HelpMessageSchema.index({ userId: 1 });
HelpMessageSchema.index({ status: 1 });
HelpMessageSchema.index({ createdAt: -1 });

export const HelpMessage = mongoose.model<IHelpMessageDocument>('HelpMessage', HelpMessageSchema);
export default HelpMessage;
