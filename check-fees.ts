import mongoose from 'mongoose';
import { FeeRule } from './server/src/models/FeeRule';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './server/.env' });

const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vtpay';

async function checkFees() {
    try {
        await mongoose.connect(mongodbUri);
        console.log('Connected to MongoDB');
        
        const count = await FeeRule.countDocuments();
        console.log(`Current FeeRule count: ${count}`);
        
        if (count === 0) {
            console.log('No fees found. Creating default fees...');
            const defaultFees = [
                {
                    name: 'VA Transaction Fee (Standard)',
                    type: 'percentage',
                    value: 1.5,
                    currency: 'NGN',
                    cap: 2000,
                    category: 'deposit',
                    status: 'active'
                },
                {
                    name: 'Payout Fee (Internal)',
                    type: 'flat',
                    value: 50,
                    currency: 'NGN',
                    category: 'withdrawal',
                    status: 'active'
                },
                {
                    name: 'Utility Payment Charge',
                    type: 'flat',
                    value: 100,
                    currency: 'NGN',
                    category: 'utility',
                    status: 'active'
                }
            ];
            await FeeRule.insertMany(defaultFees);
            console.log('Default fees created successfully!');
        } else {
            const fees = await FeeRule.find();
            console.log('Current Fees in DB:');
            console.log(JSON.stringify(fees, null, 2));
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkFees();
