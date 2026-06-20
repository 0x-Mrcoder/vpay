"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const services_1 = require("../services");
const cloudinary_1 = require("../services/cloudinary");
const router = (0, express_1.Router)();
/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, fullName, phone, businessName } = req.body;
        // Validate required fields
        // If fullName is provided, we can derive firstName and lastName if they are missing
        let finalFirstName = firstName;
        let finalLastName = lastName;
        if (fullName && (!firstName || !lastName)) {
            const names = fullName.trim().split(' ');
            finalFirstName = names[0];
            finalLastName = names.slice(1).join(' ') || '';
        }
        if (!email || !password || !finalFirstName || !phone) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields',
            });
            return;
        }
        // Check if user already exists
        const existingUser = await models_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: 'User with this email already exists',
            });
            return;
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Generate verification OTP (6 digits)
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        // Create user
        const user = new models_1.User({
            email: email.toLowerCase(),
            passwordHash,
            firstName: finalFirstName,
            lastName: finalLastName,
            fullName: fullName || `${finalFirstName} ${finalLastName}`,
            phone,
            businessName,
            kycLevel: 0, // 0: Registered (Email Unverified)
            status: 'active', // Active but limited by kycLevel
            verificationToken,
        });
        await user.save();
        // Create wallet for user
        await services_1.walletService.createWallet(user._id.toString());
        // Send verification OTP
        await services_1.emailService.sendOtpEmail(user.email, verificationToken);
        // Generate token (can login immediately but with limited access)
        const token = (0, auth_1.generateToken)(user._id.toString(), user.email);
        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email for the verification OTP.',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    phone: user.phone,
                    kycLevel: user.kycLevel,
                    kyc_status: user.kyc_status,
                    payoutRequestStatus: user.payoutRequestStatus,
                    isPayoutEnabled: user.isPayoutEnabled,
                    status: user.status,
                    role: user.role,
                    webhookActive: user.webhookActive,
                    profilePicture: user.profilePicture,
                },
                token,
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
        });
    }
});
/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            res.status(400).json({
                success: false,
                message: 'Email and OTP are required',
            });
            return;
        }
        const user = await models_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        if (user.kycLevel >= 1) {
            res.status(400).json({
                success: false,
                message: 'Email already verified',
            });
            return;
        }
        if (user.verificationToken !== otp) {
            res.status(400).json({
                success: false,
                message: 'Invalid OTP',
            });
            return;
        }
        // Update user status
        user.kycLevel = 1; // 1: Email Verified
        user.kyc_tier = 't1';
        user.verificationToken = undefined;
        await user.save();
        res.json({
            success: true,
            message: 'Email verified successfully',
        });
    }
    catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed',
        });
    }
});
/**
 * Resend OTP
 * POST /api/auth/resend-otp
 */
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: 'Email is required',
            });
            return;
        }
        const user = await models_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        if (user.kycLevel >= 1) {
            res.status(400).json({
                success: false,
                message: 'Email already verified',
            });
            return;
        }
        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationToken = otp;
        await user.save();
        // Send OTP
        await services_1.emailService.sendOtpEmail(user.email, otp);
        res.json({
            success: true,
            message: 'OTP resent successfully',
        });
    }
    catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP',
        });
    }
});
/**
 * Verify email (Legacy - kept for backward compatibility if needed, but redirects to OTP flow logically)
 * GET /api/auth/verify-email
 */
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            res.status(400).json({
                success: false,
                message: 'Verification token is required',
            });
            return;
        }
        const user = await models_1.User.findOne({ verificationToken: token });
        if (!user) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token',
            });
            return;
        }
        // Update user status
        user.kycLevel = 1; // 1: Email Verified
        user.verificationToken = undefined;
        await user.save();
        res.json({
            success: true,
            message: 'Email verified successfully',
        });
    }
    catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Email verification failed',
        });
    }
});
/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
            return;
        }
        // Find user
        const user = await models_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
            return;
        }
        // Check password
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
            return;
        }
        // Check if user is active
        if (user.status !== 'active') {
            res.status(403).json({
                success: false,
                message: 'Account is not active',
            });
            return;
        }
        // Check if email is verified
        if (user.kycLevel < 1) {
            res.status(403).json({
                success: false,
                message: 'Please verify your email address before logging in.',
            });
            return;
        }
        // Generate token
        const token = (0, auth_1.generateToken)(user._id.toString(), user.email);
        // Get wallet
        const wallet = await models_1.Wallet.findOne({ userId: user._id });
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    businessName: user.businessName,
                    businessAddress: user.businessAddress,
                    businessPhone: user.businessPhone,
                    rcNumber: user.rcNumber,
                    phone: user.phone,
                    kycLevel: user.kycLevel,
                    kyc_status: user.kyc_status,
                    kyc_tier: user.kyc_tier,
                    payoutRequestStatus: user.payoutRequestStatus,
                    isPayoutEnabled: user.isPayoutEnabled,
                    status: user.status,
                    role: user.role,
                    webhookActive: user.webhookActive,
                    webhookUrl: user.webhookUrl,
                    profilePicture: user.profilePicture,
                    // KYC fields
                    state: user.state,
                    lga: user.lga,
                    address: user.address,
                    bvn: user.bvn,
                    nin: user.nin,
                    identityType: user.identityType,
                    idCardPath: user.idCardPath,
                    selfiePath: user.selfiePath,
                    utilityBillPath: user.utilityBillPath,
                    apiKey: user.apiKey,
                    payoutIpWhitelist: user.payoutIpWhitelist,
                    transactionPinSet: !!user.transactionPinHash,
                },
                wallet: wallet ? {
                    id: wallet._id,
                    balance: wallet.balance,
                    lockedBalance: wallet.lockedBalance,
                    currency: wallet.currency,
                } : null,
                token,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
        });
    }
});
/**
 * Get current user profile
 * GET /api/auth/profile
 */
