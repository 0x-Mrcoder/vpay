import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: 'user' | 'admin';
    };
}
/**
 * JWT Authentication Middleware
 */
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Admin Authorization Middleware
 */
export declare const requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Generate JWT token
 */
export declare const generateToken: (userId: string, email: string) => string;
/**
 * Optional authentication - doesn't fail if no token
 */
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export default authenticate;
//# sourceMappingURL=auth.d.ts.map