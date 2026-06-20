"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrantService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class PayrantService {
    constructor() {
        this.baseUrl = process.env.PAYRANT_BASE_URL || 'https://api-core.payrant.com';
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PAYRANT_API_KEY}`
            },
            timeout: 30000,
            family: 4, // Force IPv4 to avoid IPv6 connection issues
        });
        this.initializeInterceptors();
    }
    initializeInterceptors() {
        this.client.interceptors.response.use((response) => {
            return response;
        }, (error) => {
            const errorData = error.response?.data || error.message;
            logger_1.logger.error(`Payrant API Error [${error.config?.url}]:`, errorData);
            return Promise.reject(error);
        });
    }
    async getBankList() {
        try {
            logger_1.logger.info('Fetching bank list from Payrant...');
            const response = await this.client.get('/payout/banks_list/');
            // logger.info(`Payrant bank list response status: ${response.status}`);
            // logger.info(`Payrant bank list data: ${JSON.stringify(response.data)}`);
            if (response.data.status === 'success' && response.data.data?.banks) {
                const banks = response.data.data.banks.map((bank) => ({
                    code: bank.bankCode,
                    name: bank.bankName,
                    bankUrl: bank.bankUrl
                }));
                logger_1.logger.info(`Successfully fetched ${banks.length} banks from Payrant`);
                return banks;
            }
            logger_1.logger.error('Payrant bank list response invalid format', response.data);
            throw new Error('Failed to fetch bank list');
        }
        catch (error) {
            logger_1.logger.error('Payrant getBankList error', error.response?.data || error.message);
            return [];
        }
    }
    /**
     * Validate Account Name
     * POST /payout/validate_account/
     */
    async resolveBankAccount(bankCode, accountNumber) {
        try {
            const response = await this.client.post('/payout/validate_account/', {
                bank_code: bankCode,
                account_number: accountNumber
            });
            if (response.data.status === 'success' && response.data.data) {
                const data = response.data.data;
                return {
                    accountName: data.account_name,
                    accountNumber: data.account_number,
                    bankCode: data.bank_code
                };
            }
            throw new Error(response.data.message || 'Account validation failed');
        }
        catch (error) {
            logger_1.logger.error('Payrant resolveBankAccount error', error);
            throw error;
        }
    }
    /**
     * Initiate Bank Transfer
     * POST /payout/transfer
     */
    async transfer(data) {
        try {
            const response = await this.client.post('/payout/transfer/', data);
            if (response.data.status === 'success' && response.data.data) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Transfer initiation failed');
        }
        catch (error) {
            logger_1.logger.error('Payrant transfer error', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Transfer failed');
        }
    }
}
exports.payrantService = new PayrantService();
exports.default = exports.payrantService;
//# sourceMappingURL=PayrantService.js.map