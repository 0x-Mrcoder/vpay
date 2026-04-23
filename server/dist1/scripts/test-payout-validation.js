"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PayoutService_1 = require("../services/PayoutService");
const models_1 = require("../models");
const database_1 = require("../config/database");
async function testPayoutValidation() {
    await (0, database_1.connectDatabase)();
    const service = new PayoutService_1.PayoutService();
    // 1. Create a dummy suspended user
    const suspendedUser = await models_1.User.create({
        email: `suspended_${Date.now()}@test.com`,
        passwordHash: 'hash',
        firstName: 'Suspended',
        lastName: 'User',
        phone: '08000000000',
        status: 'suspended',
        kycLevel: 2,
        kyc_status: 'verified',
        role: 'user'
    });
    console.log(`\n🧪 Testing Suspended User (${suspendedUser.email})...`);
    try {
        await service.initiatePayout(suspendedUser.id, 50000, {
            bankCode: '058', accountNumber: '0123456789', accountName: 'Test'
        });
        console.error('❌ Failed: Suspended user should NOT be able to withdraw!');
    }
    catch (error) {
        if (error.message.includes('suspended')) {
            console.log('✅ Success: Blocked suspended user correctly.');
        }
        else {
            console.error('❌ Failed with unexpected error:', error.message);
        }
    }
    // 2. Create unverified user
    const unverifiedUser = await models_1.User.create({
        email: `unverified_${Date.now()}@test.com`,
        passwordHash: 'hash',
        firstName: 'Unverified',
        lastName: 'User',
        phone: '08000000001',
        status: 'active',
        kycLevel: 1, // Too low
        kyc_status: 'pending',
        role: 'user'
    });
    console.log(`\n🧪 Testing Unverified User (${unverifiedUser.email})...`);
    try {
        await service.initiatePayout(unverifiedUser.id, 50000, {
            bankCode: '058', accountNumber: '0123456789', accountName: 'Test'
        });
        console.error('❌ Failed: Unverified user should NOT be able to withdraw!');
    }
    catch (error) {
        if (error.message.includes('KYC verification')) {
            console.log('✅ Success: Blocked unverified user correctly.');
        }
        else {
            console.error('❌ Failed with unexpected error:', error.message);
        }
    }
    console.log('\n✨ Validation tests completed.');
    process.exit(0);
}
testPayoutValidation();
//# sourceMappingURL=test-payout-validation.js.map