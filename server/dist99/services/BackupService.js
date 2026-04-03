"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupService = exports.BackupService = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const mongoose_1 = __importDefault(require("mongoose"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
class BackupService {
    constructor() {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_DRIVE_CLIENT_ID, process.env.GOOGLE_DRIVE_CLIENT_SECRET, process.env.GOOGLE_DRIVE_REDIRECT_URI);
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
        });
        this.drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2Client });
    }
    /**
     * Create a backup of the MongoDB database and upload to Google Drive
     */
    async createAndUploadBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `vtstack-backup-${timestamp}`;
        const backupDir = path_1.default.join(__dirname, '../../backups');
        const zipPath = path_1.default.join(backupDir, `${backupName}.zip`);
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        try {
            console.log(`[Backup] Starting backup: ${backupName}`);
            // Try using mongodump if available
            try {
                const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vtpay';
                await execPromise(`mongodump --uri="${mongoUri}" --out="${path_1.default.join(backupDir, backupName)}"`);
                console.log(`[Backup] mongodump successful`);
            }
            catch (err) {
                console.warn(`[Backup] mongodump failed: ${err.message}. Falling back to manual collection dump.`);
                // Fallback: manual dump of models (less efficient but works everywhere)
                const dumpDir = path_1.default.join(backupDir, backupName);
                if (!fs_1.default.existsSync(dumpDir))
                    fs_1.default.mkdirSync(dumpDir);
                const collections = await mongoose_1.default.connection.db?.listCollections().toArray();
                if (collections) {
                    for (const col of collections) {
                        const data = await mongoose_1.default.connection.db?.collection(col.name).find({}).toArray();
                        fs_1.default.writeFileSync(path_1.default.join(dumpDir, `${col.name}.json`), JSON.stringify(data, null, 2));
                    }
                }
            }
            // Zip the backup directory
            await this.zipDirectory(path_1.default.join(backupDir, backupName), zipPath);
            console.log(`[Backup] Zip created: ${zipPath}`);
            // Upload to Google Drive
            const fileMetadata = {
                name: `${backupName}.zip`,
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || ''],
            };
            const media = {
                mimeType: 'application/zip',
                body: fs_1.default.createReadStream(zipPath),
            };
            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
            console.log(`[Backup] Backup uploaded successfully to Drive. File ID: ${response.data.id}`);
            // Cleanup local copies
            fs_1.default.rmSync(path_1.default.join(backupDir, backupName), { recursive: true, force: true });
            fs_1.default.unlinkSync(zipPath);
            return response.data.id;
        }
        catch (error) {
            console.error('[Backup] Backup failed:', error);
            throw error;
        }
    }
    zipDirectory(sourceDir, outPath) {
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const stream = fs_1.default.createWriteStream(outPath);
        return new Promise((resolve, reject) => {
            archive
                .directory(sourceDir, false)
                .on('error', (err) => reject(err))
                .pipe(stream);
            stream.on('close', () => resolve());
            archive.finalize();
        });
    }
}
exports.BackupService = BackupService;
exports.backupService = new BackupService();
//# sourceMappingURL=BackupService.js.map