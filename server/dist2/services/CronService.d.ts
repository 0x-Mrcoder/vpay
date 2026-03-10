export declare class CronService {
    private isRunning;
    private lastRun;
    private lastError;
    getStatus(): {
        isRunning: boolean;
        lastRun: Date | null;
        lastError: string | null;
        cronSchedule: string;
    };
    /**
     * Start the deposit clearance job
     * Checks every minute for transactions that have matured (24h)
     */
    startDepositClearanceJob(): void;
    /**
     * 6️⃣ AUTOMATIC DEPOSIT RECONCILIATION
     * Runs every 5 minutes — recovers deposits that arrived but whose webhook
     * never triggered (network failures, server restarts, PalmPay retry limits, etc.)
     */
    startReconciliationJob(): void;
    /**
     * Start the hourly database backup to Drive
     */
    startBackupJob(): void;
}
export declare const cronService: CronService;
export default cronService;
//# sourceMappingURL=CronService.d.ts.map