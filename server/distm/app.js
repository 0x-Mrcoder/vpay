"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
// import rateLimit from 'express-rate-limit';
const routes_1 = require("./routes");
const config_1 = __importDefault(require("./config"));
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-palm-signature'],
}));
// Rate limiting removed as per user request
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // Limit each IP to 100 requests per windowMs
//     message: {
//         success: false,
//         message: 'Too many requests, please try again later',
//     },
// });
// Apply rate limiting to all requests except webhooks
// app.use('/api', (req: Request, res: Response, next: NextFunction) => {
//     if (req.path.startsWith('/webhooks')) {
//         return next();
//     }
//     return limiter(req, res, next);
// });
// Body parsing middleware
app.use(express_1.default.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.logger.info(`${req.method} ${req.path}`, { statusCode: res.statusCode, duration: `${duration}ms` });
    });
    next();
});
// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'VTStack API Server is running',
        version: '1.0.0'
    });
});
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'VTStack Server is running',
        environment: config_1.default.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});
// API Routes
app.use('/api/auth', routes_1.authRoutes);
app.use('/api/virtual-accounts', routes_1.virtualAccountRoutes);
app.use('/api/wallet', routes_1.walletRoutes);
app.use('/api/transactions', routes_1.transactionRoutes);
app.use('/api/banks', routes_1.bankRoutes);
app.use('/api/webhooks', routes_1.webhookRoutes);
app.use('/api/developer', routes_1.developerRoutes);
app.use('/api/payout', routes_1.payoutRoutes);
app.use('/api/kyc', routes_1.kycRoutes);
app.use('/api/admin', routes_1.adminRoutes);
app.use('/api/help', routes_1.helpRoutes);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
    });
});
// Global error handler
app.use((err, req, res, next) => {
    logger_1.logger.error('Unhandled error', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(config_1.default.nodeEnv === 'development' && { error: err.message }),
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map