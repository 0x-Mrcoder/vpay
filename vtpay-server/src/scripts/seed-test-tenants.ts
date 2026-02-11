import { connectDatabase } from '../config/database';
import User from '../models/User';

async function seedTestTenants() {
    try {
        await connectDatabase();
        console.log('✅ Connected to database\n');

        const testTenants = [];
        const baseEmail = 'tenant';
        // Simple hash for testing (not secure, just for demo)
        const password = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNO';

        // Create 30 test tenants
        for (let i = 1; i <= 30; i++) {
            testTenants.push({
                firstName: `Test${i}`,
                lastName: `Tenant`,
                email: `${baseEmail}${i}@test.com`,
                phone: `080${String(i).padStart(8, '0')}`,
                passwordHash: password,
                role: 'tenant',
                status: i % 3 === 0 ? 'suspended' : 'active',
                kyc_status: i % 2 === 0 ? 'verified' : 'pending',
                kycLevel: i % 2 === 0 ? 2 : 1,
                businessName: `Test Business ${i}`,
                isEmailVerified: true,
            });
        }

        const created = await User.insertMany(testTenants);

        console.log(`✅ Created ${created.length} test tenants!\n`);
        console.log('Sample tenants:');
        console.log(`  - ${testTenants[0].email} (Active, Pending KYC)`);
        console.log(`  - ${testTenants[1].email} (Active, Verified KYC)`);
        console.log(`  - ${testTenants[2].email} (Suspended, Pending KYC)`);
        console.log('\n🎉 You can now test pagination in the admin panel!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error seeding test tenants:', error.message);
        process.exit(1);
    }
}

seedTestTenants();
