import { connectDatabase } from '../config/database';
import { User, Wallet } from '../models';
import bcrypt from 'bcryptjs';

const createTestUser = async () => {
    try {
        await connectDatabase();
        console.log('✅ Connected to database');

        // Test user credentials
        const email = 'testuser@gmail.com';
        const password = 'Password@123';

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('⚠️  Test user already exists:', email);
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            email,
            passwordHash: hashedPassword,
            firstName: 'Test',
            lastName: 'User',
            fullName: 'Test User',
            phone: '+2348123456789',
            role: 'user',
            status: 'active',
            kycLevel: 1, // Pre-verified for login
            kyc_status: 'verified',
            businessName: 'Test Business',
        });

        // Create wallet for user
        await Wallet.create({
            userId: user._id,
            balance: 5000, // Give some initial balance for testing
            currency: 'NGN'
        });

        console.log('✅ Test user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Wallet created with 5000 NGN balance');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating test user:', error);
        process.exit(1);
    }
};

createTestUser();
