import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, Wallet, SystemSetting } from '../models';
import { connectDatabase } from '../config/database';

const setupTestAccounts = async () => {
    try {
        console.log('🚀 Starting test accounts setup script...');
        await connectDatabase();

        // 1. Create/Update Admin
        const adminEmail = 'admin@vpay.com';
        const adminPassword = 'Password123!';
        const adminFirstName = 'Super';
        const adminLastName = 'Admin';

        let admin = await User.findOne({ email: adminEmail.toLowerCase() });
        const salt = await bcrypt.genSalt(10);
        const adminPasswordHash = await bcrypt.hash(adminPassword, salt);

        if (admin) {
            console.log(`ℹ️ Admin ${adminEmail} already exists. Updating...`);
            admin.passwordHash = adminPasswordHash;
            admin.role = 'admin';
            admin.status = 'active';
            admin.kycLevel = 3;
            admin.kyc_status = 'verified';
            await admin.save();
        } else {
            console.log(`📝 Creating new admin: ${adminEmail}...`);
            admin = new User({
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

        let user = await User.findOne({ email: userEmail.toLowerCase() });
        const userPasswordHash = await bcrypt.hash(userPassword, salt);

        const apiKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`;

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
            if (!user.apiKey) user.apiKey = apiKey;
            await user.save();
        } else {
            console.log(`📝 Creating new Tier 3 user: ${userEmail}...`);
            user = new User({
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
            let wallet = await Wallet.findOne({ userId: entity.id });
            if (!wallet) {
                console.log(`💰 Creating wallet for ${entity.label}...`);
                await Wallet.create({
                    userId: entity.id,
                    balance: 10000000, // 100k test balance (in kobo? usually stored as minor units)
                    clearedBalance: 10000000,
                    currency: 'NGN',
                });
                console.log(`✅ Wallet created for ${entity.label}.`);
            } else {
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
    } catch (error) {
        console.error('❌ Error during setup:', error);
        process.exit(1);
    }
};

setupTestAccounts();
