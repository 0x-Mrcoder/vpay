"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.generateToken = exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const models_1 = require("../models");
/**
 * JWT Authentication Middleware
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'];
        // 1. Check for API Key first
        if (apiKey) {
            const user = await models_1.User.findOne({ apiKey });
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
            const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
            // Verify user still exists and is active
            const user = await models_1.User.findById(decoded.id);
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
        }
        catch (jwtError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
            return;
        }
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error',
        });
    }
};
exports.authenticate = authenticate;
/**
 * Admin Authorization Middleware
 */
const requireAdmin = async (req, res, next) => {
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
    }
    catch (error) {
        console.error('Admin authorization error:', error);
        res.status(500).json({
            success: false,
            message: 'Authorization error',
        });
    }
};
exports.requireAdmin = requireAdmin;
/**
 * Generate JWT token
 */
const generateToken = (userId, email) => {
    return jsonwebtoken_1.default.sign({ id: userId, email }, config_1.default.jwt.secret, { expiresIn: config_1.default.jwt.expiresIn });
};
exports.generateToken = generateToken;
/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
                // We need to fetch the user to get the role if we want consistency, 
                // but for optional auth maybe just id/email is enough or we fetch user if needed.
                // For now, let's keep it simple and just decode.
                // If role is needed in optional auth routes, we should fetch user.
                const user = await models_1.User.findById(decoded.id);
                if (user) {
                    req.user = {
                        id: decoded.id,
                        email: decoded.email,
                        role: user.role
                    };
                }
            }
            catch {
                // Token invalid, but continue without user
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
exports.default = exports.authenticate;
//# sourceMappingURL=auth.js.map