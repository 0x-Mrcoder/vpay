import { Wallet, Transaction } from '../models';
export declare class WalletService {
    /**
     * Create a new wallet for a user
     */
    createWallet(userId: string): Promise<typeof Wallet.prototype>;
    /**
     * Get wallet by user ID
     */
    getWalletByUserId(userId: string): Promise<typeof Wallet.prototype | null>;
    /**
     * Get wallet balance
     */
    getBalance(userId: string): Promise<{
        balance: number;
        clearedBalance: number;
        lockedBalance: number;
        availableBalance: number;
        pendingBalance: number;
    }>;
    /**
     * Credit wallet (add funds)
     */
    creditWallet(userId: string, amount: number, category: 'deposit' | 'refund', narration: string, externalRef?: string, metadata?: Record<string, any>, customerReference?: string, fee?: number, isCleared?: boolean): Promise<typeof Transaction.prototype>;
    /**
     * Debit wallet (remove funds)
     */
    debitWallet(userId: string, amount: number, fee: number, category: 'transfer' | 'withdrawal', narration: string, externalRef?: string, metadata?: Record<string, any>, customerReference?: string): Promise<typeof Transaction.prototype>;
    /**
     * Lock funds in wallet
     */
    lockFunds(userId: string, amount: number): Promise<void>;
    /**
     * Unlock funds in wallet
     */
    unlockFunds(userId: string, amount: number): Promise<void>;
    /**
     * Get transaction history
     */
    getTransactionHistory(userId: string, options?: {
        limit?: number;
        offset?: number;
        type?: 'credit' | 'debit';
        category?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        transactions: typeof Transaction.prototype[];
        total: number;
    }>;
    /**
     * Get transaction by reference
     */
    getTransactionByReference(reference: string): Promise<typeof Transaction.prototype | null>;
    /**
     * Get transaction by external reference
     */
    getTransactionByExternalRef(externalRef: string): Promise<typeof Transaction.prototype | null>;
    /**
     * Create pending transaction (for transfers that need verification)
     */
    createPendingTransaction(userId: string, amount: number, fee: number, category: 'transfer' | 'withdrawal', narration: string, externalRef?: string, metadata?: Record<string, any>): Promise<typeof Transaction.prototype>;
    /**
     * Update transaction status
     */
    updateTransactionStatus(reference: string, status: 'success' | 'failed', metadata?: Record<string, any>): Promise<typeof Transaction.prototype | null>;
    /**
     * Get balance by customer reference
     */
    getBalanceByReference(userId: string, customerReference: string): Promise<number>;
    /**
     * Get transaction statistics for a user
     */
    getTransactionStats(userId: string): Promise<{
        totalInflow: number;
        totalOutflow: number;
        count: number;
    }>;
}
export declare const walletService: WalletService;
export default walletService;
//# sourceMappingURL=WalletService.d.ts.map