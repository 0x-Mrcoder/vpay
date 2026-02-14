import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { User } from '../models';

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
export const authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'] as string;

        // 1. Check for API Key first
        if (apiKey) {
            const user = await User.findOne({ apiKey });
            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid API Key',
                });
                return;
            }

            if (user.status !== 'active') {
                res.status(403).json({
                    success: false,
                    message: 'Account is not active',
                });
                return;
            }

            req.user = {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
            };
            next();
            return;
        }

        // 2. Check for Bearer Token
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'No token or API key provided',
            });
            return;
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string };

            // Verify user still exists and is active
            const user = await User.findById(decoded.id);
            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }

            if (user.status !== 'active') {
                res.status(403).json({
                    success: false,
                    message: 'Account is not active',
                });
                return;
            }

            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: user.role,
            };

            next();
        } catch (jwtError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
            return;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error',
        });
    }
};

/**
 * Admin Authorization Middleware
 */
export const requireAdmin = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        if (req.user.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Admin access required',
            });
            return;
        }

        next();
    } catch (error) {
        console.error('Admin authorization error:', error);
        res.status(500).json({
            success: false,
            message: 'Authorization error',
        });
    }
};

/**
 * Generate JWT token
 */
export const generateToken = (userId: string, email: string): string => {
    return jwt.sign(
        { id: userId, email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as any }
    );
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            try {
                const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string };
                // We need to fetch the user to get the role if we want consistency, 
                // but for optional auth maybe just id/email is enough or we fetch user if needed.
                // For now, let's keep it simple and just decode.
                // If role is needed in optional auth routes, we should fetch user.

                const user = await User.findById(decoded.id);
                if (user) {
                    req.user = {
                        id: decoded.id,
                        email: decoded.email,
                        role: user.role
                    };
                }

            } catch {
                // Token invalid, but continue without user
            }
        }

        next();
    } catch (error) {
        next();
    }
};

export default authenticate;
