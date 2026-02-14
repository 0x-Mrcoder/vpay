
import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

async function createTempAdmin() {
    try {
        await connectDatabase();

        const email = 'tempadmin@vtpay.com';
        const password = 'password123';

        // Delete if exists
        await User.deleteOne({ email });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await User.create({
            firstName: 'Temp',
            lastName: 'Admin',
            email,
            passwordHash,
            role: 'admin',
            status: 'active',
            businessName: 'VTStack Admin',
            phone: '08000000000',
            kycLevel: 2 // Directly set to Verified to bypass login check
        });

        console.log('Temp admin created:', user.email);
        process.exit(0);
    } catch (error) {
        console.error('Failed to create admin:', error);
        process.exit(1);
    }
}

createTempAdmin();
