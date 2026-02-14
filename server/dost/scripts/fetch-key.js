"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const models_1 = require("../models");
const fetchKey = async () => {
    await (0, database_1.connectDatabase)();
    const settings = await models_1.SystemSetting.findOne();
    if (settings && settings.integrations && settings.integrations.zainpay) {
        console.log('KEY:' + settings.integrations.zainpay.apiKey);
    }
    else {
        console.log('KEY:NOT_FOUND');
    }
    process.exit(0);
};
fetchKey();
//# sourceMappingURL=fetch-key.js.map