router.get('/profile', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated',
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
        res.json({
            success: true,
            message: 'Profile retrieved',
            data: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                businessName: user.businessName,
                businessAddress: user.businessAddress,
                businessPhone: user.businessPhone,
                rcNumber: user.rcNumber,
                cacDocumentPath: user.cacDocumentPath,
                phone: user.phone,
                kycLevel: user.kycLevel,
                kyc_status: user.kyc_status,
                kyc_tier: user.kyc_tier,
                payoutRequestStatus: user.payoutRequestStatus,
                isPayoutEnabled: user.isPayoutEnabled,
                status: user.status,
                role: user.role,
                webhookActive: user.webhookActive,
                webhookUrl: user.webhookUrl,
                profilePicture: user.profilePicture,
                // KYC fields
                state: user.state,
                lga: user.lga,
                address: user.address,
                bvn: user.bvn,
                nin: user.nin,
                identityType: user.identityType,
                idCardPath: user.idCardPath,
                selfiePath: user.selfiePath,
                utilityBillPath: user.utilityBillPath,
                apiKey: user.apiKey,
                payoutIpWhitelist: user.payoutIpWhitelist,
                transactionPinSet: !!user.transactionPinHash,
            },
        });
    }
    catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
        });
    }
});
/**
 * Get current user profile (Legacy alias)
 * GET /api/auth/me
 */
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Profile retrieved',
            data: { user: req.user },
        });
    }
    catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
        });
    }
});
/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', auth_1.authenticate, async (req, res) => {
    try {
        // This route requires authentication middleware to be applied
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated',
            });
            return;
        }
        // Get user ID from token (assuming middleware attached it to req.user)
        // Since we don't have the middleware applied here explicitly in this file,
        // we rely on the router usage in index.ts or app.ts where it might be applied.
        // However, typically we decode the token here if middleware isn't guaranteed.
        // But for consistency with /me, we assume req.user is populated OR we need to verify token.
        // Let's assume standard auth middleware is used on this route in index.ts.
        // Wait, looking at index.ts (from memory/context), auth middleware is usually applied.
        // But let's look at how /me is implemented. It just checks header but doesn't decode?
        // Ah, line 292: `data: { user: (req as any).user }`.
        // This implies `authenticate` middleware IS running before this.
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not found in request',
            });
            return;
        }
        const { firstName, lastName, businessName, phone, webhookActive, profilePicture } = req.body;
        const user = await models_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Update fields
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (businessName)
            user.businessName = businessName;
        if (phone)
            user.phone = phone;
        if (webhookActive !== undefined)
            user.webhookActive = webhookActive;
        if (profilePicture) {
            if (profilePicture.startsWith('data:image')) {
                try {
                    const uploadedUrl = await (0, cloudinary_1.uploadToCloudinary)(profilePicture, `users/${user._id}/profile`);
                    user.profilePicture = uploadedUrl;
                }
                catch (error) {
                    console.error('Failed to upload profile picture to cloudinary:', error);
                    res.status(500).json({
                        success: false,
                        message: 'Failed to upload profile picture',
                    });
                    return;
                }
            }
            else {
                user.profilePicture = profilePicture;
            }
        }
        // Update fullName if names changed
        if (firstName || lastName) {
            user.fullName = `${user.firstName} ${user.lastName}`;
        }
        await user.save();
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                businessName: user.businessName,
                businessAddress: user.businessAddress,
                businessPhone: user.businessPhone,
                rcNumber: user.rcNumber,
                phone: user.phone,
                kycLevel: user.kycLevel,
                kyc_status: user.kyc_status,
                kyc_tier: user.kyc_tier,
                payoutRequestStatus: user.payoutRequestStatus,
                isPayoutEnabled: user.isPayoutEnabled,
                status: user.status,
                role: user.role,
                webhookActive: user.webhookActive,
                webhookUrl: user.webhookUrl,
                profilePicture: user.profilePicture,
                // KYC fields
                state: user.state,
                lga: user.lga,
                address: user.address,
                bvn: user.bvn,
                nin: user.nin,
                identityType: user.identityType,
                idCardPath: user.idCardPath,
                selfiePath: user.selfiePath,
                utilityBillPath: user.utilityBillPath,
                apiKey: user.apiKey,
                payoutIpWhitelist: user.payoutIpWhitelist,
                transactionPinSet: !!user.transactionPinHash,
            },
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
        });
    }
});
/**
 * Change password
 * PUT /api/auth/change-password
 */
