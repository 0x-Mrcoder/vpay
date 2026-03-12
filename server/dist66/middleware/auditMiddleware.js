"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = void 0;
const AuditService_1 = require("../services/AuditService");
const auditMiddleware = (actionName) => {
    return (req, res, next) => {
        const originalSend = res.send;
        let responseBody;
        res.send = function (body) {
            responseBody = body;
            return originalSend.apply(this, arguments);
        };
        res.on('finish', () => {
            // Only log state-changing methods or if explicitly named
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || actionName) {
                const actor = req.admin || req.user;
                if (actor) {
                    const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
                    // Determine action name if not provided
                    const derivedAction = actionName || `${req.method} ${req.baseUrl}${req.path}`;
                    AuditService_1.auditService.logAction({
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
exports.auditMiddleware = auditMiddleware;
//# sourceMappingURL=auditMiddleware.js.map