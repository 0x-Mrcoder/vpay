"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const models_1 = require("../models");
dotenv_1.default.config();
const BASE_URL = 'http://localhost:3000/api';
// Use the secret from .env or default. In test we must match what server uses.
// If server uses default because .env has placeholder, we must use default too OR set env var for this script.
// But wait, server loaded .env. 
// If .env has "your_webhook_secret_here", then server uses that.
// So we must use that too.
const WEBHOOK_SECRET = process.env.PALMPAY_WEBHOOK_SECRET || process.env.VTPAY_WEBHOOK_SECRET || 'default-webhook-secret';
async function connectDB() {
    const mongoUri = process.env.MONGODB_URI?.replace('localhost', '127.0.0.1') || 'mongodb://127.0.0.1:27017/vtpay';
    try {
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}
async function createTestUser() {
    const email = `test.webhook.${Date.now()}@example.com`;
    const user = await models_1.User.create({
        firstName: 'Webhook',
        lastName: 'Tester',
        email,
        password: 'password123',
        phone: '08000000000',
        role: 'user',
        kycLevel: 1
    });
    const wallet = await models_1.Wallet.create({
        userId: user._id,
        balance: 0,
        currency: 'NGN'
    });
    const va = await models_1.VirtualAccount.create({
        userId: user._id,
        accountName: 'Webhook Tester',
        accountNumber: '999' + Math.floor(Math.random() * 10000000),
        bankName: 'PalmPay',
        reference: `REF-${Date.now()}`
    });
    return { user, wallet, va };
}
async function runTest() {
    await connectDB();
    try {
        console.log('--- Starting Webhook E2E Test ---');
        console.log(`Using Webhook Secret: ${WEBHOOK_SECRET}`);
        // 1. Setup Test User
        const { user, wallet, va } = await createTestUser();
        console.log(`Created test user: ${user.email} with VA: ${va.accountNumber}`);
        console.log(`Initial Wallet Balance: ${wallet.balance}`);
        // 2. Prepare Payload
        const amount = 500000; // 5000.00 NGN
        const orderNo = `ORDER-${Date.now()}`;
        const payload = {
            type: 'pay_in_order',
            data: {
                orderNo,
                amount,
                currency: 'NGN',
                status: 'SUCCESS',
                externalReference: va.reference, // Matching our VA reference
                payerName: 'John Doe',
                payerAccount: '1234567890'
            }
        };
        const payloadString = JSON.stringify(payload);
        // 3. Test Missing Signature
        console.log('\nTest 1: Missing Signature');
        try {
            await axios_1.default.post(`${BASE_URL}/webhooks/palmpay`, payload);
            console.error('FAIL: Expected 401 but got success');
        }
        catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('PASS: Got 401 Unauthorized');
            }
            else {
                console.error('FAIL: Unexpected error', error.message);
            }
        }
        // 4. Test Invalid Signature
        console.log('\nTest 2: Invalid Signature');
        try {
            await axios_1.default.post(`${BASE_URL}/webhooks/palmpay`, payload, {
                headers: {
                    'x-palm-signature': 'invalid-signature'
                }
            });
            console.error('FAIL: Expected 401 but got success');
        }
        catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('PASS: Got 401 Unauthorized');
            }
            else {
                console.error('FAIL: Unexpected error', error.message);
            }
        }
        // 5. Test Valid Signature
        console.log('\nTest 3: Valid Signature');
        const signature = crypto_1.default
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(payloadString)
            .digest('hex');
        try {
            const response = await axios_1.default.post(`${BASE_URL}/webhooks/palmpay`, payload, {
                headers: {
                    'x-palm-signature': signature,
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.success) {
                console.log('PASS: Webhook accepted');
            }
            else {
                console.error('FAIL: Webhook accepted but returned success: false', response.data);
            }
        }
        catch (error) {
            console.error('FAIL: Request failed', error.response ? error.response.data : error.message);
        }
        // 6. Verify Wallet Credit
        console.log('\nTest 4: Verifying Wallet Credit');
        // Wait a bit for async processing if any (though currently it's awaited in controller)
        const updatedWallet = await models_1.Wallet.findOne({ userId: user._id });
        console.log(`Updated Wallet Balance: ${updatedWallet?.balance}`);
        if (updatedWallet && updatedWallet.balance === amount) {
            console.log('PASS: Wallet credited correctly');
        }
        else {
            console.error('FAIL: Wallet balance incorrect');
        }
        const txn = await models_1.Transaction.findOne({ reference: orderNo });
        if (txn) {
            console.log('PASS: Transaction record found');
        }
        else {
            console.error('FAIL: Transaction record not found');
        }
    }
    catch (error) {
        console.error('Test execution failed:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
runTest();
//# sourceMappingURL=test-webhook-e2e.js.map