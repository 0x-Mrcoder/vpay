export declare class BackupService {
    private drive;
    constructor();
    /**
     * Create a backup of the MongoDB database and upload to Google Drive
     */
    createAndUploadBackup(): Promise<any>;
    private zipDirectory;
}
export declare const backupService: BackupService;
//# sourceMappingURL=BackupService.d.ts.map