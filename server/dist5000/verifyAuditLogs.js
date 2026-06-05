"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const AuditLog_1 = require("./models/AuditLog");
const User_1 = require("./models/User");
const AuditService_1 = require("./services/AuditService");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const verifyAuditLogs = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('Connected.');
        // 1. Create a dummy admin user if not exists
        let admin = await User_1.User.findOne({ email: 'audit_test_admin@vtpay.com' });
        if (!admin) {
            admin = await User_1.User.create({
                email: 'audit_test_admin@vtpay.com',
                passwordHash: 'hashed_password',
                firstName: 'Audit',
                lastName: 'Tester',
                role: 'admin',
                status: 'active',
                phone: '08012345678'
            });
            console.log('Created test admin user.');
        }
        // 2. Simulate logging an action directly via service (mimicking middleware)
        const actionParams = {
            action: 'TEST_ACTION',
            actorId: admin._id.toString(),
            actorType: 'admin',
            details: { test: true },
            ipAddress: '127.0.0.1',
            status: 'success'
        };
        console.log('Logging test action...');
        await AuditService_1.auditService.logAction(actionParams);
        // 3. Fetch logs using service
        console.log('Fetching logs...');
        const result = await AuditService_1.auditService.getLogs({ action: 'TEST_ACTION' });
        console.log(`Found ${result.logs.length} logs matching TEST_ACTION.`);
        if (result.logs.length > 0) {
            const log = result.logs[0];
            console.log('Latest Log:', {
                action: log.action,
                actor: log.actor.email,
                createdAt: log.createdAt
            });
            if (log.actor.email === 'audit_test_admin@vtpay.com') {
                console.log('✅ Audit Log Verification PASSED: Log found with correct actor.');
            }
            else {
                console.log('❌ Audit Log Verification FAILED: Actor email mismatch.');
            }
        }
        else {
            console.log('❌ Audit Log Verification FAILED: No logs found.');
        }
        // Cleanup
        await AuditLog_1.AuditLog.deleteMany({ action: 'TEST_ACTION' });
        // await User.deleteOne({ email: 'audit_test_admin@vtpay.com' }); // Keep user for now or delete
    }
    catch (error) {
        console.error('Verification failed:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
};
verifyAuditLogs();
//# sourceMappingURL=verifyAuditLogs.js.map