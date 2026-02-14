export declare class PayoutService {
    /**
     * Calculate payout fees
     */
    calculateFees(amount: number, isInternal: boolean): Promise<{
        fee: number;
        gatewayFee: number;
        totalDebit: number;
        netAmount: number;
    }>;
    /**
     * Initiate a payout request
     */
    initiatePayout(userId: string, amount: number, details: {
        bankCode: string;
        accountNumber: string;
        accountName: string;
    }): Promise<any>;
    /**
     * Handle Payout Success
     */
    handlePayoutSuccess(payout: any): Promise<void>;
    /**
     * Handle Payout Failure
     */
    handlePayoutFailure(payout: any, reason: string, skipRefund?: boolean): Promise<void>;
}
export declare const payoutService: PayoutService;
export default payoutService;
//# sourceMappingURL=PayoutService.d.ts.map