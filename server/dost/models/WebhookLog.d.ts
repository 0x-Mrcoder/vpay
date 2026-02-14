import mongoose, { Document } from 'mongoose';
export interface IWebhookLogDocument extends Document {
    source: 'zainpay' | 'vtpay' | 'palmpay';
    eventType: string;
    userId?: mongoose.Types.ObjectId;
    zainboxCode?: string;
    payload: any;
    signature: string;
    signatureValid: boolean;
    dispatchStatus?: 'pending' | 'success' | 'failed';
    dispatchAttempts?: number;
    responseStatus?: number;
    responseBody?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WebhookLog: mongoose.Model<IWebhookLogDocument, {}, {}, {}, mongoose.Document<unknown, {}, IWebhookLogDocument, {}, {}> & IWebhookLogDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default WebhookLog;
//# sourceMappingURL=WebhookLog.d.ts.map