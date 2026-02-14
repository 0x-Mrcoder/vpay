import mongoose, { Schema, Document } from 'mongoose';

export interface IJobLockDocument extends Document {
    jobName: string;
    isLocked: boolean;
    lastRunAt: Date;
    lockedAt?: Date;
    metadata?: Record<string, any>;
}

const JobLockSchema = new Schema<IJobLockDocument>(
    {
        jobName: {
            type: String,
            required: true,
            unique: true,
        },
        isLocked: {
            type: Boolean,
            default: false,
        },
        lastRunAt: {
            type: Date,
            default: Date.now,
        },
        lockedAt: {
            type: Date,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

export const JobLock = mongoose.model<IJobLockDocument>('JobLock', JobLockSchema);
export default JobLock;
