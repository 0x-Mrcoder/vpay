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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.palmPayService = exports.PalmPayService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
class PalmPayService {
    constructor(client) {
        this.privateKey = '';
        // Default to sandbox if not set
        this.baseUrl = process.env.PALMPAY_BASE_URL || 'https://sandbox.palmpay.com/v2';
        this.loadPrivateKey();
        if (client) {
            this.client = client;
        }
        else {
            this.client = axios_1.default.create({
                baseURL: this.baseUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.PALMPAY_API_KEY}`
                },
                timeout: 30000,
            });
            this.initializeInterceptors();
        }
    }
    loadPrivateKey() {
        try {
            const keyPath = process.env.PALMPAY_PRIVATE_KEY;
            if (keyPath) {
                if (fs.existsSync(keyPath)) {
                    this.privateKey = fs.readFileSync(keyPath, 'utf8');
                }
                else {
                    // Assume it's the key content itself if valid pem
                    if (keyPath.includes('BEGIN RSA PRIVATE KEY') || keyPath.includes('BEGIN PRIVATE KEY')) {
                        this.privateKey = keyPath;
                    }
                    else {
                        logger_1.logger.warn('PalmPay private key path not found and not a key content');
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to load PalmPay private key', error);
        }
    }
    generateSignature(data) {
        try {
            if (!this.privateKey)
                return '';
            // Normalize payload: usually stringify sorted keys or raw JSON
            // PalmPay typically expects the raw request body string
            const payload = JSON.stringify(data);
            const sign = crypto.createSign('SHA256');
            sign.update(payload);
            sign.end();
            return sign.sign(this.privateKey, 'base64');
        }
        catch (error) {
            logger_1.logger.error('Signature generation failed', error);
            return '';
        }
    }
    initializeInterceptors() {
        // Request interceptor for signing
        this.client.interceptors.request.use(async (config) => {
            if (config.data) {
                const signature = this.generateSignature(config.data);
                if (signature) {
                    config.headers['X-PalmPay-Signature'] = signature;
                    config.headers['X-PalmPay-Version'] = '1.0'; // Example header
                }
            }
            return config;
        });
        // Response interceptor for logging
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug(`PalmPay API Response [${response.config.url}]:`, response.data);
            return response;
        }, (error) => {
            const errorData = error.response?.data || error.message;
            logger_1.logger.error(`PalmPay API Error [${error.config?.url}]:`, errorData);
            return Promise.reject(error);
        });
    }
    /**
     * Create a Virtual Account
     */
    async createVirtualAccount(data) {
        try {
            logger_1.logger.info('Creating PalmPay Virtual Account', { ...data, bvn: '***' });
            const response = await this.client.post('/virtual-account/create', data);
            if (response.data.respCode !== '00') {
                throw new Error(response.data.respMsg || 'Failed to create virtual account');
            }
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to create virtual account', error);
            throw error;
        }
    }
    /**
     * Verify Bank Account (Name Enquiry)
     */
    async resolveBankAccount(data) {
        try {
            logger_1.logger.info(`Resolving bank account: ${data.accountNumber} (${data.bankCode})`);
            const response = await this.client.post('/bank/resolve', data);
            if (response.data.respCode !== '00') {
                throw new Error(response.data.respMsg || 'Bank resolution failed');
            }
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to resolve bank account', error);
            throw error;
        }
    }
    /**
     * Initiate Transfer
     */
    async initiateTransfer(data) {
        try {
            logger_1.logger.info(`Initiating transfer: ${data.amount} to ${data.beneficiary.accountNumber}`);
            const response = await this.client.post('/transfer/bank', data);
            if (response.data.respCode !== '00') {
                throw new Error(response.data.respMsg || 'Transfer initiation failed');
            }
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to initiate transfer', error);
            throw error;
        }
    }
    /**
     * Get Bank List
     */
    async getBankList() {
        try {
            // Example endpoint, might be different
            const response = await this.client.get('/bank/list');
            if (response.data.respCode !== '00') {
                // Fallback to static list if API fails
                logger_1.logger.warn('Failed to fetch bank list from PalmPay, using fallback');
                return this.getFallbackBankList();
            }
            return response.data.data || [];
        }
        catch (error) {
            logger_1.logger.error('Failed to get bank list', error);
            return this.getFallbackBankList();
        }
    }
    getFallbackBankList() {
        return [
            { code: "044", name: "Access Bank" },
            { code: "058", name: "Guaranty Trust Bank" },
            { code: "033", name: "United Bank for Africa" },
            { code: "057", name: "Zenith Bank" },
            { code: "999998", name: "PalmPay" }
        ];
    }
}
exports.PalmPayService = PalmPayService;
exports.palmPayService = new PalmPayService();
exports.default = exports.palmPayService;
//# sourceMappingURL=PalmPayService.js.map