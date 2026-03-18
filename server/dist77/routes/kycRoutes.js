"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const services_1 = require("../services");
const cloudinary_1 = require("../services/cloudinary");
const router = (0, express_1.Router)();
/**
 * Submit KYC details
 * POST /api/kyc/submit
 */
router.post('/submit', auth_1.authenticate, async (req, res) => {
    try {
        const { 
        // Step 1: Personal Info
        state, lga, address, 
        // Step 2: Identity
        bvn, identityType, 
        // Step 3: Document
        idCard, // File path/URL
        selfie, nin } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        // Validate required fields
        const missingFields = [];
        if (!state)
            missingFields.push('State');
        if (!lga)
            missingFields.push('LGA');
        if (!address)
            missingFields.push('Address');
        if (!bvn)
            missingFields.push('BVN');
        if (!identityType)
            missingFields.push('Identity Type');
        if (!idCard)
            missingFields.push('ID Document');
        if (!selfie)
            missingFields.push('Selfie');
        // NIN might be optional if they chose Voter/Passport, but let's keep it if they chose NIN
        if (identityType === 'National ID Card' && !nin)
            missingFields.push('NIN');
        if (missingFields.length > 0) {
            res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`,
            });
            return;
        }
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Upload documents to Cloudinary if they are provided as base64
        // If they are already URLs (starts with http), skip upload
        let idCardUrl = idCard;
        let selfieUrl = selfie;
        if (idCard && idCard.startsWith('data:image')) {
            try {
                idCardUrl = await (0, cloudinary_1.uploadToCloudinary)(idCard, `kyc/${user._id}/id_card`);
            }
            catch (err) {
                res.status(500).json({ success: false, message: 'Failed to upload ID card image' });
                return;
            }
        }
        if (selfie && selfie.startsWith('data:image')) {
            try {
                selfieUrl = await (0, cloudinary_1.uploadToCloudinary)(selfie, `kyc/${user._id}/selfie`);
            }
            catch (err) {
                res.status(500).json({ success: false, message: 'Failed to upload selfie image' });
                return;
            }
        }
        // Update user KYC details
        user.state = state;
        user.lga = lga;
        user.address = address;
        user.bvn = bvn;
        user.identityType = identityType;
        user.idCardPath = idCardUrl;
        user.selfiePath = selfieUrl;
        if (nin)
            user.nin = nin;
        user.kycLevel = 2; // 2: KYC Submitted (Pending Approval)
        user.kyc_status = 'pending';
        await user.save();
        // Notify admins
        services_1.emailService.sendKycSubmissionAdminNotification(user, 'KYC').catch(err => console.error('[KYC] Failed to send admin notification:', err));
        res.json({
            success: true,
            message: 'KYC details submitted successfully. Your account is pending approval.',
            data: {
                kycLevel: user.kycLevel,
            },
        });
    }
    catch (error) {
        console.error('KYC submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit KYC details',
        });
    }
});
/**
 * Upgrade Business details
 * POST /api/kyc/upgrade-business
 */
router.post('/upgrade-business', auth_1.authenticate, async (req, res) => {
    try {
        const { businessName, businessAddress, businessPhone, rcNumber, cacDocument } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!businessName || !businessAddress || !rcNumber || !cacDocument) {
            res.status(400).json({ message: 'Missing required business details' });
            return;
        }
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        let cacUrl = cacDocument;
        if (cacDocument && cacDocument.startsWith('data:')) {
            try {
                cacUrl = await (0, cloudinary_1.uploadToCloudinary)(cacDocument, `business/${user._id}/cac`);
            }
            catch (err) {
                res.status(500).json({ success: false, message: 'Failed to upload CAC document' });
                return;
            }
        }
        user.businessName = businessName;
        user.businessAddress = businessAddress;
        user.businessPhone = businessPhone;
        user.rcNumber = rcNumber;
        user.cacDocumentPath = cacUrl;
        // Maybe set a flag indicating business upgrade request?
        // user.upgradeRequest = 'pending'; // If we had such a field
        await user.save();
        // Notify admins
        services_1.emailService.sendKycSubmissionAdminNotification(user, 'Business Upgrade').catch(err => console.error('[KYC] Failed to send admin notification for business upgrade:', err));
        res.json({
            success: true,
            message: 'Business upgrade request submitted.',
            data: user
        });
    }
    catch (error) {
        console.error('Business upgrade error:', error);
        res.status(500).json({ message: 'Failed to submit business details' });
    }
});
/**
 * Get KYC status
 * GET /api/kyc/status
 */
router.get('/status', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        res.json({
            success: true,
            data: {
                kycLevel: user.kycLevel,
                status: user.status,
            },
        });
    }
    catch (error) {
        console.error('KYC status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get KYC status',
        });
    }
});
exports.default = router;
//# sourceMappingURL=kycRoutes.js.map