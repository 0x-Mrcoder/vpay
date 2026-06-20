"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = exports.isReplicaSet = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../config"));
exports.isReplicaSet = false;
const connectDatabase = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongodbUri);
        console.log('✅ MongoDB connected successfully');
        // Detect if we are on a replica set (required for transactions)
        try {
            const admin = mongoose_1.default.connection.db?.admin();
            if (!admin)
                throw new Error('DB admin not available');
            const result = await admin.command({ isMaster: 1 });
            exports.isReplicaSet = !!result.setName || !!result.isreplicaset;
            if (!exports.isReplicaSet) {
                console.warn('⚠️  MongoDB is running as a standalone instance. Transactions are disabled.');
            }
            else {
                console.log('🔗 MongoDB Replica Set detected. Transactions enabled.');
            }
        }
        catch (e) {
            console.warn('⚠️  Could not detect MongoDB deployment type. Defaulting to no transactions.');
            exports.isReplicaSet = false;
        }
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};
exports.connectDatabase = connectDatabase;
mongoose_1.default.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});
mongoose_1.default.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});
exports.default = mongoose_1.default;
//# sourceMappingURL=database.js.map