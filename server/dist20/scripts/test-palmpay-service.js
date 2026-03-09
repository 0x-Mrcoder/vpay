"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PalmPayService_1 = require("../services/PalmPayService");
async function testPalmPayService() {
    console.log('--- Testing PalmPay Service ---');
    // 1. Test createVirtualAccount
    try {
        console.log('\nTesting createVirtualAccount...');
        const va = await PalmPayService_1.palmPayService.createVirtualAccount({
            customerName: 'Test User',
            customerEmail: 'test@example.com',
            customerMobile: '08012345678',
            externalReference: 'REF-' + Date.now(),
        });
        console.log('Virtual Account Created:', va);
    }
    catch (error) {
        console.error('createVirtualAccount failed:', error.message);
    }
    // 2. Test resolveBankAccount
    try {
        console.log('\nTesting resolveBankAccount...');
        const resolved = await PalmPayService_1.palmPayService.resolveBankAccount({
            bankCode: '044', // Access Bank
            accountNumber: '0690000000', // Mock
        });
        console.log('Bank Account Resolved:', resolved);
    }
    catch (error) {
        console.error('resolveBankAccount failed:', error.message);
    }
    // 3. Test getBankList
    try {
        console.log('\nTesting getBankList...');
        const banks = await PalmPayService_1.palmPayService.getBankList();
        console.log('Bank List (first 3):', banks.slice(0, 3));
    }
    catch (error) {
        console.error('getBankList failed:', error.message);
    }
}
testPalmPayService().catch(console.error);
//# sourceMappingURL=test-palmpay-service.js.map