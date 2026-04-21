"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const googleapis_1 = require("googleapis");
const dotenv_1 = __importDefault(require("dotenv"));
const readline_1 = __importDefault(require("readline"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET in .env');
    process.exit(1);
}
const oauth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
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
const rl = readline_1.default.createInterface({
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
            const envPath = path_1.default.join(process.cwd(), '.env');
            if (fs_1.default.existsSync(envPath)) {
                let envContent = fs_1.default.readFileSync(envPath, 'utf8');
                if (envContent.includes('GOOGLE_DRIVE_REFRESH_TOKEN=')) {
                    envContent = envContent.replace(/GOOGLE_DRIVE_REFRESH_TOKEN=.*/, `GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
                    fs_1.default.writeFileSync(envPath, envContent);
                    console.log('\n📝 Updated .env with the new refresh token.');
                }
                else {
                    fs_1.default.appendFileSync(envPath, `\nGOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
                    console.log('\n📝 Added GOOGLE_DRIVE_REFRESH_TOKEN to .env');
                }
            }
        }
        else {
            console.log('\n⚠️ No refresh token returned. This usually happens if you did not grant permission or you already have an active refresh token.');
            console.log('Try visiting the URL again and make sure to "Confirm" all permissions.');
        }
    }
    catch (error) {
        console.error('❌ Error retrieving access token:', error.message);
    }
    process.exit(0);
});
//# sourceMappingURL=generate-google-token.js.map