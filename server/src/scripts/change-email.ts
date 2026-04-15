import { connectDatabase } from '../config/database';
import { User } from '../models';
import mongoose from 'mongoose';

/**
 * Script to change a user's email across all collections
 * 
 * Updates:
 * 1. User collection - primary email
 * 2. VirtualAccount collection - linked email
 * 3. AuditLog collection - actor.email references
 */

const OLD_EMAIL = 'swallern@gmail.com';
const NEW_EMAIL = 'ibrahimaligrk22@gmail.com'; // stored lowercase per schema

const changeEmail = async () => {
    try {
        console.log('🚀 Starting email change script...');
        console.log(`   Old email: ${OLD_EMAIL}`);
        console.log(`   New email: ${NEW_EMAIL}`);
        console.log('');

        await connectDatabase();

        // ─── Step 1: Find the user ───────────────────────────────────
        const user = await User.findOne({ email: OLD_EMAIL.toLowerCase() });

        if (!user) {
            console.log(`❌ User with email "${OLD_EMAIL}" not found in the database.`);
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user._id})`);
        console.log(`   Role: ${user.role} | Status: ${user.status} | KYC: ${user.kyc_status}`);
        console.log('');

        // ─── Step 2: Check new email doesn't already exist ───────────
        const existingUser = await User.findOne({ email: NEW_EMAIL.toLowerCase() });
        if (existingUser) {
            console.log(`❌ A user with email "${NEW_EMAIL}" already exists! Aborting.`);
            process.exit(1);
        }

        // ─── Step 3: Update User email ──────────────────────────────
        user.email = NEW_EMAIL.toLowerCase();
        await user.save();
        console.log(`✅ [User] Email updated successfully.`);

        // ─── Step 4: Update VirtualAccount email ────────────────────
        const VirtualAccount = mongoose.connection.collection('virtualaccounts');
        const vaResult = await VirtualAccount.updateMany(
            { email: OLD_EMAIL.toLowerCase() },
            { $set: { email: NEW_EMAIL.toLowerCase() } }
        );
        console.log(`✅ [VirtualAccount] Updated ${vaResult.modifiedCount} record(s).`);

        // ─── Step 5: Update AuditLog actor.email ────────────────────
        const AuditLog = mongoose.connection.collection('auditlogs');
        const alResult = await AuditLog.updateMany(
            { 'actor.email': OLD_EMAIL.toLowerCase() },
            { $set: { 'actor.email': NEW_EMAIL.toLowerCase() } }
        );
        console.log(`✅ [AuditLog] Updated ${alResult.modifiedCount} record(s).`);

        // ─── Step 6: Verify the change ──────────────────────────────
        console.log('');
        console.log('── Verification ──────────────────────────────');
        const updatedUser = await User.findById(user._id);
        console.log(`   User email is now: ${updatedUser?.email}`);
        console.log('');

        console.log('═══════════════════════════════════════════════');
        console.log('  ✅ EMAIL CHANGE COMPLETED SUCCESSFULLY');
        console.log(`  Old: ${OLD_EMAIL}`);
        console.log(`  New: ${NEW_EMAIL}`);
        console.log('═══════════════════════════════════════════════');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error changing email:', error);
        process.exit(1);
    }
};

changeEmail();
