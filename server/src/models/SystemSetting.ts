import mongoose, { Schema, Document } from 'mongoose';

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
    integrations: {
        // PalmPay integration will be added here
    };
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

const SystemSettingSchema = new Schema<ISystemSettingDocument>(
    {
        general: {
            companyName: { type: String, default: 'VTStack Systems' },
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
    },
    {
        timestamps: true,
    }
);

// Prevent OverwriteModelError
export const SystemSetting = mongoose.models.SystemSetting || mongoose.model<ISystemSettingDocument>('SystemSetting', SystemSettingSchema);
export default SystemSetting;
