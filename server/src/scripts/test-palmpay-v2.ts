import dotenv from 'dotenv';
import path from 'path';
// Load .env from the server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { palmPayService } from '../services/PalmPayService';

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
        const result = await palmPayService.createVirtualAccountV2(testData);
        console.log('SUCCESS: Virtual Account Created:');
        console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error('FAILED: createVirtualAccountV2 failed');
        if (error.config) {
            console.error('Request Config Headers:', JSON.stringify(error.config.headers, null, 2));
            console.error('Request Config Data:', JSON.stringify(JSON.parse(error.config.data), null, 2));
        }
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

testPalmPayV2().catch(console.error);
