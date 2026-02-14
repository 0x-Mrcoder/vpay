import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    fullName: string; // Added for combined name
    phone: string;
    // KYC Fields
    bvn?: string;
    nin?: string;
    identityType?: string; // e.g., 'nin', 'voter', 'passport'
    idCardPath?: string;
    selfiePath?: string;
    state?: string;
    lga?: string;
    address?: string;
    // Business Upgrade Fields
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    rcNumber?: string;
    cacDocumentPath?: string;
    // System Fields
    verificationToken?: string; // Added for email verification
    apiKey?: string;
    webhookUrl?: string; // Webhook URL for payment notifications
    kycLevel: number; // 0: Registered, 1: Verified, 2: Submitted, 3: Approved
    kyc_status: 'pending' | 'verified' | 'rejected';
    role: 'user' | 'admin';
    status: 'active' | 'suspended' | 'pending';
    savedBankDetails?: {
        bankCode: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
    };
    payoutAccounts?: Array<{
        id: string;
        bankCode: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
        isPrimary?: boolean;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        fullName: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        // KYC Fields
        bvn: {
            type: String,
            trim: true,
        },
        nin: {
            type: String,
            trim: true,
        },
        identityType: {
            type: String,
            trim: true,
        },
        idCardPath: {
            type: String,
        },
        selfiePath: {
            type: String,
        },
        state: {
            type: String,
            trim: true,
        },
        lga: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        // Business Fields
        businessName: {
            type: String,
            trim: true,
        },
        businessAddress: {
            type: String,
            trim: true,
        },
        businessPhone: {
            type: String,
            trim: true,
        },
        rcNumber: {
            type: String,
            trim: true,
        },
        cacDocumentPath: {
            type: String,
        },
        verificationToken: {
            type: String,
        },
        apiKey: {
            type: String,
            unique: true,
            sparse: true,
        },
        webhookUrl: {
            type: String,
            trim: true,
        },
        kycLevel: {
            type: Number,
            default: 0,
            min: 0,
            max: 3,
        },
        kyc_status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending',
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'pending'],
            default: 'pending',
        },
        savedBankDetails: {
            bankCode: String,
            bankName: String,
            accountNumber: String,
            accountName: String,
        },
        payoutAccounts: [
            {
                bankCode: String,
                bankName: String,
                accountNumber: String,
                accountName: String,
                isPrimary: { type: Boolean, default: false },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Index for faster queries (email index is implicit from unique: true)
UserSchema.index({ phone: 1 });
UserSchema.index({ verificationToken: 1 });

export const User = mongoose.model<IUserDocument>('User', UserSchema);
export default User;
