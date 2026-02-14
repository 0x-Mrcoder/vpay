import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

function generateKeys() {
    console.log('Generating RSA Key Pair...');

    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    console.log('\n--- NEW PUBLIC KEY (Upload this to PalmPay) ---');
    console.log(publicKey);
    console.log('------------------------------------------------');

    console.log('\n--- NEW PRIVATE KEY (For .env) ---');
    console.log(privateKey);
    console.log('------------------------------------------------');

    // Optional: Save to files
    fs.writeFileSync('palmpay_public_key.pem', publicKey);
    fs.writeFileSync('palmpay_private_key.pem', privateKey);
}

generateKeys();
