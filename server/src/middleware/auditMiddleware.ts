import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/AuditService';

interface AuthenticatedRequest extends Request {
    user?: any;
    admin?: any;
}

export const auditMiddleware = (actionName?: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const originalSend = res.send;
        let responseBody: any;

        res.send = function (body) {
            responseBody = body;
            return originalSend.apply(this, arguments as any);
        };

        res.on('finish', () => {
            // Only log state-changing methods or if explicitly named
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || actionName) {
                const actor = req.admin || req.user;

                if (actor) {
                    const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';

                    // Determine action name if not provided
                    const derivedAction = actionName || `${req.method} ${req.baseUrl}${req.path}`;



                    auditService.logAction({
                        action: derivedAction,
                        actorId: actor._id,
                        actorType: req.admin ? 'admin' : 'user',
                        targetId: req.params.id,
                        targetType: req.params.id ? 'resource' : undefined,
                        targetName: req.params.id,
                        details: {
                            method: req.method,
                            url: req.originalUrl,
                            body: req.body,
                            query: req.query,
                            statusCode: res.statusCode,
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        status
                    }).catch(err => console.error('Audit logging failed:', err));
                }
            }
        });

        next();
    };
};
