"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
const database_1 = require("../config/database");
const verifyUser = async () => {
    try {
        console.log('🚀 Starting user verification script...');
        await (0, database_1.connectDatabase)();
        const email = 'u@gmail.com';
        const user = await models_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log(`❌ User ${email} not found.`);
            process.exit(1);
        }
        console.log(`Checking user ${email}... Current Level: ${user.kycLevel}, Status: ${user.kyc_status}`);
        // Set to fully approved
        user.kycLevel = 3;
        user.kyc_status = 'verified';
        // Also ensure status is active
        user.status = 'active';
        await user.save();
        console.log(`✅ User ${email} is now fully VERIFIED (Level 3).`);
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error verifying user:', error);
        process.exit(1);
    }
};
verifyUser();
//# sourceMappingURL=verify-user.js.map