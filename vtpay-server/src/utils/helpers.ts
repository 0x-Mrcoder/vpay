import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique transaction reference
 */
export const generateTxnRef = (prefix: string = 'TXN'): string => {
    const timestamp = Date.now();
    const uuid = uuidv4().replace(/-/g, '').slice(0, 12);
    return `${prefix}-${timestamp}-${uuid}`.toUpperCase();
};

/**
 * Convert Naira to Kobo
 */
export const nairaToKobo = (naira: number): number => {
    return Math.round(naira * 100);
};

/**
 * Convert Kobo to Naira
 */
export const koboToNaira = (kobo: number): number => {
    return kobo / 100;
};

/**
 * Format amount in Naira
 */
export const formatNaira = (kobo: number): string => {
    const naira = koboToNaira(kobo);
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
    }).format(naira);
};

/**
 * Validate Nigerian phone number
 */
export const isValidNigerianPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    // Nigerian phone numbers: 234XXXXXXXXXX or 0XXXXXXXXXX
    return /^(234|0)[789][01]\d{8}$/.test(cleaned);
};

/**
 * Format phone number to international format
 */
export const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        return '234' + cleaned.slice(1);
    }
    if (cleaned.startsWith('234')) {
        return cleaned;
    }
    return cleaned;
};

/**
 * Validate BVN (Bank Verification Number)
 */
export const isValidBVN = (bvn: string): boolean => {
    const cleaned = bvn.replace(/\D/g, '');
    return /^\d{11}$/.test(cleaned);
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Mask account number (show last 4 digits)
 */
export const maskAccountNumber = (accountNumber: string): string => {
    if (accountNumber.length <= 4) return accountNumber;
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
};

/**
 * Generate a random string
 */
export const generateRandomString = (length: number = 16): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
): Promise<T> => {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < maxRetries - 1) {
                const delay = baseDelayMs * Math.pow(2, i);
                console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    throw lastError;
};
