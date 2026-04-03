interface LogActionParams {
    action: string;
    actorId?: string;
    actorType?: 'admin' | 'user' | 'system';
    targetId?: string;
    targetType?: string;
    targetName?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failure';
}
export declare const auditService: {
    /**
     * Log an action to the database
     */
    logAction: (params: LogActionParams) => Promise<(import("mongoose").Document<unknown, {}, import("../models/AuditLog").IAuditLogDocument, {}, {}> & import("../models/AuditLog").IAuditLogDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    /**
     * Get recent audit logs with filters
     */
    getLogs: (filters?: any, page?: number, limit?: number) => Promise<{
        logs: (import("mongoose").Document<unknown, {}, import("../models/AuditLog").IAuditLogDocument, {}, {}> & import("../models/AuditLog").IAuditLogDocument & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
};
export {};
//# sourceMappingURL=AuditService.d.ts.map