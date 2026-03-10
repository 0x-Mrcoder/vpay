"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const SystemSetting_1 = require("../models/SystemSetting");
const config_1 = __importDefault(require("../config"));
dotenv_1.default.config();
async function setupPayoutConfig() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(config_1.default.mongodbUri);
        console.log('Connected to MongoDB.');
        const payrantApiKey = process.env.PAYRANT_API_KEY;
        const payrantBaseUrl = process.env.PAYRANT_BASE_URL || 'https://api-core.payrant.com/';
        const parentAccountName = process.env.PARENT_ACCOUNT_NAME;
        const parentAccountNumber = process.env.PARENT_ACCOUNT_NUMBER;
        const parentBankCode = process.env.PARENT_BANK_CODE;
        const zainboxCode = process.env.ZAINPAY_SETTLEMENT_ZAINBOX;
        if (!payrantApiKey || !parentAccountNumber || !parentBankCode || !parentAccountName) {
            console.error('Missing required environment variables:');
            if (!payrantApiKey)
                console.error('- PAYRANT_API_KEY');
            if (!parentAccountName)
                console.error('- PARENT_ACCOUNT_NAME');
            if (!parentAccountNumber)
                console.error('- PARENT_ACCOUNT_NUMBER');
            if (!parentBankCode)
                console.error('- PARENT_BANK_CODE');
            process.exit(1);
        }
        let settings = await SystemSetting_1.SystemSetting.findOne();
        if (!settings) {
            console.log('Creating new SystemSetting document...');
            settings = new SystemSetting_1.SystemSetting();
        }
        // Update Payrant Integration
        settings.integrations = {
            ...settings.integrations,
            payrant: {
                apiKey: payrantApiKey,
                baseUrl: payrantBaseUrl
            }
        };
        // Update Parent Account
        settings.parentAccount = {
            accountName: parentAccountName,
            accountNumber: parentAccountNumber,
            bankCode: parentBankCode,
            type: 'PRIMARY',
            status: 'ACTIVE'
        };
        // Update Zainpay Settlement if provided
        if (zainboxCode) {
            settings.zainpaySettlement = {
                zainboxCode,
                scheduleType: 'T1',
                schedulePeriod: 'Daily',
                status: true
            };
        }
        await settings.save();
        console.log('Successfully updated payout configuration in database.');
        process.exit(0);
    }
    catch (error) {
        console.error('Error setting up payout config:', error);
        process.exit(1);
    }
}
setupPayoutConfig();
//# sourceMappingURL=setup-payout-config.js.map