"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SystemSetting_1 = require("../models/SystemSetting");
const database_1 = require("../config/database");
async function checkSettings() {
    try {
        await (0, database_1.connectDatabase)();
        const settings = await SystemSetting_1.SystemSetting.findOne();
        if (settings) {
            console.log('System Settings Found:');
            if (settings.integrations?.zainpay) {
                console.log('Zainpay Config:', {
                    baseUrl: settings.integrations.zainpay.baseUrl,
                    apiKey: settings.integrations.zainpay.apiKey ? '***REDACTED***' : 'Missing',
                    zainboxCode: settings.integrations.zainpay.zainboxCode
                });
            }
            else {
                console.log('Zainpay integration settings missing.');
            }
        }
        else {
            console.log('No System Settings found in DB.');
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
checkSettings();
//# sourceMappingURL=check-settings.js.map