import mongoose, { Document } from 'mongoose';
export interface IAuditLog {
    action: string;
    actor: {
        userId: mongoose.Types.ObjectId;
        type: 'admin' | 'user' | 'system';
        name: string;
        email: string;
    };
    target?: {
        entityId: string;
        type: string;
        name?: string;
    };
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
    createdAt: Date;
}
export interface IAuditLogDocument extends IAuditLog, Document {
    createdAt: Date;
}
export declare const AuditLog: mongoose.Model<IAuditLogDocument, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLogDocument, {}, {}> & IAuditLogDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=AuditLog.d.ts.map