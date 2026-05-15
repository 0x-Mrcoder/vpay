import axios from 'axios';
import crypto from 'crypto';

const payoutSecretKey = 'vt_pout_sec_fdb22c078a0223fdc527cf601d74609288ec335885326a3ba97aa99b39299dc5';
const baseUrl = 'http://localhost:3000/api/v1/payouts';

async function testPayout() {
    const timestamp = Date.now().toString();
    const idempotencyKey = 'test-payout-' + Date.now();
    
    // Testing with 10000 (100 Naira)
    const body = {
        amount: 10000, 
        bankCode: '100004', // OPay
        accountNumber: '9138826727',
        accountName: 'Tester OPay',
        narration: 'Test withdrawal to OPay via API'
    };

    // Signature matches exactly how the middleware expects it: timestamp + JSON.stringify(body)
    const payload = timestamp + JSON.stringify(body);
    const signature = crypto.createHmac('sha256', payoutSecretKey)
        .update(payload)
        .digest('hex');

    console.log('🚀 Sending Payout Request...');
    console.log('Headers:', {
        'x-signature': signature,
        'x-timestamp': timestamp,
        'x-idempotency-key': idempotencyKey
    });

    try {
        const response = await axios.post(`${baseUrl}/request`, body, {
            headers: {
                'Authorization': `Bearer ${payoutSecretKey}`,
                'x-signature': signature,
                'x-timestamp': timestamp,
                'x-idempotency-key': idempotencyKey,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Success Response:', response.status);
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        if (error.response) {
            console.error('❌ Error response:', error.response.status);
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

testPayout();
