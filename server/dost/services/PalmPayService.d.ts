import { AxiosInstance } from 'axios';
import { CreateVirtualAccountRequest, VirtualAccountData, TransferRequest, BankLookupRequest, BankLookupResponse } from '../types/palmpay';
export declare class PalmPayService {
    private client;
    private baseUrl;
    private privateKey;
    constructor(client?: AxiosInstance);
    private loadPrivateKey;
    private generateSignature;
    private initializeInterceptors;
    /**
     * Create a Virtual Account
     */
    createVirtualAccount(data: CreateVirtualAccountRequest): Promise<VirtualAccountData>;
    /**
     * Verify Bank Account (Name Enquiry)
     */
    resolveBankAccount(data: BankLookupRequest): Promise<BankLookupResponse>;
    /**
     * Initiate Transfer
     */
    initiateTransfer(data: TransferRequest): Promise<any>;
    /**
     * Get Bank List
     */
    getBankList(): Promise<Array<{
        code: string;
        name: string;
    }>>;
    private getFallbackBankList;
}
export declare const palmPayService: PalmPayService;
export default palmPayService;
//# sourceMappingURL=PalmPayService.d.ts.map