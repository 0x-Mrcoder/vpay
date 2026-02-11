
import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:3000/api';
// Use the credentials of the admin user I created earlier
const ADMIN_EMAIL = 'tempadmin@vtpay.com';
const ADMIN_PASSWORD = 'password123';

async function testSync() {
    try {
        // 1. Login to get token
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        const token = loginRes.data.data.token;
        console.log('Login successful. Token obtained.');

        // 2. Test OLD endpoint (should 405 or 404 or fail)
        console.log('\nTesting OLD endpoint: /admin/zainboxes/sync (Expected: 404 or 405)');
        try {
            await axios.post(`${BASE_URL}/admin/zainboxes/sync`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('UNEXPECTED: Old endpoint worked!');
        } catch (error: any) {
            console.log(`Expected error on old endpoint: ${error.response?.status} ${error.response?.statusText}`);
        }

        // 2b. Test TOP-LEVEL DEBUG endpoint
        console.log('\nTesting TOP-LEVEL DEBUG endpoint: /admin/test-sync (Expected: 200)');
        try {
            const debugRes = await axios.get(`${BASE_URL}/admin/test-sync`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Success! Debug endpoint response:', debugRes.data);
        } catch (error: any) {
            console.log(`Debug endpoint failed: ${error.response?.status} ${error.response?.statusText}`);
        }

        // 3. Test NEW endpoint (should 200)
        console.log('\nTesting NEW endpoint: /admin/zainboxes/actions/sync (Expected: 200)');
        const syncRes = await axios.post(`${BASE_URL}/admin/zainboxes/actions/sync`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success! New endpoint response:', syncRes.data);
        console.log('Success! New endpoint response:', syncRes.data);

    } catch (error: any) {
        console.error('Test failed:', error.response?.data || error.message);

        // Fetch debug logs
        try {
            console.log('\nFetching Zainpay Service Logs...');
            const logsRes = await axios.get(`${BASE_URL}/admin/debug/zainpay-logs`);
            console.log('--- SERVER LOGS ---');
            console.log(logsRes.data.logs.join('\n'));
            console.log('-------------------');
        } catch (logErr) {
            console.log('Failed to fetch logs:', logErr);
        }
    }
}

testSync();
