import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import mongoose from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export class BackupService {
    private drive: any;

    constructor() {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_DRIVE_CLIENT_ID,
            process.env.GOOGLE_DRIVE_CLIENT_SECRET,
            process.env.GOOGLE_DRIVE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
        });

        this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    }

    /**
     * Create a backup of the MongoDB database and upload to Google Drive
     */
    async createAndUploadBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `vtstack-backup-${timestamp}`;
        const backupDir = path.join(__dirname, '../../backups');
        const zipPath = path.join(backupDir, `${backupName}.zip`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        try {
            console.log(`[Backup] Starting backup: ${backupName}`);

            // Try using mongodump if available
            try {
                const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vtpay';
                await execPromise(`mongodump --uri="${mongoUri}" --out="${path.join(backupDir, backupName)}"`);
                console.log(`[Backup] mongodump successful`);
            } catch (err) {
                console.warn(`[Backup] mongodump failed: ${(err as Error).message}. Falling back to manual collection dump.`);
                // Fallback: manual dump of models (less efficient but works everywhere)
                const dumpDir = path.join(backupDir, backupName);
                if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir);

                const collections = await mongoose.connection.db?.listCollections().toArray();
                if (collections) {
                    for (const col of collections) {
                        const data = await mongoose.connection.db?.collection(col.name).find({}).toArray();
                        fs.writeFileSync(path.join(dumpDir, `${col.name}.json`), JSON.stringify(data, null, 2));
                    }
                }
            }

            // Zip the backup directory
            await this.zipDirectory(path.join(backupDir, backupName), zipPath);
            console.log(`[Backup] Zip created: ${zipPath}`);

            // Upload to Google Drive
            const fileMetadata = {
                name: `${backupName}.zip`,
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || ''],
            };

            const media = {
                mimeType: 'application/zip',
                body: fs.createReadStream(zipPath),
            };

            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });

            console.log(`[Backup] Backup uploaded successfully to Drive. File ID: ${response.data.id}`);

            // Cleanup local copies
            fs.rmSync(path.join(backupDir, backupName), { recursive: true, force: true });
            fs.unlinkSync(zipPath);

            return response.data.id;
        } catch (error) {
            console.error('[Backup] Backup failed:', error);
            throw error;
        }
    }

    private zipDirectory(sourceDir: string, outPath: string): Promise<void> {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const stream = fs.createWriteStream(outPath);

        return new Promise((resolve, reject) => {
            archive
                .directory(sourceDir, false)
                .on('error', (err: Error) => reject(err))
                .pipe(stream);

            stream.on('close', () => resolve());
            archive.finalize();
        });
    }
}

export const backupService = new BackupService();
