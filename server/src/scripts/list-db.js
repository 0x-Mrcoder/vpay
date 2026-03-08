
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/vtpay';

async function checkCollections() {
    try {
        await mongoose.connect(MONGODB_URI, { timeoutMS: 5000 });
        console.log('Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkCollections();
