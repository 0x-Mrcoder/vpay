import mongoose from 'mongoose';
import { Payout, Transaction, VirtualAccount } from '../models';
import config from '../config';

/**
 * Migration script to backfill fee data for existing payouts
 * Run with: npx ts-node src/scripts/migratePayouts.ts
 */
async function migrate() {
    console.log('🚀 Starting Payout Fee Migration...');

    try {
        await mongoose.connect(config.mongodbUri);
        console.log('✅ Connected to MongoDB');

        const payouts = await Payout.find({
            $or: [
                { fee: { $exists: false } },
                { payoutType: { $exists: false } },
                { totalDebit: { $exists: false } }
            ]
        });

        console.log(`Found ${payouts.length} payouts to migrate.`);

        let migratedCount = 0;

        for (const payout of payouts) {
            try {
                // 1. Determine if Internal or External
                const isInternal = await VirtualAccount.exists({ accountNumber: payout.accountNumber });

                // 2. Calculate Fees (0.6% VTpay, 1.6% + 25 Zainpay if external)
                const totalDebit = payout.amount; // In old schema, amount was total deducted
                const fee = Math.ceil(totalDebit * 0.006);
                let payrantFee = 0;

                if (!isInternal) {
                    const zainpayPercentFee = Math.ceil(totalDebit * 0.016);
                    const zainpayFixedFee = 2500; // NGN 25 in kobo
                    payrantFee = zainpayPercentFee + zainpayFixedFee;
                }

                const amount = totalDebit - fee - payrantFee;

                // 3. Update Payout Record
                payout.fee = fee;
                payout.payrantFee = payrantFee;
                payout.totalDebit = totalDebit;
                payout.amount = amount; // amount is now what the user receives
                payout.payoutType = isInternal ? 'internal' : 'external';

                await payout.save();

                // 4. Update associated Ledger Transaction
                const transaction = await Transaction.findOne({ reference: payout.reference });
                if (transaction) {
                    transaction.fee = fee + payrantFee;
                    transaction.metadata = {
                        ...(transaction.metadata || {}),
                        payoutId: payout._id,
                        fee,
                        payrantFee,
                        amount,
                        totalDebit,
                        payoutType: payout.payoutType
                    };
                    await transaction.save();
                }

                migratedCount++;
                console.log(`[${migratedCount}/${payouts.length}] Migrated: ${payout.reference} (${payout.payoutType})`);
            } catch (err: any) {
                console.error(`❌ Failed to migrate payout ${payout.reference}:`, err.message);
            }
        }

        console.log(`\n🎉 Migration finished. ${migratedCount} records updated.`);
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

migrate();
