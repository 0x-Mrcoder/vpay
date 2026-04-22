"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../config"));
const connectDatabase = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongodbUri);
        console.log('✅ MongoDB connected successfully');
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