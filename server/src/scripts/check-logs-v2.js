
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/vtpay';

async function checkLogs() {
    try {
        await mongoose.connect(MONGODB_URI, { timeoutMS: 5000 });
        console.log('Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (!collectionNames.includes('webhooklogs')) {
            console.log('Collection "webhooklogs" does not exist');
            await mongoose.disconnect();
            return;
        }

        const count = await mongoose.connection.db.collection('webhooklogs').countDocuments();
        console.log(`Total webhook logs: ${count}`);

        if (count > 0) {
            const logs = await mongoose.connection.db.collection('webhooklogs')
                .find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .toArray();
            console.log('Recent Logs:', JSON.stringify(logs, null, 2));
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkLogs();
