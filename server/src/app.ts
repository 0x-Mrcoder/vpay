import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
import {
    authRoutes,
    virtualAccountRoutes,
    walletRoutes,
    transactionRoutes,
    bankRoutes,
    webhookRoutes,
    developerRoutes,
    payoutRoutes,
    kycRoutes,
    adminRoutes,
    helpRoutes,
} from './routes';
import config from './config';
import { logger } from './utils/logger';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
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
app.use(express.json({
    limit: '10mb',
    verify: (req: Request, res: Response, buf: Buffer) => {
        req.rawBody = buf.toString();
    }
}));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path}`, { statusCode: res.statusCode, duration: `${duration}ms` });
    });
    next();
});

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'VTStack API Server is running',
        version: '1.0.0'
    });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'VTStack Server is running',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/virtual-accounts', virtualAccountRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/payout', payoutRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/help', helpRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
    });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(config.nodeEnv === 'development' && { error: err.message }),
    });
});

export default app;
