export interface PayrantBank {
    bankCode: string;
    bankName: string;
    bankUrl?: string;
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
    amount: number;
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
declare class PayrantService {
    private client;
    private baseUrl;
    constructor();
    private initializeInterceptors;
    getBankList(): Promise<Array<{
        code: string;
        name: string;
        bankUrl?: string;
    }>>;
    /**
     * Validate Account Name
     * POST /payout/validate_account/
     */
    resolveBankAccount(bankCode: string, accountNumber: string): Promise<{
        accountName: string;
        accountNumber: string;
        bankCode: string;
    }>;
    /**
     * Initiate Bank Transfer
     * POST /payout/transfer
     */
    transfer(data: PayrantTransferRequest): Promise<PayrantTransferResponse>;
}
export declare const payrantService: PayrantService;
export default payrantService;
//# sourceMappingURL=PayrantService.d.ts.map