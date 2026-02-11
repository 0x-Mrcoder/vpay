
import config from '../config';
import { connectDatabase } from '../config/database';
import { SystemSetting } from '../models';

const fetchKey = async () => {
    await connectDatabase();
    const settings = await SystemSetting.findOne();
    if (settings && settings.integrations && settings.integrations.zainpay) {
        console.log('KEY:' + settings.integrations.zainpay.apiKey);
    } else {
        console.log('KEY:NOT_FOUND');
    }
    process.exit(0);
};

fetchKey();
