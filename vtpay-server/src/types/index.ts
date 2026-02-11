import { Request } from 'express';
export * from './palmpay';

// User Types
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

// Wallet Types
export interface IWallet {
    _id: string;
    userId: string;
    balance: number;
    lockedBalance: number;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
}

// Virtual Account Types
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

// Transaction Types
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

// API Request Types
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

// API Response Types
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
