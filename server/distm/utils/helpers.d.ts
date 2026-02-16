/**
 * Generate a unique transaction reference
 */
export declare const generateTxnRef: (prefix?: string) => string;
/**
 * Convert Naira to Kobo
 */
export declare const nairaToKobo: (naira: number) => number;
/**
 * Convert Kobo to Naira
 */
export declare const koboToNaira: (kobo: number) => number;
/**
 * Format amount in Naira
 */
export declare const formatNaira: (kobo: number) => string;
/**
 * Validate Nigerian phone number
 */
export declare const isValidNigerianPhone: (phone: string) => boolean;
/**
 * Format phone number to international format
 */
export declare const formatPhoneNumber: (phone: string) => string;
/**
 * Validate BVN (Bank Verification Number)
 */
export declare const isValidBVN: (bvn: string) => boolean;
/**
 * Validate email
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Mask account number (show last 4 digits)
 */
export declare const maskAccountNumber: (accountNumber: string) => string;
/**
 * Generate a random string
 */
export declare const generateRandomString: (length?: number) => string;
/**
 * Sleep for specified milliseconds
 */
export declare const sleep: (ms: number) => Promise<void>;
/**
 * Retry a function with exponential backoff
 */
export declare const retryWithBackoff: <T>(fn: () => Promise<T>, maxRetries?: number, baseDelayMs?: number) => Promise<T>;
//# sourceMappingURL=helpers.d.ts.map