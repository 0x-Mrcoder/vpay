import mongoose from 'mongoose';
import config from '../config';

export let isReplicaSet = false;

export const connectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('✅ MongoDB connected successfully');

        // Detect if we are on a replica set (required for transactions)
        try {
            const admin = mongoose.connection.db?.admin();
            if (!admin) throw new Error('DB admin not available');
            const result = await admin.command({ isMaster: 1 });
            isReplicaSet = !!result.setName || !!result.isreplicaset;
            
            if (!isReplicaSet) {
                console.warn('⚠️  MongoDB is running as a standalone instance. Transactions are disabled.');
            } else {
                console.log('🔗 MongoDB Replica Set detected. Transactions enabled.');
            }
        } catch (e) {
            console.warn('⚠️  Could not detect MongoDB deployment type. Defaulting to no transactions.');
            isReplicaSet = false;
        }
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});

export default mongoose;
