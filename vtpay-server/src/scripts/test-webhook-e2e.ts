
import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, VirtualAccount, Wallet, Transaction } from '../models';

dotenv.config();

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
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

async function createTestUser() {
    const email = `test.webhook.${Date.now()}@example.com`;
    const user = await User.create({
        firstName: 'Webhook',
        lastName: 'Tester',
        email,
        password: 'password123',
        phone: '08000000000',
        role: 'user',
        kycLevel: 1
    });

    const wallet = await Wallet.create({
        userId: user._id,
        balance: 0,
        currency: 'NGN'
    });

    const va = await VirtualAccount.create({
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
            await axios.post(`${BASE_URL}/webhooks/palmpay`, payload);
            console.error('FAIL: Expected 401 but got success');
        } catch (error: any) {
            if (error.response && error.response.status === 401) {
                console.log('PASS: Got 401 Unauthorized');
            } else {
                console.error('FAIL: Unexpected error', error.message);
            }
        }

        // 4. Test Invalid Signature
        console.log('\nTest 2: Invalid Signature');
        try {
            await axios.post(`${BASE_URL}/webhooks/palmpay`, payload, {
                headers: {
                    'x-palm-signature': 'invalid-signature'
                }
            });
            console.error('FAIL: Expected 401 but got success');
        } catch (error: any) {
            if (error.response && error.response.status === 401) {
                console.log('PASS: Got 401 Unauthorized');
            } else {
                console.error('FAIL: Unexpected error', error.message);
            }
        }

        // 5. Test Valid Signature
        console.log('\nTest 3: Valid Signature');
        const signature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(payloadString)
            .digest('hex');

        try {
            const response = await axios.post(`${BASE_URL}/webhooks/palmpay`, payload, {
                headers: {
                    'x-palm-signature': signature,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                console.log('PASS: Webhook accepted');
            } else {
                console.error('FAIL: Webhook accepted but returned success: false', response.data);
            }
        } catch (error: any) {
            console.error('FAIL: Request failed', error.response ? error.response.data : error.message);
        }

        // 6. Verify Wallet Credit
        console.log('\nTest 4: Verifying Wallet Credit');
        // Wait a bit for async processing if any (though currently it's awaited in controller)

        const updatedWallet = await Wallet.findOne({ userId: user._id });
        console.log(`Updated Wallet Balance: ${updatedWallet?.balance}`);

        if (updatedWallet && updatedWallet.balance === amount) {
            console.log('PASS: Wallet credited correctly');
        } else {
            console.error('FAIL: Wallet balance incorrect');
        }

        const txn = await Transaction.findOne({ reference: orderNo });
        if (txn) {
            console.log('PASS: Transaction record found');
        } else {
            console.error('FAIL: Transaction record not found');
        }

    } catch (error) {
        console.error('Test execution failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
