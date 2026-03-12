"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const models_1 = require("../models");
const testFetch = async () => {
    await (0, database_1.connectDatabase)();
    const settings = await models_1.SystemSetting.findOne();
    const apiKey = settings?.integrations?.zainpay?.apiKey;
    if (!apiKey) {
        console.error('No API Key found in DB');
        process.exit(1);
    }
    // We need a valid zainbox code. I'll pick one from the logs if available, or fetch list first.
    // For now, I'll fetch the list first to get a valid code.
    try {
        console.log('Fetching Zainbox list...');
        const listResponse = await fetch('https://api.zainpay.ng/zainbox/list', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
        });
        if (!listResponse.ok) {
            console.error('Failed to list zainboxes', await listResponse.text());
            process.exit(1);
        }
        const listData = await listResponse.json();
        const zainboxes = listData.data;
        if (!zainboxes || zainboxes.length === 0) {
            console.error('No zainboxes found');
            process.exit(1);
        }
        const zainboxCode = '18976_uTRELctJTrx5y43i0NEp';
        console.log(`Using Zainbox Code from Error: ${zainboxCode}`);
        let url = `https://api.zainpay.ng/zainbox/accounts/balance/${zainboxCode}`;
        console.log(`Testing GET ${url}`);
        let response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        console.log(`Status 1: ${response.status} ${response.statusText}`);
        let text = await response.text();
        console.log('Body 1:', text);
        // Test with trailing newline to simulate common copy-paste error
        url = `https://api.zainpay.ng/zainbox/accounts/balance/${zainboxCode}\n`;
        console.log(`Testing GET with newline ${url.trim()}\\n`);
        response = await fetch(url.trim() + '\n', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        console.log(`Status 2 (newline): ${response.status} ${response.statusText}`);
        // Test with trailing slash
        url = `https://api.zainpay.ng/zainbox/accounts/balance/${zainboxCode}/`;
        console.log(`Testing GET with trailing slash ${url}`);
        response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        console.log(`Status 3 (slash): ${response.status} ${response.statusText}`);
    }
    catch (error) {
        console.error('Fetch Error:', error);
    }
    process.exit(0);
};
testFetch();
//# sourceMappingURL=debug-balance-405.js.map