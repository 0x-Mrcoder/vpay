"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemSetting = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SystemSettingSchema = new mongoose_1.Schema({
    general: {
        companyName: { type: String, default: 'VTPay Systems' },
        supportEmail: { type: String, default: 'support@vtpay.com' },
        timezone: { type: String, default: 'Africa/Lagos' },
        currency: { type: String, default: 'NGN' },
        maintenanceMode: { type: Boolean, default: false },
    },
    notifications: {
        emailAlerts: { type: Boolean, default: true },
        slackIntegration: { type: Boolean, default: false },
        webhookRetries: { type: Number, default: 3 },
        dailyReports: { type: Boolean, default: true },
    },
    security: {
        twoFactorAuth: { type: Boolean, default: false },
        sessionTimeout: { type: Number, default: 30 },
        passwordExpiry: { type: Number, default: 90 },
        ipWhitelist: { type: String, default: '' },
    },
    integrations: {
    // PalmPay integration will be added here in Phase 2
    },
    parentAccount: {
        accountName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        bankCode: { type: String, default: '' },
        type: { type: String, enum: ['PRIMARY', 'SECONDARY'], default: 'PRIMARY' },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    },
    globalSettlement: {
        status: { type: Boolean, default: false },
        weekendSettlementEnabled: { type: Boolean, default: true },
        scheduleType: { type: String, enum: ['T1', 'T7', 'T30'], default: 'T1' },
        schedulePeriod: { type: String, default: 'Daily' },
        settlementAccounts: [
            {
                accountName: String,
                accountNumber: String,
                bankCode: String,
                percentage: String,
            }
        ]
    },
    emailConfig: {
        provider: { type: String, enum: ['gmail', 'other'], default: 'gmail' },
        gmail: {
            user: { type: String, default: '' },
            pass: { type: String, default: '' },
        },
        smtp: {
            host: { type: String, default: '' },
            port: { type: Number, default: 587 },
            secure: { type: Boolean, default: false },
            user: { type: String, default: '' },
            pass: { type: String, default: '' },
        },
    },
    payout: {
        minAmount: { type: Number, default: 10000 }, // 100 Naira
        vtpayFeePercent: { type: Number, default: 0.6 },
        bankSettlementFee: { type: Number, default: 2500 }, // 25 Naira
        bankSettlementThreshold: { type: Number, default: 0 },
    },
    deposit: {
        vtpayFeePercent: { type: Number, default: 2.0 }, // Default 2% total fee
    },
}, {
    timestamps: true,
});
// Prevent OverwriteModelError
exports.SystemSetting = mongoose_1.default.models.SystemSetting || mongoose_1.default.model('SystemSetting', SystemSettingSchema);
exports.default = exports.SystemSetting;
//# sourceMappingURL=SystemSetting.js.map