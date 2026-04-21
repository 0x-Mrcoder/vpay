import { Notification } from '../models';
import { logger } from '../utils/logger';

export class AdminNotificationService {
    /**
     * Create a notification for admins
     */
    static async notify(data: {
        userId: any;
        title: string;
        message: string;
        type: 'kyc' | 'payout' | 'system' | 'payout_access';
        priority?: 'low' | 'medium' | 'high';
        metadata?: any;
    }) {
        try {
            const notification = await Notification.create({
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type,
                priority: data.priority || 'medium',
                metadata: data.metadata,
                isRead: false
            });
            return notification;
        } catch (error) {
            logger.error('[AdminNotificationService] Failed to create notification:', error);
            return null;
        }
    }

    /**
     * Notify about KYC Submission
     */
    static async notifyKycSubmission(user: any, level: number) {
        return this.notify({
            userId: user._id,
            title: `New KYC T${level} Submission`,
            message: `${user.firstName} ${user.lastName} submitted documents for Tier ${level} verification.`,
            type: 'kyc',
            priority: 'medium'
        });
    }

    /**
     * Notify about Payout Access Request
     */
    static async notifyPayoutAccessRequest(user: any) {
        return this.notify({
            userId: user._id,
            title: 'Payout API Access Request',
            message: `${user.businessName || user.firstName} is requesting Payout API access.`,
            type: 'payout_access',
            priority: 'high'
        });
    }

    /**
     * Notify about New Payout
     */
    static async notifyNewPayout(user: any, amount: number) {
        return this.notify({
            userId: user._id,
            title: 'New Payout Initiated',
            message: `${user.firstName} initiated a payout of ₦${(amount / 100).toLocaleString()}.`,
            type: 'payout',
            priority: 'low'
        });
    }
}
