
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/vtpay';

async function checkLogs() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const WebhookLogSchema = new mongoose.Schema({}, { strict: false });
        const WebhookLog = mongoose.model('WebhookLog', WebhookLogSchema, 'webhooklogs');

        const logs = await WebhookLog.find({ source: 'palmpay' })
            .sort({ createdAt: -1 })
            .limit(10);

        console.log('Recent PalmPay Webhook Logs:');
        console.log(JSON.stringify(logs, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error checking logs:', error);
    }
}

checkLogs();
