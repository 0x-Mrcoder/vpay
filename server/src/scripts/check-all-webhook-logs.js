
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/vtpay';

async function checkLogs() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const WebhookLogSchema = new mongoose.Schema({}, { strict: false });
        const WebhookLog = mongoose.model('WebhookLog', WebhookLogSchema, 'webhooklogs');

        const logs = await WebhookLog.find({})
            .sort({ createdAt: -1 })
            .limit(20);

        console.log('Recent Webhook Logs (Any Source):');
        console.log(JSON.stringify(logs, null, 2));

        const counts = await WebhookLog.aggregate([
            { $group: { _id: "$source", count: { $sum: 1 } } }
        ]);
        console.log('Webhook counts by source:', counts);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error checking logs:', error);
    }
}

checkLogs();