router.put('/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Current and new passwords are required',
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
        // Check current password
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            res.status(400).json({
                success: false,
                message: 'Incorrect current password',
            });
            return;
        }
        // Hash new password
        const salt = await bcryptjs_1.default.genSalt(10);
        user.passwordHash = await bcryptjs_1.default.hash(newPassword, salt);
        await user.save();
        res.json({
            success: true,
            message: 'Password updated successfully',
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update password',
        });
    }
});
/**
 * Request password reset OTP
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: 'Email is required',
            });
            return;
        }
        const user = await models_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Return success even if user not found to prevent email enumeration
            res.json({
                success: true,
                message: 'If an account with that email exists, a reset code has been sent.',
            });
            return;
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Expires in 15 minutes
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15);
        user.resetPasswordOtp = otp;
        user.resetPasswordOtpExpires = expires;
        await user.save();
        // Send OTP email
        await services_1.emailService.sendPasswordResetOtpEmail(user.email, otp, user.firstName);
        res.json({
            success: true,
            message: 'If an account with that email exists, a reset code has been sent.',
        });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process forgot password request',
        });
    }
});
/**
 * Reset password using OTP
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Email, OTP, and new password are required',
            });
            return;
        }
        const user = await models_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code',
            });
            return;
        }
        // Verify OTP matches and is not expired
        if (!user.resetPasswordOtp ||
            user.resetPasswordOtp !== otp ||
            !user.resetPasswordOtpExpires ||
            user.resetPasswordOtpExpires < new Date()) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code',
            });
            return;
        }
        // Hash new password
        const salt = await bcryptjs_1.default.genSalt(10);
        user.passwordHash = await bcryptjs_1.default.hash(newPassword, salt);
        // Clear OTP fields
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpires = undefined;
        await user.save();
        res.json({
            success: true,
            message: 'Password reset successfully',
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
        });
    }
});
/**
 * Set transaction PIN (Initial setup)
 * POST /api/auth/set-pin
 */
