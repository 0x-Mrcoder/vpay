import mongoose, { Document } from 'mongoose';
export interface IUserDocument extends Document {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    bvn?: string;
    nin?: string;
    identityType?: string;
    idCardPath?: string;
    selfiePath?: string;
    utilityBillPath?: string;
    state?: string;
    lga?: string;
    address?: string;
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    rcNumber?: string;
    cacDocumentPath?: string;
    verificationToken?: string;
    isPayoutEnabled: boolean;
    payoutRequestStatus: 'none' | 'pending' | 'approved' | 'rejected';
    payoutRequestReason?: string;
    payoutSecretKeyHash?: string;
    payoutIpWhitelist?: string[];
    payoutDailyLimit: number;
    payoutHourlyLimit: number;
    apiKey?: string;
    webhookUrl?: string;
    webhookActive: boolean;
    profilePicture?: string;
    kycLevel: number;
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
export declare const User: mongoose.Model<IUserDocument, {}, {}, {}, mongoose.Document<unknown, {}, IUserDocument, {}, {}> & IUserDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default User;
//# sourceMappingURL=User.d.ts.map