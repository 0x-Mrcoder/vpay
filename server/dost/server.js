"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const database_1 = require("./config/database");
const logger_1 = require("./utils/logger");
const startServer = async () => {
    try {
        // Connect to MongoDB
        await (0, database_1.connectDatabase)();
        // Initialize Cron Jobs
        const { cronService } = await Promise.resolve().then(() => __importStar(require('./services/CronService')));
        cronService.startDepositClearanceJob();
        // Initialize PalmPay Service
        const { palmPayService } = await Promise.resolve().then(() => __importStar(require('./services/PalmPayService')));
        logger_1.logger.info('✅ PalmPay Service initialized');
        // Start Express server
        app_1.default.listen(config_1.default.port, () => {
            logger_1.logger.info(`🚀 VTPay Server running on port ${config_1.default.port}`);
            logger_1.logger.info(`🌍 Environment: ${config_1.default.nodeEnv}`);
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start server', error);
        process.exit(1);
    }
};
// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection', { promise, reason });
});
// Start the server
startServer();
//# sourceMappingURL=server.js.map