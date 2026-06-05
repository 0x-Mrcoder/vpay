export declare class CronService {
    private clearanceTask;
    private clearanceRunning;
    private clearancePaused;
    private clearancePausedAt;
    private clearanceElapsedMs;
    private clearanceStartedAt;
    private clearanceLastRun;
    private clearanceLastError;
    private settlementPaused;
    private settlementPausedAt;
    private reconciliationTask;
    private backupTask;
    getCronStatus(): {
        settlementCron: {
            isRunning: boolean;
            isPaused: boolean;
            pausedAt: Date | null;
            elapsedMs: number;
            lastRun: Date | null;
            lastError: string | null;
            schedule: string;
        };
        depositClearance: {
            isRunning: boolean;
            isPaused: boolean;
            pausedAt: Date | null;
            lastRun: Date | null;
            lastError: string | null;
        };
    };
    pauseSettlement(): {
        success: boolean;
        message: string;
    };
    resumeSettlement(): {
        success: boolean;
        message: string;
    };
    startDepositClearanceJob(): void;
    startReconciliationJob(): void;
    startBackupJob(): void;
}
export declare const cronService: CronService;
export default cronService;
//# sourceMappingURL=CronService.d.ts.map