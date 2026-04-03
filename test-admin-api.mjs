// test-admin-api.mjs
// This script tests the admin login DIRECTLY via the API without opening a browser.
const API_URL = 'http://127.0.0.1:3000/api/admin/login'; // The backend port is usually 3000

async function testAdminAPI() {
    console.log(`🌐 Testing API endpoint: ${API_URL}`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // We found these credentials in server/src/scripts/create-admin.ts
                email: 'admin@vtstack.com.ng',
                password: 'Admin@VTStack123'
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ API Login successful!');
            console.log('User Data received:', data.data.user);
            console.log('Token received:', Array(data.data.token.length).fill('*').join('').substring(0, 10) + '...');
        } else {
            console.error('❌ API Login failed!');
            console.error('Error message:', data.message || 'Unknown error');
        }
    } catch (error) {
        console.error('❌ Failed to connect to the backend server. Is it running?', error.message);
    }
}

testAdminAPI();
