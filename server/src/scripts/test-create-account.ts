import mongoose from 'mongoose';
import { zainpayService } from '../services/ZainpayService';
import { User, Zainbox } from '../models';
import config from '../config';

async function testCreateAccount() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri);

        console.log('Refreshing Zainpay config...');
        await zainpayService.refreshConfig();

        const email = 'amee@gmail.com';
        const user = await User.findOne({ email });
        if (!user) {
            console.error('User not found');
            return;
        }

        const zainbox = await Zainbox.findOne({ userId: user._id });
        if (!zainbox) {
            console.error('Zainbox not found for user');
            return;
        }

        console.log('Attempting to create virtual account...');
        console.log('Zainbox Code:', zainbox.zainboxCode);

        const payload = {
            bankType: 'gtBank',
            firstName: user.firstName,
            surname: user.lastName,
            email: user.email,
            mobileNumber: user.phone,
            dob: '01-01-1990',
            gender: 'M' as const,
            address: 'Nigeria',
            title: 'Mr',
            state: 'Lagos',
            bvn: user.bvn || '',
            zainboxCode: zainbox.zainboxCode,
        };

        try {
            const response = await zainpayService.createVirtualAccount(payload);
            console.log('Response:', JSON.stringify(response, null, 2));
        } catch (error: any) {
            console.error('Error Status:', error.response?.status);
            console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
            console.error('Error Message:', error.message);
            console.error('Full URL:', error.config?.url);
            console.error('Method:', error.config?.method);
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testCreateAccount();
