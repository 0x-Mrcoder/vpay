"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const database_1 = require("../config/database");
const setupTestAccounts = async () => {
    try {
        console.log('🚀 Starting test accounts setup script...');
        await (0, database_1.connectDatabase)();
        // 1. Create/Update Admin
        const adminEmail = 'admin@vpay.com';
        const adminPassword = 'Password123!';
        const adminFirstName = 'Super';
        const adminLastName = 'Admin';
        let admin = await models_1.User.findOne({ email: adminEmail.toLowerCase() });
        const salt = await bcryptjs_1.default.genSalt(10);
        const adminPasswordHash = await bcryptjs_1.default.hash(adminPassword, salt);
        if (admin) {
            console.log(`ℹ️ Admin ${adminEmail} already exists. Updating...`);
            admin.passwordHash = adminPasswordHash;
            admin.role = 'admin';
            admin.status = 'active';
            admin.kycLevel = 3;
            admin.kyc_status = 'verified';
            await admin.save();
        }
        else {
            console.log(`📝 Creating new admin: ${adminEmail}...`);
            admin = new models_1.User({
                email: adminEmail.toLowerCase(),
                passwordHash: adminPasswordHash,
                firstName: adminFirstName,
                lastName: adminLastName,
                fullName: `${adminFirstName} ${adminLastName}`,
                phone: '08000000001',
                role: 'admin',
                status: 'active',
                kycLevel: 3,
                kyc_status: 'verified',
            });
            await admin.save();
        }
        // 2. Create/Update Tier 3 User
        const userEmail = 'user@vpay.com';
        const userPassword = 'Password123!';
        const userFirstName = 'Tier3';
        const userLastName = 'Tester';
        const businessName = 'Tester Business';
        let user = await models_1.User.findOne({ email: userEmail.toLowerCase() });
        const userPasswordHash = await bcryptjs_1.default.hash(userPassword, salt);
        const apiKey = `sk_live_${crypto_1.default.randomBytes(24).toString('hex')}`;
        if (user) {
            console.log(`ℹ️ User ${userEmail} already exists. Updating to Tier 3...`);
            user.passwordHash = userPasswordHash;
            user.role = 'user';
            user.status = 'active';
            user.kycLevel = 3;
            user.kyc_status = 'verified';
            user.kyc_tier = 't3';
            user.businessName = businessName;
            user.isPayoutEnabled = true;
            user.payoutRequestStatus = 'approved';
            if (!user.apiKey)
                user.apiKey = apiKey;
            await user.save();
        }
        else {
            console.log(`📝 Creating new Tier 3 user: ${userEmail}...`);
            user = new models_1.User({
                email: userEmail.toLowerCase(),
                passwordHash: userPasswordHash,
                firstName: userFirstName,
                lastName: userLastName,
                fullName: `${userFirstName} ${userLastName}`,
                phone: '08000000002',
                businessName,
                role: 'user',
                status: 'active',
                kycLevel: 3,
                kyc_status: 'verified',
                kyc_tier: 't3',
                isPayoutEnabled: true,
                payoutRequestStatus: 'approved',
                apiKey: apiKey,
            });
            await user.save();
        }
        // 3. Ensure Wallets for both
        const entities = [
            { id: admin._id, email: adminEmail, label: 'Admin' },
            { id: user._id, email: userEmail, label: 'Tier 3 User' }
        ];
        for (const entity of entities) {
            let wallet = await models_1.Wallet.findOne({ userId: entity.id });
            if (!wallet) {
                console.log(`💰 Creating wallet for ${entity.label}...`);
                await models_1.Wallet.create({
                    userId: entity.id,
                    balance: 10000000, // 100k test balance (in kobo? usually stored as minor units)
                    clearedBalance: 10000000,
                    currency: 'NGN',
                });
                console.log(`✅ Wallet created for ${entity.label}.`);
            }
            else {
                console.log(`ℹ️ Wallet already exists for ${entity.label}.`);
            }
        }
        console.log('\n✅ Setup Complete!');
        console.log('-----------------------------------');
        console.log('🔐 Admin Credentials:');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log('-----------------------------------');
        console.log('🔐 Tier 3 User Credentials:');
        console.log(`📧 Email: ${userEmail}`);
        console.log(`🔑 Password: ${userPassword}`);
        console.log(`🔑 API Key: ${user.apiKey}`);
        console.log('-----------------------------------');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during setup:', error);
        process.exit(1);
    }
};
setupTestAccounts();
//# sourceMappingURL=setup-test-accounts.js.map