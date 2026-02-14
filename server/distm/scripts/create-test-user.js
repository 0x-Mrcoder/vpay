"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const models_1 = require("../models");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const createTestUser = async () => {
    try {
        await (0, database_1.connectDatabase)();
        console.log('✅ Connected to database');
        // Test user credentials
        const email = 'testuser@gmail.com';
        const password = 'Password@123';
        // Check if user already exists
        const existingUser = await models_1.User.findOne({ email });
        if (existingUser) {
            console.log('⚠️  Test user already exists:', email);
            process.exit(0);
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = await models_1.User.create({
            email,
            passwordHash: hashedPassword,
            firstName: 'Test',
            lastName: 'User',
            fullName: 'Test User',
            phone: '+2348123456789',
            role: 'user',
            status: 'active',
            kycLevel: 1, // Pre-verified for login
            kyc_status: 'verified',
            businessName: 'Test Business',
        });
        // Create wallet for user
        await models_1.Wallet.create({
            userId: user._id,
            balance: 5000, // Give some initial balance for testing
            currency: 'NGN'
        });
        console.log('✅ Test user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Wallet created with 5000 NGN balance');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error creating test user:', error);
        process.exit(1);
    }
};
createTestUser();
//# sourceMappingURL=create-test-user.js.map