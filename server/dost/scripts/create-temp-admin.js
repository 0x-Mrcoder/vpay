"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../models/User");
const database_1 = require("../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function createTempAdmin() {
    try {
        await (0, database_1.connectDatabase)();
        const email = 'tempadmin@vtpay.com';
        const password = 'password123';
        // Delete if exists
        await User_1.User.deleteOne({ email });
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const user = await User_1.User.create({
            firstName: 'Temp',
            lastName: 'Admin',
            email,
            passwordHash,
            role: 'admin',
            status: 'active',
            businessName: 'VTPay Admin',
            phone: '08000000000',
            kycLevel: 2 // Directly set to Verified to bypass login check
        });
        console.log('Temp admin created:', user.email);
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to create admin:', error);
        process.exit(1);
    }
}
createTempAdmin();
//# sourceMappingURL=create-temp-admin.js.map