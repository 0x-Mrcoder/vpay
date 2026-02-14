import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import config from '../config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
    PalmPayResponse,
    CreateVirtualAccountRequest,
    VirtualAccountData,
    TransferRequest,
    BankLookupRequest,
    BankLookupResponse
} from '../types/palmpay';

export class PalmPayService {
    private client: AxiosInstance;
    private baseUrl: string;
    private privateKey: string = '';

    constructor(client?: AxiosInstance) {
        // Default to sandbox if not set
        this.baseUrl = process.env.PALMPAY_BASE_URL || 'https://sandbox.palmpay.com/v2';
        this.loadPrivateKey();

        if (client) {
            this.client = client;
        } else {
            this.client = axios.create({
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

    private loadPrivateKey() {
        try {
            const keyPath = process.env.PALMPAY_PRIVATE_KEY;
            if (keyPath) {
                if (fs.existsSync(keyPath)) {
                    this.privateKey = fs.readFileSync(keyPath, 'utf8');
                } else {
                    // Assume it's the key content itself if valid pem
                    if (keyPath.includes('BEGIN RSA PRIVATE KEY') || keyPath.includes('BEGIN PRIVATE KEY')) {
                        this.privateKey = keyPath;
                    } else {
                        logger.warn('PalmPay private key path not found and not a key content');
                    }
                }
            }
        } catch (error) {
            logger.error('Failed to load PalmPay private key', error);
        }
    }

    private generateSignature(data: any): string {
        try {
            if (!this.privateKey) return '';

            // Normalize payload: usually stringify sorted keys or raw JSON
            // PalmPay typically expects the raw request body string
            const payload = JSON.stringify(data);

            const sign = crypto.createSign('SHA256');
            sign.update(payload);
            sign.end();
            return sign.sign(this.privateKey, 'base64');
        } catch (error) {
            logger.error('Signature generation failed', error);
            return '';
        }
    }

    private initializeInterceptors() {
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
        this.client.interceptors.response.use(
            (response) => {
                logger.debug(`PalmPay API Response [${response.config.url}]:`, response.data);
                return response;
            },
            (error) => {
                const errorData = error.response?.data || error.message;
                logger.error(`PalmPay API Error [${error.config?.url}]:`, errorData);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Create a Virtual Account
     */
    async createVirtualAccount(data: CreateVirtualAccountRequest): Promise<VirtualAccountData> {
        try {
            logger.info('Creating PalmPay Virtual Account', { ...data, bvn: '***' });

            const response = await this.client.post<PalmPayResponse<VirtualAccountData>>('/virtual-account/create', data);

            if (response.data.respCode !== '00') {
                throw new Error(response.data.respMsg || 'Failed to create virtual account');
            }

            return response.data.data!;
        } catch (error) {
            logger.error('Failed to create virtual account', error);
            throw error;
        }
    }

    /**
     * Verify Bank Account (Name Enquiry)
     */
    async resolveBankAccount(data: BankLookupRequest): Promise<BankLookupResponse> {
        try {
            logger.info(`Resolving bank account: ${data.accountNumber} (${data.bankCode})`);

            const response = await this.client.post<PalmPayResponse<BankLookupResponse>>('/bank/resolve', data);

            if (response.data.respCode !== '00') {
                throw new Error(response.data.respMsg || 'Bank resolution failed');
            }

            return response.data.data!;
        } catch (error) {
            logger.error('Failed to resolve bank account', error);
            throw error;
        }
    }

    /**
     * Initiate Transfer
     */
    async initiateTransfer(data: TransferRequest): Promise<any> {
        try {
            logger.info(`Initiating transfer: ${data.amount} to ${data.beneficiary.accountNumber}`);

            const response = await this.client.post<PalmPayResponse>('/transfer/bank', data);

            if (response.data.respCode !== '00') {
                throw new Error(response.data.respMsg || 'Transfer initiation failed');
            }

            return response.data.data;
        } catch (error) {
            logger.error('Failed to initiate transfer', error);
            throw error;
        }
    }

    /**
     * Get Bank List
     */
    async getBankList(): Promise<Array<{ code: string; name: string }>> {
        try {
            // Example endpoint, might be different
            const response = await this.client.get<PalmPayResponse<Array<{ code: string; name: string }>>>('/bank/list');

            if (response.data.respCode !== '00') {
                // Fallback to static list if API fails
                logger.warn('Failed to fetch bank list from PalmPay, using fallback');
                return this.getFallbackBankList();
            }
            return response.data.data || [];
        } catch (error) {
            logger.error('Failed to get bank list', error);
            return this.getFallbackBankList();
        }
    }

    private getFallbackBankList() {
        return [
            { code: "044", name: "Access Bank" },
            { code: "058", name: "Guaranty Trust Bank" },
            { code: "033", name: "United Bank for Africa" },
            { code: "057", name: "Zenith Bank" },
            { code: "999998", name: "PalmPay" }
        ];
    }
}

export const palmPayService = new PalmPayService();
export default palmPayService;
