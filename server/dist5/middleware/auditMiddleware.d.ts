import { Request, Response, NextFunction } from 'express';
interface AuthenticatedRequest extends Request {
    user?: any;
    admin?: any;
}
export declare const auditMiddleware: (actionName?: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=auditMiddleware.d.ts.map