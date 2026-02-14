import mongoose, { Document } from 'mongoose';
export interface ISystemSettingDocument extends Document {
    general: {
        companyName: string;
        supportEmail: string;
        timezone: string;
        currency: string;
        maintenanceMode: boolean;
    };
    notifications: {
        emailAlerts: boolean;
        slackIntegration: boolean;
        webhookRetries: number;
        dailyReports: boolean;
    };
    security: {
        twoFactorAuth: boolean;
        sessionTimeout: number;
        passwordExpiry: number;
        ipWhitelist: string;
    };
    integrations: {};
    parentAccount: {
        accountName: string;
        accountNumber: string;
        bankCode: string;
        type: 'PRIMARY' | 'SECONDARY';
        status: 'ACTIVE' | 'INACTIVE';
    };
    globalSettlement: {
        status: boolean;
        weekendSettlementEnabled: boolean;
        scheduleType: 'T1' | 'T7' | 'T30';
        schedulePeriod: string;
        settlementAccounts: Array<{
            accountName: string;
            accountNumber: string;
            bankCode: string;
            percentage: string;
        }>;
    };
    emailConfig: {
        provider: 'gmail' | 'other';
        gmail: {
            user: string;
            pass: string;
        };
        smtp: {
            host: string;
            port: number;
            secure: boolean;
            user: string;
            pass: string;
        };
    };
    payout: {
        minAmount: number;
        vtpayFeePercent: number;
        bankSettlementFee: number;
        bankSettlementThreshold: number;
    };
    deposit: {
        vtpayFeePercent: number;
    };
    updatedAt: Date;
}
export declare const SystemSetting: mongoose.Model<any, {}, {}, {}, any, any>;
export default SystemSetting;
//# sourceMappingURL=SystemSetting.d.ts.map