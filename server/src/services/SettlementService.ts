import { Transaction, Wallet, ZainboxSettlementLedger, Zainbox } from '../models';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class SettlementService {
    /**
     * Handle Zainpay settlement webhook
     * This clears pending balances for all users whose transactions were part of this settlement.
     */
    async handleSettlementWebhook(payload: any) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { zainboxCode, amount, settlementId, status } = payload;

            // Only process completed settlements
            if (status !== 'completed' && status !== 'Successful') {
                logger.info(`Settlement ${settlementId} status is ${status}, skipping balance clearing.`);
                await session.abortTransaction();
                return;
            }

            // 1. Create settlement ledger entry
            const ledger = new ZainboxSettlementLedger({
                zainboxCode,
                amount: parseFloat(amount),
                settlementId,
                status: 'completed',
                settledAt: new Date(),
            });

            // 2. Find all successful but uncleared transactions
            // In a real scenario, we might want to filter by date or specific transaction IDs if provided by Zainpay.
            // For T1, we clear everything that was successful and not yet cleared.
            const transactions = await Transaction.find({
                status: 'success',
                isCleared: false,
                type: 'credit', // Only credits (deposits) are cleared
                category: 'deposit',
            }).session(session);

            if (transactions.length === 0) {
                logger.info(`No uncleared transactions found for settlement ${settlementId}`);
                ledger.status = 'completed';
                await ledger.save({ session });
                await session.commitTransaction();
                return;
            }

            const transactionIds = transactions.map(t => t._id);
            ledger.transactionIds = transactionIds;
            await ledger.save({ session });

            // 3. Update transactions and wallet balances
            for (const txn of transactions) {
                txn.isCleared = true;
                txn.clearedAt = new Date();
                await txn.save({ session });

                // Update user's cleared balance
                const wallet = await Wallet.findOne({ userId: txn.userId }).session(session);
                if (wallet) {
                    wallet.clearedBalance += txn.amount;
                    await wallet.save({ session });
                    logger.info(`Cleared ${txn.amount} for user ${txn.userId} from transaction ${txn.reference}`);
                } else {
                    logger.warn(`Wallet not found for user ${txn.userId} during settlement ${settlementId}`);
                }
            }

            await session.commitTransaction();
            logger.info(`Settlement ${settlementId} processed successfully. ${transactions.length} transactions cleared.`);
        } catch (error) {
            await session.abortTransaction();
            logger.error('Failed to process settlement webhook', error);
            throw error;
        } finally {
            session.endSession();
        }
    }
}

export const settlementService = new SettlementService();
export default settlementService;
