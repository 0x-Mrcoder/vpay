"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const models_1 = require("../models");
const database_1 = require("../config/database");
dotenv_1.default.config();
const creditWallet = async () => {
    try {
        await (0, database_1.connectDatabase)();
        const email = 'u@gmail.com';
        const amountNaira = 100000;
        const amountKobo = amountNaira * 100;
        const user = await models_1.User.findOne({ email });
        if (!user) {
            console.error(`User not found: ${email}`);
            process.exit(1);
        }
        const wallet = await models_1.Wallet.findOne({ userId: user._id });
        if (!wallet) {
            console.error(`Wallet not found for user: ${email}`);
            process.exit(1);
        }
        console.log(`Current Balance: ₦${wallet.balance / 100}`);
        console.log(`Current Cleared: ₦${wallet.clearedBalance / 100}`);
        wallet.balance += amountKobo;
        wallet.clearedBalance += amountKobo;
        await wallet.save();
        console.log('-----------------------------------');
        console.log(`Successfully credited ₦${amountNaira}`);
        console.log(`New Balance: ₦${wallet.balance / 100}`);
        console.log(`New Cleared: ₦${wallet.clearedBalance / 100}`);
        process.exit(0);
    }
    catch (error) {
        console.error('Error crediting wallet:', error);
        process.exit(1);
    }
};
creditWallet();
//# sourceMappingURL=credit-wallet.js.map