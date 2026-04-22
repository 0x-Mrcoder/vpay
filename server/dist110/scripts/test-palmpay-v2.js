"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from the server directory
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const PalmPayService_1 = require("../services/PalmPayService");
async function testPalmPayV2() {
    console.log('--- Testing PalmPay V2.0 Integration ---');
    const testData = {
        accountName: 'Test V2 Account',
        customerName: 'PalmPay Tester',
        email: 'tester@example.com',
        identityType: 'personal',
        licenseNumber: '22222222222', // Dummy BVN for testing
    };
    try {
        console.log('\nTesting createVirtualAccountV2...');
        const result = await PalmPayService_1.palmPayService.createVirtualAccountV2(testData);
        console.log('SUCCESS: Virtual Account Created:');
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error) {
        console.error('FAILED: createVirtualAccountV2 failed');
        if (error.config) {
            console.error('Request Config Headers:', JSON.stringify(error.config.headers, null, 2));
            console.error('Request Config Data:', JSON.stringify(JSON.parse(error.config.data), null, 2));
        }
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        else {
            console.error('Error Message:', error.message);
        }
    }
}
testPalmPayV2().catch(console.error);
//# sourceMappingURL=test-palmpay-v2.js.map