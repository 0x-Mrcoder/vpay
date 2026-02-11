import { AuditLog, IAuditLog } from '../models/AuditLog';
import { User } from '../models/User';

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

export const auditService = {
    /**
     * Log an action to the database
     */
    logAction: async (params: LogActionParams) => {
        try {
            let actorName = 'System';
            let actorEmail = 'system@vtpay.com';

            if (params.actorId && params.actorType !== 'system') {
                const user = await User.findById(params.actorId).select('firstName lastName email');
                if (user) {
                    actorName = `${user.firstName} ${user.lastName}`;
                    actorEmail = user.email;
                }
            }

            const log = await AuditLog.create({
                action: params.action,
                actor: {
                    userId: params.actorId,
                    type: params.actorType || 'system',
                    name: actorName,
                    email: actorEmail
                },
                target: params.targetId ? {
                    entityId: params.targetId,
                    type: params.targetType || 'unknown',
                    name: params.targetName
                } : undefined,
                details: params.details,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                status: params.status || 'success'
            });

            return log;
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Non-blocking: don't throw error to avoid disrupting main flow
            return null;
        }
    },

    /**
     * Get recent audit logs with filters
     */
    getLogs: async (filters: any = {}, page = 1, limit = 50) => {
        const query: any = {};

        if (filters.action) {
            query.action = { $regex: filters.action, $options: 'i' };
        }
        if (filters.actorEmail) {
            query['actor.email'] = { $regex: filters.actorEmail, $options: 'i' };
        }
        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            AuditLog.countDocuments(query)
        ]);

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
};
