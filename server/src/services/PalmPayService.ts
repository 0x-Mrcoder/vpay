import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import config from '../config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
    PalmPayResponse,
    CreateVirtualAccountRequest,
    CreateVirtualAccountRequestV2,
    VirtualAccountData,
    VirtualAccountDataV2,
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
            const keyContent = config.palmpay.privateKey;
            if (keyContent) {
                // Check if it's a path or the key itself
                if (fs.existsSync(keyContent)) {
                    this.privateKey = fs.readFileSync(keyContent, 'utf8');
                } else {
                    // Normalize the key format if it's the content
                    let formattedKey = keyContent.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
                    if (!formattedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
                        formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
                    }
                    this.privateKey = formattedKey;
                }
            }
        } catch (error) {
            logger.error('Failed to load PalmPay private key', error);
        }
    }

    private generateSignatureV2(data: any): string {
        try {
            if (!this.privateKey) {
                logger.error('PalmPay private key not loaded');
                return '';
            }

            // 1. Filter parameters to be hashed
            const filteredParams: Record<string, any> = {};
            const keys = Object.keys(data).sort();

            for (const key of keys) {
                if (data[key] !== undefined && data[key] !== null && data[key] !== '' && key !== 'signature') {
                    if (typeof data[key] !== 'object') {
                        filteredParams[key] = data[key];
                    }
                }
            }

            // 2. Concatenate parameters: key=value&key=value (Sorted)
            const strA = Object.keys(filteredParams)
                .map(key => `${key}=${filteredParams[key]}`)
                .join('&');

            logger.debug(`String to MD5: "${strA}"`);

            // 3. MD5 Hash and Uppercase
            const md5Hash = crypto.createHash('md5').update(strA).digest('hex').toUpperCase();

            logger.debug(`MD5 Hash (Uppercase): "${md5Hash}"`);

            // 4. Sign the MD5 hash using RSA-SHA1 (SHA1withRSA)
            const sign = crypto.createSign('RSA-SHA1');
            sign.update(md5Hash);
            const signature = sign.sign(this.privateKey, 'base64');

            logger.debug(`Generated Signature: ${signature}`);
            return signature;
        } catch (error) {
            logger.error('V2 Signature generation failed', error);
            return '';
        }
    }

    private initializeInterceptors() {
        // Request interceptor for signing
        this.client.interceptors.request.use(async (config) => {
            if (config.data) {
                const appId = process.env.PALMPAY_APP_ID;
                const merchantId = process.env.PALMPAY_MERCHANT_ID;

                // Headers required by PalmPay V2.0
                config.headers['countryCode'] = 'NG';
                config.headers['Authorization'] = `Bearer ${appId}`;
                config.headers['AppId'] = appId;
                config.headers['Merchant-Code'] = merchantId; // Try Merchant-Code
                config.headers['Merchant-Id'] = merchantId;   // Try Merchant-Id just in case
                config.headers['Content-Type'] = 'application/json;charset=UTF-8';
                config.headers['Accept'] = 'application/json';

                // New V2 Signature logic
                const signature = this.generateSignatureV2(config.data);
                if (signature) {
                    config.headers['Signature'] = signature;
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
     * Create a Static Virtual Account (Alias for V2.0)
     */
    async createVirtualAccount(data: any): Promise<VirtualAccountDataV2> {
        return this.createVirtualAccountV2(data);
    }

    /**
     * Create a Static Virtual Account (V2.0 API)
     */
    async createVirtualAccountV2(data: any): Promise<VirtualAccountDataV2> {
        try {
            const payload: CreateVirtualAccountRequestV2 = {
                requestTime: Date.now(),
                identityType: data.identityType || 'individual',
                licenseNumber: data.licenseNumber,
                virtualAccountName: data.accountName,
                version: 'V2.0',
                customerName: data.customerName,
                email: data.email,
                nonceStr: crypto.randomBytes(16).toString('hex')
            };

            logger.info('Creating PalmPay Virtual Account V2.0', { ...payload, licenseNumber: '***' });

            const response = await this.client.post<PalmPayResponse<VirtualAccountDataV2>>('/virtual/account/label/create', payload);

            if (response.data.respCode !== '00000000') {
                throw new Error(response.data.respMsg || 'Failed to create virtual account V2.0');
            }

            return response.data.data!;
        } catch (error) {
            logger.error('Failed to create virtual account V2.0', error);
            throw error;
        }
    }

    /**
     * Verify Bank Account (Name Enquiry)
     */
    async resolveBankAccount(data: BankLookupRequest): Promise<BankLookupResponse> {
        try {
            logger.info(`Resolving bank account: ${data.accountNumber} (${data.bankCode})`);

            if (data.bankCode === "100033") {
                // Query PalmPay Account
                const payload = {
                    requestTime: Date.now(),
                    version: "V1.1",
                    nonceStr: crypto.randomBytes(16).toString('hex'),
                    palmpayAccNo: data.accountNumber
                };
                const response = await this.client.post<PalmPayResponse>('/payment/merchant/payout/queryAccount', payload);

                if (response.data.respCode !== '00000000') {
                    throw new Error(response.data.respMsg || 'Bank resolution failed');
                }
                const responseData = response.data.data;
                if (responseData.accountStatus !== 0) {
                    throw new Error('PalmPay account is unavailable');
                }
                return {
                    accountName: responseData.accountName || 'Unknown',
                    accountNumber: data.accountNumber,
                    bankCode: data.bankCode
                };
            } else {
                // Query Bank Account
                const payload = {
                    requestTime: Date.now(),
                    version: "V1.1",
                    nonceStr: crypto.randomBytes(16).toString('hex'),
                    bankCode: data.bankCode,
                    bankAccNo: data.accountNumber
                };
                const response = await this.client.post<PalmPayResponse>('/payment/merchant/payout/queryBankAccount', payload);

                if (response.data.respCode !== '00000000') {
                    throw new Error(response.data.respMsg || 'Bank resolution failed');
                }
                const responseData: any = response.data.data;
                if (!responseData) throw new Error('Bank resolution failed');
                
                // Note: The status could be "Success" or something else based on documentation
                const statusStr = (responseData.Status || responseData.status || '').toLowerCase();
                if (statusStr !== 'success' && statusStr !== '0') {
                    throw new Error(responseData.errorMessage || 'Bank resolution failed');
                }
                return {
                    accountName: responseData.accountName || responseData.accountname || 'Unknown',
                    accountNumber: data.accountNumber,
                    bankCode: data.bankCode
                };
            }
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

            const payload = {
                requestTime: Date.now(),
                version: "V1.1",
                nonceStr: crypto.randomBytes(16).toString('hex'),
                orderId: data.transactionReference,
                payeeName: data.beneficiary.accountName,
                payeeBankCode: data.beneficiary.bankCode,
                payeeBankAccNo: data.beneficiary.accountNumber,
                amount: data.amount, // amount is in minimum unit (kobo)
                currency: "NGN",
                notifyUrl: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/palmpay/payout`, // Must coordinate with webhook router
                remark: data.description || "Payout"
            };

            const response = await this.client.post<PalmPayResponse>('/merchant/payment/payout', payload);

            if (response.data.respCode !== '00000000') {
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
            const payload = {
                requestTime: Date.now(),
                version: "V1.1",
                nonceStr: crypto.randomBytes(16).toString('hex'),
                businessType: 0
            };
            const response = await this.client.post<PalmPayResponse>('/general/merchant/queryBankList', payload);

            if (response.data.respCode !== '00000000') {
                logger.warn('Failed to fetch bank list from PalmPay, using fallback');
                return this.getFallbackBankList();
            }
            const dataObj = response.data.data;
            if (Array.isArray(dataObj)) {
                return dataObj.map((b: any) => ({ code: b.bankCode, name: b.bankName }));
            } else if (dataObj) {
                // If it's a single object
                return [{ code: (dataObj as any).bankCode, name: (dataObj as any).bankName }];
            }
            return this.getFallbackBankList();

        } catch (error) {
            logger.error('Failed to get bank list', error);
            return this.getFallbackBankList();
        }
    }

    private getFallbackBankList() {
        return [
            { code: "100033", name: "PalmPay" },
            { code: "044", name: "Access Bank" },
            { code: "058", name: "Guaranty Trust Bank" },
            { code: "033", name: "United Bank for Africa" },
            { code: "057", name: "Zenith Bank" }
        ];
    }
}

export const palmPayService = new PalmPayService();
export default palmPayService;
