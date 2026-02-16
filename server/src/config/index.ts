import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const loadKey = (envVar: string, fileName: string) => {
    if (process.env[envVar]) return process.env[envVar];
    try {
        const filePath = path.join(__dirname, '../../', fileName);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (e) {
        console.error(`Failed to load key ${fileName}`, e);
    }
    return '';
};

export const config = {
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
        publicKey: loadKey('PALMPAY_PUBLIC_KEY', 'palmpay_public_key.pem'),
        privateKey: loadKey('PALMPAY_PRIVATE_KEY', 'palmpay_private_key.pem'),
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

export default config;
