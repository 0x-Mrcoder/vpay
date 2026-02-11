import { connectDatabase } from '../config/database';
import { webhookService } from '../services/WebhookService';
import { WebhookEvent } from '../types/zainpay';

const replayWebhook = async () => {
    try {
        await connectDatabase();

        const payload: WebhookEvent = {
            "data": {
                "amountAfterCharges": "9860",
                "bankName": "",
                "beneficiaryAccountName": "",
                "beneficiaryAccountNumber": "9800009739",
                "callBackUrl": "https://vtpayapi.vtfree.com.ng/api/webhooks/zainpay",
                "depositedAmount": "10000",
                "emailNotification": "swallern@gmail.com",
                "narration": "",
                "paymentDate": "2026-01-17T17:01:12.270458722",
                "paymentRef": "467918247/S40976022",
                "sender": "",
                "senderName": "",
                "txnChargesAmount": "140",
                "txnDate": "2026-01-17T17:01:16.743091717",
                "txnRef": "S40976022",
                "txnType": "deposit",
                "zainboxCode": "12762_Y4eeBoWTnH9RzXFvvl8Y",
                "zainboxName": "swallern Workspace"
            },
            "event": "deposit.success"
        } as any; // Casting as any because some fields might be optional/different in type definition but this matches the log

        console.log('Replaying webhook...');
        const result = await webhookService.processWebhook(payload);
        console.log('Result:', result);

        process.exit(0);
    } catch (error) {
        console.error('Error replaying webhook:', error);
        process.exit(1);
    }
};

replayWebhook();
