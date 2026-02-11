
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Wallet } from '../models';
import { connectDatabase } from '../config/database';

dotenv.config();

const creditWallet = async () => {
    try {
        await connectDatabase();

        const email = 'u@gmail.com';
        const amountNaira = 100000;
        const amountKobo = amountNaira * 100;

        const user = await User.findOne({ email });
        if (!user) {
            console.error(`User not found: ${email}`);
            process.exit(1);
        }

        const wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) {
            console.error(`Wallet not found for user: ${email}`);
            process.exit(1);
        }

        console.log(`Current Balance: ₦${wallet.balance / 100}`);
        console.log(`Current Cleared: ₦${wallet.clearedBalance / 100}`);

        wallet.balance += amountKobo;
        wallet.clearedBalance += amountKobo;
        await wallet.save();

        console.log('-----------------------------------');
        console.log(`Successfully credited ₦${amountNaira}`);
        console.log(`New Balance: ₦${wallet.balance / 100}`);
        console.log(`New Cleared: ₦${wallet.clearedBalance / 100}`);

        process.exit(0);
    } catch (error) {
        console.error('Error crediting wallet:', error);
        process.exit(1);
    }
};

creditWallet();
