/**
 * PalmPay API Type Definitions
 */
export interface PalmPayConfig {
    baseUrl: string;
    apiKey: string;
    publicKey: string;
    privateKey: string;
    webhookSecret: string;
}
export interface PalmPayResponse<T = any> {
    respCode: string;
    respMsg: string;
    data?: T;
}
export interface CreateVirtualAccountRequest {
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    bvn?: string;
    externalReference: string;
}
export interface CreateVirtualAccountRequestV2 {
    requestTime: number;
    identityType: 'company' | 'individual';
    licenseNumber?: string;
    virtualAccountName: string;
    version: string;
    customerName: string;
    email: string;
    nonceStr: string;
}
export interface VirtualAccountData {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
    reservationReference: string;
    status: string;
    currency: string;
}
export interface VirtualAccountDataV2 {
    virtualAccountName: string;
    virtualAccountNo: string;
    identityType: string;
    email: string;
    licenseNumber?: string;
    customerName: string;
    status: string;
}
export interface TransferRequest {
    amount: number;
    currency: string;
    transactionReference: string;
    description: string;
    beneficiary: {
        accountNumber: string;
        bankCode: string;
        accountName: string;
    };
}
export interface BankLookupRequest {
    bankCode: string;
    accountNumber: string;
}
export interface BankLookupResponse {
    accountName: string;
    accountNumber: string;
    bankCode: string;
}
export interface PalmPayWebhookEvent {
    type: 'pay_in_order' | 'transfer_notify';
    data: any;
    timestamp: string;
}
export interface DepositWebhookData {
    orderNo: string;
    amount: number;
    currency: string;
    status: string;
    paymentTime: string;
    externalReference: string;
    payerName?: string;
    payerAccount?: string;
    fee?: number;
}
//# sourceMappingURL=palmpay.d.ts.map