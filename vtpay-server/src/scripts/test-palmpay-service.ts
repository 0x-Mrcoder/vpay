import dotenv from 'dotenv';
dotenv.config();

import { palmPayService } from '../services/PalmPayService';

async function testPalmPayService() {
    console.log('--- Testing PalmPay Service ---');

    // 1. Test createVirtualAccount
    try {
        console.log('\nTesting createVirtualAccount...');
        const va = await palmPayService.createVirtualAccount({
            customerName: 'Test User',
            customerEmail: 'test@example.com',
            customerMobile: '08012345678',
            externalReference: 'REF-' + Date.now(),
        });
        console.log('Virtual Account Created:', va);
    } catch (error: any) {
        console.error('createVirtualAccount failed:', error.message);
    }

    // 2. Test resolveBankAccount
    try {
        console.log('\nTesting resolveBankAccount...');
        const resolved = await palmPayService.resolveBankAccount({
            bankCode: '044', // Access Bank
            accountNumber: '0690000000', // Mock
        });
        console.log('Bank Account Resolved:', resolved);
    } catch (error: any) {
        console.error('resolveBankAccount failed:', error.message);
    }

    // 3. Test getBankList
    try {
        console.log('\nTesting getBankList...');
        const banks = await palmPayService.getBankList();
        console.log('Bank List (first 3):', banks.slice(0, 3));
    } catch (error: any) {
        console.error('getBankList failed:', error.message);
    }
}

testPalmPayService().catch(console.error);
