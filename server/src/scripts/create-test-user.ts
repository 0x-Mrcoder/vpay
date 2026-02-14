import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, Wallet } from '../models';
import config from '../config';

dotenv.config();

async function createTestUser() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri);
        console.log('Connected successfully.');

        const email = 'amee@gmail.com';
        const zainboxCode = '93841_Xb0YqFN5n4ayBomIub7O';
        const password = 'Password123!';

        // 1. Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            console.log('User already exists. Updating...');
            user.firstName = 'Aminu';
            user.lastName = 'Amee';
            user.kycLevel = 3;
            user.status = 'active';
            user.kyc_status = 'verified';
            await user.save();
        } else {
            console.log('Creating new user...');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            user = new User({
                email,
                passwordHash,
                firstName: 'Aminu',
                lastName: 'Amee',
                fullName: 'Aminu Amee',
                phone: '08000000000',
                kycLevel: 3,
                kyc_status: 'verified',
                status: 'active',
                role: 'user'
            });
            await user.save();
            console.log('User created successfully.');
        }

        // 2. Ensure wallet exists
        let wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) {
            console.log('Creating wallet...');
            wallet = new Wallet({
                userId: user._id,
                balance: 0,
                totalReceived: 0,
                totalSpent: 0
            });
            await wallet.save();
            console.log('Wallet created.');
        }

        // 3. Link Zainbox
        // let zainbox = await Zainbox.findOne({ zainboxCode });
        // if (zainbox) {
        //     console.log('Zainbox record already exists. Updating owner...');
        //     zainbox.userId = user._id as any;
        //     await zainbox.save();
        // } else {
        //     console.log('Creating Zainbox record...');
        //     zainbox = new Zainbox({
        //         userId: user._id,
        //         name: 'Aminu Amee Zainbox',
        //         emailNotification: email,
        //         tags: 'test,payout',
        //         callbackUrl: 'https://example.com/webhook',
        //         codeName: 'aminu_amee_test',
        //         zainboxCode: zainboxCode,
        //         isActive: true,
        //         isLive: false
        //     });
        //     await zainbox.save();
        //     console.log('Zainbox record created.');
        // }

        console.log('\n--- Setup Complete ---');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Zainbox Code: ${zainboxCode}`);
        console.log('----------------------\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

createTestUser();