router.post('/set-pin', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { pin } = req.body;
        if (!pin || pin.length !== 4 || isNaN(Number(pin))) {
            res.status(400).json({
                success: false,
                message: 'PIN must be a 4-digit number',
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
        if (user.transactionPinHash) {
            res.status(400).json({
                success: false,
                message: 'Transaction PIN is already set. Use change-pin instead.',
            });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        user.transactionPinHash = await bcryptjs_1.default.hash(pin, salt);
        await user.save();
        res.json({
            success: true,
            message: 'Transaction PIN set successfully',
        });
    }
    catch (error) {
        console.error('Set PIN error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set transaction PIN',
        });
    }
});
/**
 * Change transaction PIN
 * POST /api/auth/change-pin
 */
router.post('/change-pin', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPin, newPin } = req.body;
        if (!currentPin || !newPin || newPin.length !== 4 || isNaN(Number(newPin))) {
            res.status(400).json({
                success: false,
                message: 'Invalid PIN format',
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
        if (!user.transactionPinHash) {
            res.status(400).json({
                success: false,
                message: 'Transaction PIN is not set. Use set-pin instead.',
            });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(currentPin, user.transactionPinHash);
        if (!isMatch) {
            res.status(400).json({
                success: false,
                message: 'Incorrect current PIN',
            });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        user.transactionPinHash = await bcryptjs_1.default.hash(newPin, salt);
        await user.save();
        res.json({
            success: true,
            message: 'Transaction PIN updated successfully',
        });
    }
    catch (error) {
        console.error('Change PIN error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update transaction PIN',
        });
    }
});
/**
 * Request transaction PIN reset OTP
 * POST /api/auth/forgot-pin
 */
router.post('/forgot-pin', auth_1.authenticate, async (req, res) => {
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
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15);
        user.transactionPinResetOtp = otp;
        user.transactionPinResetExpires = expires;
        await user.save();
        // Use existing email service to send OTP
        await services_1.emailService.sendOtpEmail(user.email, otp);
        res.json({
            success: true,
            message: 'A reset code has been sent to your email.',
        });
    }
    catch (error) {
        console.error('Forgot PIN error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request',
        });
    }
});
/**
 * Reset transaction PIN using OTP
 * POST /api/auth/reset-pin
 */
router.post('/reset-pin', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { otp, newPin } = req.body;
        if (!otp || !newPin || newPin.length !== 4 || isNaN(Number(newPin))) {
            res.status(400).json({
                success: false,
                message: 'Invalid data provided',
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
        if (!user.transactionPinResetOtp ||
            user.transactionPinResetOtp !== otp ||
            !user.transactionPinResetExpires ||
            user.transactionPinResetExpires < new Date()) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code',
            });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        user.transactionPinHash = await bcryptjs_1.default.hash(newPin, salt);
        user.transactionPinResetOtp = undefined;
        user.transactionPinResetExpires = undefined;
        await user.save();
        res.json({
            success: true,
            message: 'Transaction PIN reset successfully',
        });
    }
    catch (error) {
        console.error('Reset PIN error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset transaction PIN',
        });
    }
});
exports.default = router;
//# sourceMappingURL=authRoutes.js.map