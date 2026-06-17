"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminNotificationService = void 0;
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
class AdminNotificationService {
    /**
     * Create a notification for admins
     */
    static async notify(data) {
        try {
            const notification = await models_1.Notification.create({
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type,
                priority: data.priority || 'medium',
                metadata: data.metadata,
                isRead: false
            });
            return notification;
        }
        catch (error) {
            logger_1.logger.error('[AdminNotificationService] Failed to create notification:', error);
            return null;
        }
    }
    /**
     * Notify about KYC Submission
     */
    static async notifyKycSubmission(user, level) {
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
    static async notifyPayoutAccessRequest(user) {
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
    static async notifyNewPayout(user, amount) {
        return this.notify({
            userId: user._id,
            title: 'New Payout Initiated',
            message: `${user.firstName} initiated a payout of ₦${(amount / 100).toLocaleString()}.`,
            type: 'payout',
            priority: 'low'
        });
    }
}
exports.AdminNotificationService = AdminNotificationService;
//# sourceMappingURL=AdminNotificationService.js.map