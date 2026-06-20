export declare class LimitService {
    /**
     * Check if a transaction exceeds the user's tier limits
     * @param userId User ID
     * @param type 'withdrawal' or 'deposit'
     * @param amountKobo Amount in Kobo
     */
    checkTierLimits(userId: string, type: 'withdrawal' | 'deposit', amountKobo: number): Promise<void>;
}
export declare const limitService: LimitService;
//# sourceMappingURL=LimitService.d.ts.map