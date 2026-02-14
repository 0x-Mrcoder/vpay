import { PayoutService } from '../services/PayoutService';
import { User, Wallet, Payout, Transaction } from '../models';
import { connectDatabase } from '../config/database';
import { payrantService } from '../services/PayrantService';
import mongoose from 'mongoose';

// Mock Payrant Service
payrantService.transfer = async (payload: any) => {
    console.log('mock: payrantService.transfer called with:', payload);
    return {
        status: 'success',
        message: 'Transfer initiated',
        data: {
            transfer_id: 123456,
            reference: 'TRANSFER_MOCK_REF',
            order_no: 'ORDER_123',
            amount: payload.amount,
            fee: 10,
            total_debit: payload.amount + 10,
            bank_name: 'Mock Bank',
            account_name: payload.account_name,
            account_number: payload.account_number,
            status: 'processing',
            estimated_completion: '1 min',
            webhook_url: payload.notify_url
        }
    };
};

async function testPayoutSuccess() {
    try {
        await connectDatabase();

        // 1. Setup User & Wallet
        const user = await User.create({
            email: `payout_test_${Date.now()}@test.com`,
            passwordHash: 'hash',
            firstName: 'Payout',
            lastName: 'Tester',
            phone: '08099999999',
            status: 'active',
            kycLevel: 2,
            kyc_status: 'verified',
            role: 'user'
        });

        const wallet = await Wallet.create({
            userId: user._id,
            balance: 50000,
            clearedBalance: 50000,
            currency: 'NGN',
            ledgerBalance: 50000,
            lockedBalance: 0
        });

        console.log(`\n👤 User created: ${user.email}`);
        console.log(`💰 Initial Wallet Balance: ₦${wallet.clearedBalance / 100}`);

        // 2. Initiate Payout
        const service = new PayoutService();
        const amount = 20000; // 200 Naira (Minimum is 100 Naira)
        // PayoutService.initiatePayout(amount) -> calculateFees(amount)
        // calculateFees(amount) -> safeAmount = amount
        // if user inputs 2000 (20 Naira), fee might be applied.

        console.log('🚀 Initiating Payout of ₦20.00 (2000 kobo)...');

        const payout = await service.initiatePayout(user.id, amount, {
            bankCode: '058',
            accountNumber: '0123456789',
            accountName: 'Test Beneficiary'
        });

        console.log('✅ Payout initiated successfully!');
        console.log('📄 Payout ID:', payout._id);
        console.log('📄 Payout Status:', payout.status);
        console.log('📄 External Ref:', payout.externalRef);

        // 3. Verify Wallet Deduction
        const updatedWallet = await Wallet.findById(wallet._id);
        console.log(`💰 Updated Wallet Balance: ₦${updatedWallet?.clearedBalance! / 100}`);

        if (updatedWallet?.clearedBalance === 48000) { // 50000 - 2000
            console.log('✅ Wallet deduction correct.');
        } else {
            console.error(`❌ Wallet deduction mismatch! Expected 48000 (₦480), got ${updatedWallet?.clearedBalance}`);
        }

        // 4. Verify Payout Status
        // Since processPayout is async but we awaited it inside (or verify if we awaited it),
        // Wait, in my code: "this.processPayout(payout.id)" was NOT awaited in the final block.
        // So status might be INITIATED or PROCESSING depending on race condition.
        // But we want to ensure it eventually becomes PROCESSING.

        // Let's explicitly wait a bit
        await new Promise(r => setTimeout(r, 1000));

        const updatedPayout = await Payout.findById(payout._id);
        console.log('📄 Updated Payout Status (after 1s):', updatedPayout?.status);

        if (updatedPayout?.status === 'PROCESSING') {
            console.log('✅ Payout correctly moved to PROCESSING status.');
        } else {
            console.warn('⚠️ Payout status is still', updatedPayout?.status);
        }

        process.exit(0);

    } catch (error: any) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}

testPayoutSuccess();
