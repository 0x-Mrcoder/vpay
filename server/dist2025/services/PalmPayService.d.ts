import { AxiosInstance } from 'axios';
import { VirtualAccountDataV2, TransferRequest, BankLookupRequest, BankLookupResponse } from '../types/palmpay';
export declare class PalmPayService {
    private client;
    private baseUrl;
    private privateKey;
    constructor(client?: AxiosInstance);
    private loadPrivateKey;
    private generateSignatureV2;
    private initializeInterceptors;
    /**
     * Create a Static Virtual Account (Alias for V2.0)
     */
    createVirtualAccount(data: any): Promise<VirtualAccountDataV2>;
    /**
     * Create a Static Virtual Account (V2.0 API)
     */
    createVirtualAccountV2(data: any): Promise<VirtualAccountDataV2>;
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