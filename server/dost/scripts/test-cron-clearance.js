"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
const database_1 = require("../config/database");
async function testClearanceLogic() {
    try {
        await (0, database_1.connectDatabase)();
        // 1. Setup
        const user = await models_1.User.create({
            email: `cron_test_${Date.now()}@test.com`,
            passwordHash: 'hash',
            firstName: 'Cron',
            lastName: 'Tester',
            phone: `080${Date.now().toString().slice(-8)}`,
            status: 'active'
        });
        const wallet = await models_1.Wallet.create({
            userId: user._id,
            balance: 10000,
            clearedBalance: 0, // Nothing cleared yet
        });
        console.log(`\n👤 User created: ${user.email}`);
        console.log(`💰 Initial Cleared Balance: ₦${wallet.clearedBalance}`);
        // 25 Hours Ago (Eligible for clearance)
        const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
        const txnOld = await models_1.Transaction.create({
            userId: user._id,
            walletId: wallet._id,
            type: 'credit',
            category: 'deposit',
            amount: 5000,
            reference: `REF-OLD-${Date.now()}`,
            description: 'Old Deposit',
            status: 'success',
            isCleared: false,
            createdAt: oldDate,
            balanceBefore: 0,
            balanceAfter: 5000
        });
        // 1 Hour Ago (Not eligible)
        const newDate = new Date(Date.now() - 1 * 60 * 60 * 1000);
        const txnNew = await models_1.Transaction.create({
            userId: user._id,
            walletId: wallet._id,
            type: 'credit',
            category: 'deposit',
            amount: 5000,
            reference: `REF-NEW-${Date.now()}`,
            description: 'New Deposit',
            status: 'success',
            isCleared: false,
            createdAt: newDate,
            balanceBefore: 5000,
            balanceAfter: 10000
        });
        console.log('📝 Created Transactions:');
        console.log(`   - OLD (25h ago): ₦5000 (Should Clear)`);
        console.log(`   - NEW (1h ago):  ₦5000 (Should Pending)`);
        // 3. RUN CLEARANCE LOGIC (Simulating CronService)
        console.log('\n⚙️ Running Clearance Logic...');
        const clearanceThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000 - 5 * 60 * 1000);
        const transactionsToClear = await models_1.Transaction.find({
            type: 'credit',
            category: { $in: ['deposit', 'transfer'] },
            status: 'success',
            isCleared: false,
            createdAt: { $lte: clearanceThreshold }
        });
        console.log(`🔎 Found ${transactionsToClear.length} transactions to clear.`);
        for (const txn of transactionsToClear) {
            txn.isCleared = true;
            txn.clearedAt = new Date();
            await txn.save();
            await models_1.Wallet.findOneAndUpdate({ _id: txn.walletId }, { $inc: { clearedBalance: txn.amount } });
            console.log(`   ✅ Cleared ${txn.reference}`);
        }
        // 4. Verify Results
        const updatedWallet = await models_1.Wallet.findById(wallet._id);
        console.log(`\n💰 Final Cleared Balance: ₦${updatedWallet.clearedBalance}`);
        if (updatedWallet.clearedBalance === 5000) {
            console.log('✅ SUCCESS: Only the old transaction was cleared.');
        }
        else {
            console.error(`❌ FAILURE: Expected 5000, got ${updatedWallet.clearedBalance}`);
        }
        const checkNew = await models_1.Transaction.findById(txnNew._id);
        if (checkNew?.isCleared === false) {
            console.log('✅ SUCCESS: New transaction remains pending.');
        }
        else {
            console.error('❌ FAILURE: New transaction was cleared incorrectly.');
        }
        process.exit(0);
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
}
testClearanceLogic();
//# sourceMappingURL=test-cron-clearance.js.map