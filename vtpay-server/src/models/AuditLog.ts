import mongoose, { Schema, Document } from 'mongoose';

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

const AuditLogSchema = new Schema({
    action: { type: String, required: true, index: true },
    actor: {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
        type: { type: String, enum: ['admin', 'user', 'system'], default: 'system' },
        name: { type: String },
        email: { type: String }
    },
    target: {
        entityId: { type: String },
        type: { type: String },
        name: { type: String }
    },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

// Index for efficient querying
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ 'actor.email': 1 }); // Search by actor
AuditLogSchema.index({ action: 1 }); // Filter by action

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
