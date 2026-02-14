import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, Wallet } from '../models';
import { generateToken, authenticate } from '../middleware/auth';
import { walletService, emailService } from '../services';
import config from '../config';

const router = Router();

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
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
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: 'User with this email already exists',
            });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Generate verification OTP (6 digits)
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

        // Create user
        const user = new User({
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
        await walletService.createWallet(user._id.toString());

        // Send verification OTP
        await emailService.sendOtpEmail(user.email, verificationToken);

        // Generate token (can login immediately but with limited access)
        const token = generateToken(user._id.toString(), user.email);

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
                    status: user.status,
                    role: user.role,
                },
                token,
            },
        });
    } catch (error) {
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
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            res.status(400).json({
                success: false,
                message: 'Email and OTP are required',
            });
            return;
        }

        const user = await User.findOne({ email: email.toLowerCase() });

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
        user.verificationToken = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
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
router.post('/resend-otp', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({
                success: false,
                message: 'Email is required',
            });
            return;
        }

        const user = await User.findOne({ email: email.toLowerCase() });

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
        await emailService.sendOtpEmail(user.email, otp);

        res.json({
            success: true,
            message: 'OTP resent successfully',
        });
    } catch (error) {
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
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.query;

        if (!token) {
            res.status(400).json({
                success: false,
                message: 'Verification token is required',
            });
            return;
        }

        const user = await User.findOne({ verificationToken: token });

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
    } catch (error) {
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
router.post('/login', async (req: Request, res: Response): Promise<void> => {
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
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
            return;
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
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
        const token = generateToken(user._id.toString(), user.email);

        // Get wallet
        const wallet = await Wallet.findOne({ userId: user._id });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    businessName: user.businessName,
                    phone: user.phone,
                    kycLevel: user.kycLevel,
                    status: user.status,
                    role: user.role,
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
    } catch (error) {
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
router.get('/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated',
            });
            return;
        }

        const user = await User.findById(userId);
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
                phone: user.phone,
                kycLevel: user.kycLevel,
                status: user.status,
                role: user.role
            },
        });
    } catch (error) {
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
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        res.json({
            success: true,
            message: 'Profile retrieved',
            data: { user: (req as any).user },
        });
    } catch (error) {
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
router.put('/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
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

        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not found in request',
            });
            return;
        }

        const { firstName, lastName, businessName, phone } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        // Update fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (businessName) user.businessName = businessName;
        if (phone) user.phone = phone;

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
                phone: user.phone,
                kycLevel: user.kycLevel,
                status: user.status,
                role: user.role
            },
        });
    } catch (error) {
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
router.put('/change-password', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Current and new passwords are required',
            });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            res.status(400).json({
                success: false,
                message: 'Incorrect current password',
            });
            return;
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update password',
        });
    }
});

export default router;
