"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = exports.sleep = exports.generateRandomString = exports.maskAccountNumber = exports.isValidEmail = exports.isValidBVN = exports.formatPhoneNumber = exports.isValidNigerianPhone = exports.formatNaira = exports.koboToNaira = exports.nairaToKobo = exports.generateTxnRef = void 0;
const uuid_1 = require("uuid");
/**
 * Generate a unique transaction reference
 */
const generateTxnRef = (prefix = 'TXN') => {
    const timestamp = Date.now();
    const uuid = (0, uuid_1.v4)().replace(/-/g, '').slice(0, 12);
    return `${prefix}-${timestamp}-${uuid}`.toUpperCase();
};
exports.generateTxnRef = generateTxnRef;
/**
 * Convert Naira to Kobo
 */
const nairaToKobo = (naira) => {
    return Math.round(naira * 100);
};
exports.nairaToKobo = nairaToKobo;
/**
 * Convert Kobo to Naira
 */
const koboToNaira = (kobo) => {
    return kobo / 100;
};
exports.koboToNaira = koboToNaira;
/**
 * Format amount in Naira
 */
const formatNaira = (kobo) => {
    const naira = (0, exports.koboToNaira)(kobo);
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
    }).format(naira);
};
exports.formatNaira = formatNaira;
/**
 * Validate Nigerian phone number
 */
const isValidNigerianPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    // Nigerian phone numbers: 234XXXXXXXXXX or 0XXXXXXXXXX
    return /^(234|0)[789][01]\d{8}$/.test(cleaned);
};
exports.isValidNigerianPhone = isValidNigerianPhone;
/**
 * Format phone number to international format
 */
const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        return '234' + cleaned.slice(1);
    }
    if (cleaned.startsWith('234')) {
        return cleaned;
    }
    return cleaned;
};
exports.formatPhoneNumber = formatPhoneNumber;
/**
 * Validate BVN (Bank Verification Number)
 */
const isValidBVN = (bvn) => {
    const cleaned = bvn.replace(/\D/g, '');
    return /^\d{11}$/.test(cleaned);
};
exports.isValidBVN = isValidBVN;
/**
 * Validate email
 */
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
exports.isValidEmail = isValidEmail;
/**
 * Mask account number (show last 4 digits)
 */
const maskAccountNumber = (accountNumber) => {
    if (accountNumber.length <= 4)
        return accountNumber;
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
};
exports.maskAccountNumber = maskAccountNumber;
/**
 * Generate a random string
 */
const generateRandomString = (length = 16) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.generateRandomString = generateRandomString;
/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
/**
 * Retry a function with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelayMs = 1000) => {
    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const delay = baseDelayMs * Math.pow(2, i);
                console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
                await (0, exports.sleep)(delay);
            }
        }
    }
    throw lastError;
};
exports.retryWithBackoff = retryWithBackoff;
//# sourceMappingURL=helpers.js.map