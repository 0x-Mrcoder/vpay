"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const PAYRANT_BASE_URL = process.env.PAYRANT_BASE_URL || 'https://api-core.payrant.com';
const PAYRANT_API_KEY = process.env.PAYRANT_API_KEY;
console.log('Testing Payrant API...');
console.log('Base URL:', PAYRANT_BASE_URL);
console.log('API Key:', PAYRANT_API_KEY ? 'Set' : 'Not Set');
if (!PAYRANT_API_KEY) {
    console.error('Error: PAYRANT_API_KEY is not set in .env');
    process.exit(1);
}
const client = axios_1.default.create({
    baseURL: PAYRANT_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYRANT_API_KEY}`
    },
    timeout: 30000,
    family: 4, // Force IPv4
});
async function testGetBanks() {
    try {
        console.log('Fetching bank list...');
        const response = await client.get('/payout/banks_list/');
        console.log('Response Status:', response.status);
        // console.log('Response Data:', JSON.stringify(response.data, null, 2));
        if (response.data.status === 'success' && response.data.data?.banks) {
            console.log(`Success! Found ${response.data.data.banks.length} banks.`);
            console.log('First 3 banks:', response.data.data.banks.slice(0, 3));
        }
        else {
            console.error('Failed to get valid bank list format');
            console.log('Response:', response.data);
        }
    }
    catch (error) {
        console.error('Error fetching banks:');
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
        else if (error.request) {
            console.error('No response received:', error.message);
        }
        else {
            console.error('Error Message:', error.message);
        }
    }
}
testGetBanks();
//# sourceMappingURL=test-payrant-connection.js.map