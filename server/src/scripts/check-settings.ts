
import mongoose from 'mongoose';
import { SystemSetting } from '../models/SystemSetting';
import { connectDatabase } from '../config/database';

async function checkSettings() {
    try {
        await connectDatabase();
        const settings = await SystemSetting.findOne();
        if (settings) {
            console.log('System Settings Found:');
            if (settings.integrations?.zainpay) {
                console.log('Zainpay Config:', {
                    baseUrl: settings.integrations.zainpay.baseUrl,
                    apiKey: settings.integrations.zainpay.apiKey ? '***REDACTED***' : 'Missing',
                    zainboxCode: settings.integrations.zainpay.zainboxCode
                });
            } else {
                console.log('Zainpay integration settings missing.');
            }
        } else {
            console.log('No System Settings found in DB.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSettings();
