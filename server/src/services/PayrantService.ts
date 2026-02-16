import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface PayrantBank {
    bankCode: string;
    bankName: string;
    bankUrl?: string; // Payrant returns 'bankUrl' and 'bgUrl'
    bgUrl?: string;
}

export interface PayrantResolveResponse {
    account_number: string;
    account_name: string;
    bank_code: string;
    verified: boolean;
}

export interface PayrantTransferRequest {
    bank_code: string;
    account_number: string;
    account_name: string;
    amount: number; // in Naira
    description?: string;
    notify_url?: string;
}

export interface PayrantTransferResponse {
    transfer_id: number;
    reference: string;
    order_no: string;
    amount: number;
    fee: number;
    total_debit: number;
    bank_name: string;
    account_name: string;
    account_number: string;
    status: string;
    estimated_completion: string;
    webhook_url: string;
}

class PayrantService {
    private client: AxiosInstance;
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.PAYRANT_BASE_URL || 'https://api-core.payrant.com';

        this.client = axios.create({
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

    private initializeInterceptors() {
        this.client.interceptors.response.use(
            (response) => {
                return response;
            },
            (error) => {
                const errorData = error.response?.data || error.message;
                logger.error(`Payrant API Error [${error.config?.url}]:`, errorData);
                return Promise.reject(error);
            }
        );
    }

    async getBankList(): Promise<Array<{ code: string; name: string; bankUrl?: string }>> {
        try {
            logger.info('Fetching bank list from Payrant...');
            const response = await this.client.get('/payout/banks_list/');

            // logger.info(`Payrant bank list response status: ${response.status}`);
            // logger.info(`Payrant bank list data: ${JSON.stringify(response.data)}`);

            if (response.data.status === 'success' && response.data.data?.banks) {
                const banks = response.data.data.banks.map((bank: PayrantBank) => ({
                    code: bank.bankCode,
                    name: bank.bankName,
                    bankUrl: bank.bankUrl
                }));
                logger.info(`Successfully fetched ${banks.length} banks from Payrant`);
                return banks;
            }

            logger.error('Payrant bank list response invalid format', response.data);
            throw new Error('Failed to fetch bank list');
        } catch (error: any) {
            logger.error('Payrant getBankList error', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Validate Account Name
     * POST /payout/validate_account/
     */
    async resolveBankAccount(bankCode: string, accountNumber: string): Promise<{ accountName: string; accountNumber: string; bankCode: string }> {
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
        } catch (error) {
            logger.error('Payrant resolveBankAccount error', error);
            throw error;
        }
    }

    /**
     * Initiate Bank Transfer
     * POST /payout/transfer
     */
    async transfer(data: PayrantTransferRequest): Promise<PayrantTransferResponse> {
        try {
            const response = await this.client.post('/payout/transfer/', data);

            if (response.data.status === 'success' && response.data.data) {
                return response.data.data;
            }

            throw new Error(response.data.message || 'Transfer initiation failed');
        } catch (error: any) {
            logger.error('Payrant transfer error', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Transfer failed');
        }
    }
}

export const payrantService = new PayrantService();
export default payrantService;
