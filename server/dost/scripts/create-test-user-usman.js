"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models_1 = require("../models");
const database_1 = require("../config/database");
const createTestUser = async () => {
    try {
        console.log('🚀 Starting test user creation script...');
        await (0, database_1.connectDatabase)();
        const email = 'u@gmail.com';
        const password = '123456';
        const firstName = 'Usman';
        const lastName = 'Umar';
        const businessName = 'Mrcoder';
        const phone = '08000000000'; // Dummy phone
        // Check if user exists
        let user = await models_1.User.findOne({ email: email.toLowerCase() });
        if (user) {
            console.log(`ℹ️ User ${email} already exists. Updating details...`);
            const salt = await bcryptjs_1.default.genSalt(10);
            user.passwordHash = await bcryptjs_1.default.hash(password, salt);
            user.firstName = firstName;
            user.lastName = lastName;
            user.fullName = `${firstName} ${lastName}`;
            user.businessName = businessName;
            user.status = 'active';
            user.role = 'user';
            user.kycLevel = 2; // Verified level
            user.kyc_status = 'verified';
            await user.save();
            console.log('✅ User updated successfully.');
        }
        else {
            console.log(`📝 Creating new user: ${email}...`);
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(password, salt);
            user = new models_1.User({
                email: email.toLowerCase(),
                passwordHash,
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`,
                phone,
                businessName,
                status: 'active',
                kycLevel: 2, // Verified
                kyc_status: 'verified',
                role: 'user',
            });
            await user.save();
            console.log('✅ User created successfully.');
        }
        // Ensure wallet exists
        let wallet = await models_1.Wallet.findOne({ userId: user._id });
        if (!wallet) {
            console.log('💰 Creating wallet...');
            await models_1.Wallet.create({
                userId: user._id,
                balance: 50000, // Give some starter dummy balance
                clearedBalance: 50000,
                currency: 'NGN',
            });
            console.log('✅ Wallet created with 50,000 NGN balance.');
        }
        else {
            console.log('ℹ️ Wallet already exists.');
        }
        console.log('\n🔐 Credentials:');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log('\nYou can now login.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error creating user:', error);
        process.exit(1);
    }
};
createTestUser();
//# sourceMappingURL=create-test-user-usman.js.map