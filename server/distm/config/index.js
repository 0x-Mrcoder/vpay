"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    // MongoDB
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vtpay',
    // PalmPay Configuration
    palmpay: {
        baseUrl: process.env.PALMPAY_BASE_URL || 'https://sandbox.palmpay.com/v2',
        merchantId: process.env.PALMPAY_MERCHANT_ID || '',
        appId: process.env.PALMPAY_APP_ID || '',
        apiKey: process.env.PALMPAY_API_KEY || '',
        publicKey: process.env.PALMPAY_PUBLIC_KEY || '',
        privateKey: process.env.PALMPAY_PRIVATE_KEY || '',
        webhookSecret: process.env.PALMPAY_WEBHOOK_SECRET || '',
    },
    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    // Webhook
    webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'https://vtpayapi.vtfree.com.ng',
    // App
    app: {
        url: process.env.APP_URL || 'https://vtpay.vtfree.com.ng',
    },
};
exports.default = exports.config;
//# sourceMappingURL=index.js.map