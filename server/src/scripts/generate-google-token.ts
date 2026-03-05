import { google } from 'googleapis';
import dotenv from 'dotenv';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET in .env');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Forces refresh token to be returned
});

console.log('----------------------------------------------------');
console.log('🚀 Google Drive Refresh Token Generator');
console.log('----------------------------------------------------');
console.log('1. Visit the following URL in your browser:');
console.log(authUrl);
console.log('----------------------------------------------------');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('2. Enter the Authorization Code from the page: ', async (code) => {
    rl.close();
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('----------------------------------------------------');
        console.log('✅ Tokens retrieved successfully!');

        if (tokens.refresh_token) {
            console.log('\nYour Refresh Token is:');
            console.log(tokens.refresh_token);

            // Try to update .env automatically
            const envPath = path.join(process.cwd(), '.env');
            if (fs.existsSync(envPath)) {
                let envContent = fs.readFileSync(envPath, 'utf8');
                if (envContent.includes('GOOGLE_DRIVE_REFRESH_TOKEN=')) {
                    envContent = envContent.replace(
                        /GOOGLE_DRIVE_REFRESH_TOKEN=.*/,
                        `GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`
                    );
                    fs.writeFileSync(envPath, envContent);
                    console.log('\n📝 Updated .env with the new refresh token.');
                } else {
                    fs.appendFileSync(envPath, `\nGOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
                    console.log('\n📝 Added GOOGLE_DRIVE_REFRESH_TOKEN to .env');
                }
            }
        } else {
            console.log('\n⚠️ No refresh token returned. This usually happens if you did not grant permission or you already have an active refresh token.');
            console.log('Try visiting the URL again and make sure to "Confirm" all permissions.');
        }
    } catch (error) {
        console.error('❌ Error retrieving access token:', (error as Error).message);
    }
    process.exit(0);
});
