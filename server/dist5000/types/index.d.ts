import { Request } from 'express';
export * from './palmpay';
export interface IUser {
    _id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone: string;
    bvn?: string;
    kycLevel: number;
    status: 'active' | 'suspended' | 'pending';
    createdAt: Date;
    updatedAt: Date;
}
export interface IWallet {
    _id: string;
    userId: string;
    balance: number;
    lockedBalance: number;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IVirtualAccount {
    _id: string;
    userId: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankType: string;
    status: 'active' | 'inactive';
    createdAt: Date;
}
export interface ITransaction {
    _id: string;
    walletId: string;
    userId: string;
    type: 'credit' | 'debit';
    category: 'deposit' | 'transfer' | 'withdrawal' | 'refund';
    amount: number;
    fee: number;
    balanceBefore: number;
    balanceAfter: number;
    reference: string;
    externalRef?: string;
    narration: string;
    status: 'pending' | 'success' | 'failed';
    metadata?: Record<string, any>;
    createdAt: Date;
}
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map