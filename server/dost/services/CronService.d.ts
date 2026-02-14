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
}
export declare const cronService: CronService;
export default cronService;
//# sourceMappingURL=CronService.d.ts.map