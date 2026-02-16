
import mongoose from 'mongoose';
import { AuditLog } from './models/AuditLog';
import { User } from './models/User';
import { auditService } from './services/AuditService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyAuditLogs = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected.');

        // 1. Create a dummy admin user if not exists
        let admin = await User.findOne({ email: 'audit_test_admin@vtpay.com' });
        if (!admin) {
            admin = await User.create({
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
            actorType: 'admin' as const,
            details: { test: true },
            ipAddress: '127.0.0.1',
            status: 'success' as const
        };

        console.log('Logging test action...');
        await auditService.logAction(actionParams);

        // 3. Fetch logs using service
        console.log('Fetching logs...');
        const result = await auditService.getLogs({ action: 'TEST_ACTION' });

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
            } else {
                console.log('❌ Audit Log Verification FAILED: Actor email mismatch.');
            }
        } else {
            console.log('❌ Audit Log Verification FAILED: No logs found.');
        }

        // Cleanup
        await AuditLog.deleteMany({ action: 'TEST_ACTION' });
        // await User.deleteOne({ email: 'audit_test_admin@vtpay.com' }); // Keep user for now or delete

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyAuditLogs();
