import mongoose, { Document } from 'mongoose';
export interface IJobLockDocument extends Document {
    jobName: string;
    isLocked: boolean;
    lastRunAt: Date;
    lockedAt?: Date;
    metadata?: Record<string, any>;
}
export declare const JobLock: mongoose.Model<IJobLockDocument, {}, {}, {}, mongoose.Document<unknown, {}, IJobLockDocument, {}, {}> & IJobLockDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default JobLock;
//# sourceMappingURL=JobLock.d.ts.map