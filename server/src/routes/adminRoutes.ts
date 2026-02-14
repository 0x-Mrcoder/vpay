import { Router, Response, Request } from 'express';
import { User, Zainbox, VirtualAccount, Wallet, Transaction, WebhookLog, FeeRule, RiskRule, SystemSetting, Communication, SettlementDispute } from '../models';
import { authenticate, AuthenticatedRequest, generateToken, requireAdmin, auditMiddleware } from '../middleware';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { emailService } from '../services/EmailService';
import { cronService } from '../services/CronService';

import { webhookService } from '../services/WebhookService';
import { auditService } from '../services/AuditService';
import config from '../config';

const router = Router();

// Moved sync route to top to avoid conflicts


// Public Debug Routes (No Auth for easy debugging)


router.get('/debug/ping', (req: Request, res: Response) => {
    res.json({ success: true, message: 'Admin router reachable' });
});



/**
 * Admin Login
 * POST /api/admin/login
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

        // Generate token
        const token = generateToken(user._id.toString(), user.email);

        // Get wallet
        const wallet = await Wallet.findOne({ userId: user._id });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    _id: user._id,
                    email: user.email,
                    first_name: user.firstName,
                    last_name: user.lastName,
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

// Middleware to check if user is admin
const isAdmin = (req: AuthenticatedRequest, res: Response, next: any) => {
    if ((req as any).user && (req as any).user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.',
        });
    }
};

// Helper function to activate user account (Zainbox, API Key, Email)
const activateUserAccount = async (user: any) => {
    console.log(`Activating account for user: ${user.email}`);

    // 1. Ensure Zainbox exists (Legacy - Removed)
    // Zainbox creation logic removed as we migrated to PalmPay


    // 2. Ensure user is fully verified and has API key
    try {
        const updateData: any = {
            kycLevel: 3,
            kyc_status: 'verified',
            status: 'active'
        };

        if (!user.apiKey) {
            const randomPart = crypto.randomBytes(24).toString('hex');
            updateData.apiKey = `sk_live_${randomPart}`;
            console.log(`Auto-generating Live API Key for ${user.email}`);
        }

        console.log(`Updating user ${user.email} with data:`, updateData);
        const result = await User.findByIdAndUpdate(user._id, updateData, { new: true });
        console.log(`User ${user.email} update result:`, {
            id: result?._id,
            status: result?.status,
            kycLevel: result?.kycLevel,
            kyc_status: result?.kyc_status
        });
    } catch (updateError) {
        console.error(`Error updating user verification status for ${user.email}:`, updateError);
    }

    // 3. Send approval email
    try {
        await emailService.sendApprovalEmail(user.email, user.firstName);
        console.log(`Approval email sent to ${user.email}`);
    } catch (emailError) {
        console.error(`Failed to send approval email to ${user.email}:`, emailError);
    }
};

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// Apply audit middleware to log all admin actions
router.use(auditMiddleware());

/**
 * Get audit logs
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 20, action, actorEmail, startDate, endDate } = req.query;
        const result = await auditService.getLogs({
            action, actorEmail, startDate, endDate
        }, Number(page), Number(limit));

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get audit logs'
        });
    }
});

/**
 * Get admin dashboard statistics
 * GET /api/admin/stats
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Transaction Stats (Today)
        const todayTransactions = await Transaction.find({
            createdAt: { $gte: today },
            status: 'success'
        });

        const totalInflow = todayTransactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalOutflow = todayTransactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

        // 2. Pending Settlements/Transactions
        const pendingTransactionsCount = await Transaction.countDocuments({ status: 'pending' });
        const failedTransactionsCount = await Transaction.countDocuments({ status: 'failed' });

        // 3. Tenant Stats
        const totalTenants = await User.countDocuments({ role: { $ne: 'admin' } });
        const activeTenants = await User.countDocuments({ role: { $ne: 'admin' }, status: 'active' });
        const suspendedTenants = await User.countDocuments({ role: { $ne: 'admin' }, status: 'suspended' });
        const pendingTenants = await User.countDocuments({ role: { $ne: 'admin' }, status: 'pending' });

        const totalAdmins = await User.countDocuments({ role: 'admin' });

        // 4. Zainbox Stats
        const totalZainboxes = await Zainbox.countDocuments();
        const liveZainboxes = await Zainbox.countDocuments({ isLive: true });

        // 5. Webhook Stats (Last 24h)
        const totalWebhooks = await WebhookLog.countDocuments({ createdAt: { $gte: today } });
        const successWebhooks = await WebhookLog.countDocuments({ createdAt: { $gte: today }, dispatchStatus: 'success' });
        const failedWebhooks = await WebhookLog.countDocuments({ createdAt: { $gte: today }, dispatchStatus: 'failed' });
        const pendingWebhooks = await WebhookLog.countDocuments({ createdAt: { $gte: today }, dispatchStatus: 'pending' });

        // 6. Recent Transactions
        const recentTransactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                transactions: {
                    totalInflow,
                    totalOutflow,
                    pendingCount: pendingTransactionsCount,
                    failedCount: failedTransactionsCount,
                },
                tenants: {
                    total: totalTenants,
                    active: activeTenants,
                    suspended: suspendedTenants,
                    pending: pendingTenants,
                    admins: totalAdmins,
                },
                zainboxes: {
                    total: totalZainboxes,
                    live: liveZainboxes,
                },
                webhooks: {
                    total: totalWebhooks,
                    success: successWebhooks,
                    failed: failedWebhooks,
                    pending: pendingWebhooks,
                },
                recentTransactions
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get statistics',
        });
    }
});

/**
 * Get all admins
 * GET /api/admin/admins
 */
router.get('/admins', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const admins = await User.find({ role: 'admin' }).select('-passwordHash').sort({ createdAt: -1 });
        res.json({
            success: true,
            data: admins,
        });
    } catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get admins',
        });
    }
});

/**
 * Create new admin
 * POST /api/admin/admins
 */
router.post('/admins', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;

        if (!email || !password || !firstName || !lastName || !phone) {
            res.status(400).json({
                success: false,
                message: 'All fields are required',
            });
            return;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create admin user
        const admin = new User({
            email: email.toLowerCase(),
            passwordHash,
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            phone,
            role: 'admin',
            status: 'active',
            kycLevel: 3, // Admins are auto-verified
        });

        await admin.save();

        // Create wallet for admin
        await Wallet.create({
            userId: admin._id,
            balance: 0,
            currency: 'NGN',
        });

        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            data: {
                _id: admin._id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                role: admin.role,
                status: admin.status,
            },
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create admin user',
        });
    }
});

/**
 * Get all tenants (users)
 * GET /api/admin/tenants
 */
router.get('/tenants', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Exclude admin users
        const users = await User.find({
            role: { $ne: 'admin' }
        }).select('-passwordHash').sort({ createdAt: -1 });

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        console.error('Get tenants error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tenants',
        });
    }
});

/**
 * Delete tenant
 * DELETE /api/admin/tenants/:id
 */
router.delete('/tenants/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
            });
            return;
        }

        // Prevent deleting admin
        if (['admin@vtfree.com', 'admin@myconnecta.ng'].includes(user.email)) {
            res.status(403).json({
                success: false,
                message: 'Cannot delete admin account',
            });
            return;
        }

        // Delete associated data
        await Promise.all([
            Wallet.deleteMany({ userId: id }),
            Zainbox.deleteMany({ userId: id }),
            VirtualAccount.deleteMany({ userId: id }),
            Transaction.deleteMany({ userId: id }),
            User.findByIdAndDelete(id)
        ]);

        res.json({
            success: true,
            message: 'Tenant and all associated data deleted successfully',
        });
    } catch (error) {
        console.error('Delete tenant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete tenant',
        });
    }
});

/**
 * Get tenant by ID
 * GET /api/admin/tenants/:id
 */
router.get('/tenants/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('-passwordHash');

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
            });
            return;
        }

        // Get associated data
        const wallet = await Wallet.findOne({ userId: id });
        const zainboxes = await Zainbox.find({ userId: id });

        // Sync virtual accounts (Legacy Zainpay Sync Removed)
        // for (const zBox of zainboxes) { ... }


        const virtualAccounts = await VirtualAccount.find({ userId: id });

        res.json({
            success: true,
            data: {
                user,
                wallet,
                zainboxes,
                virtualAccounts,
            },
        });
    } catch (error) {
        console.error('Get tenant by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tenant',
        });
    }
});

/**
 * Update tenant status
 * PATCH /api/admin/tenants/:id/status
 */
router.patch('/tenants/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'suspended', 'pending'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Invalid status. Must be active, suspended, or pending',
            });
            return;
        }

        const user = await User.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).select('-passwordHash');

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
            });
            return;
        }

        if (status === 'active') {
            await activateUserAccount(user);
        }

        // Fetch the latest user data to ensure kycLevel and other updates are included
        const updatedUser = await User.findById(id).select('-passwordHash');

        res.json({
            success: true,
            message: `Tenant status updated to ${status}`,
            data: updatedUser,
        });
    } catch (error) {
        console.error('Update tenant status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tenant status',
        });
    }
});

/**
 * Update tenant KYC status
 * PATCH /api/admin/tenants/:id/kyc
 */
router.patch('/tenants/:id/kyc', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'verified', 'rejected'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Invalid KYC status. Must be pending, verified, or rejected',
            });
            return;
        }

        const kycLevel = status === 'verified' ? 3 : (status === 'rejected' ? 0 : 2);

        const user = await User.findByIdAndUpdate(
            id,
            { kyc_status: status, kycLevel },
            { new: true }
        ).select('-passwordHash');

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
            });
            return;
        }

        // If KYC is verified, also activate the account if it's not already active
        if (status === 'verified') {
            if (user.status !== 'active') {
                user.status = 'active';
                await user.save();
            }
            await activateUserAccount(user);
        }

        // Fetch the latest user data
        const updatedUser = await User.findById(id).select('-passwordHash');

        res.json({
            success: true,
            message: `Tenant KYC status updated to ${status}`,
            data: updatedUser,
        });
    } catch (error) {
        console.error('Update tenant KYC status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tenant KYC status',
        });
    }
});

/**
 * Get all zainboxes (admin view)
 * GET /api/admin/zainboxes
 */
router.get('/zainboxes', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Fetch all zainboxes and populate user
        const zainboxes = await Zainbox.find()
            .populate('userId', 'email firstName lastName businessName role')
            .sort({ createdAt: -1 });

        // Return ALL zainboxes (removed filter that hid admin zainboxes)
        res.json({
            success: true,
            data: zainboxes,
        });
    } catch (error) {
        console.error('Get all zainboxes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get zainboxes',
        });
    }
});

/**
 * Sync Zainboxes from Zainpay
 * POST /api/admin/zainboxes-sync
 */
router.post('/sync-zainboxes', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    console.log('HIT /sync-zainboxes route');
    try {
        const response = await zainpayService.listZainboxes();

        if (response.code === '00' && response.data) {
            const defaultUser = await User.findOne({ status: 'active' });
            if (!defaultUser) {
                res.status(400).json({ success: false, message: 'No active user found to associate Zainboxes with' });
                return;
            }

            let syncedCount = 0;
            for (const zData of response.data) {
                const existing = await Zainbox.findOne({ codeName: zData.codeName });
                if (!existing) {
                    // Try to find a user with this email
                    let targetUserId = defaultUser._id;
                    if (zData.emailNotification) {
                        const matchedUser = await User.findOne({ email: zData.emailNotification.toLowerCase() });
                        if (matchedUser) {
                            targetUserId = matchedUser._id;
                        }
                    }

                    await Zainbox.create({
                        userId: targetUserId,
                        name: zData.name,
                        emailNotification: zData.emailNotification,
                        tags: zData.tags || 'synced',
                        callbackUrl: zData.callbackUrl,
                        codeName: zData.codeName,
                        zainboxCode: zData.zainboxCode || zData.codeName,
                        isActive: zData.isActive !== false,
                        isLive: zData.isLive || false,
                    });
                    syncedCount++;
                } else {
                    // Update existing
                    existing.isActive = zData.isActive !== false;
                    existing.name = zData.name;
                    existing.emailNotification = zData.emailNotification || existing.emailNotification;
                    existing.tags = zData.tags || existing.tags;
                    existing.callbackUrl = zData.callbackUrl;

                    // If it was assigned to default user, try to re-assign if we find a better match
                    if (existing.userId.toString() === defaultUser._id.toString() && zData.emailNotification) {
                        const matchedUser = await User.findOne({ email: zData.emailNotification.toLowerCase() });
                        if (matchedUser && matchedUser._id.toString() !== defaultUser._id.toString()) {
                            existing.userId = matchedUser._id;
                        }
                    }

                    await existing.save();
                }
            }

            // --- Updated Step: Fetch Balances for ALL Zainboxes (New & Existing) ---
            const allZainboxes = await Zainbox.find({});
            console.log(`Fetching balances for ${allZainboxes.length} Zainboxes...`);

            for (const zBox of allZainboxes) {
                try {
                    const balRes = await zainpayService.getZainboxBalance(zBox.zainboxCode);
                    // balRes returns { totalBalance, balances[] }
                    if (balRes) {
                        zBox.currentBalance = balRes.totalBalance || 0;
                        await zBox.save();
                    }
                } catch (err) {
                    console.error(`Failed to fetch balance for ${zBox.zainboxCode}`, err);
                }
            }

            res.json({
                success: true,
                message: `Sync completed. ${syncedCount} new Zainboxes. Balances updated.`,
            });
        } else {
            res.status(400).json({
                success: false,
                message: response.description || 'Failed to fetch from Zainpay',
            });
        }
    } catch (error: any) {
        console.error('Sync zainboxes error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to sync zainboxes',
        });
    }
});

/**
 * Update a Zainbox
 * PATCH /api/admin/zainboxes/:zainboxCode
 */
router.patch('/zainboxes/:zainboxCode', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { zainboxCode } = req.params;
        const { name, callbackUrl, emailNotification, tags } = req.body;

        const zainbox = await Zainbox.findOne({ zainboxCode });

        if (!zainbox) {
            res.status(404).json({
                success: false,
                message: 'Zainbox not found',
            });
            return;
        }

        // Update Zainbox via Zainpay API
        try {
            await zainpayService.updateZainbox({
                codeName: zainbox.codeName,
                name: name || zainbox.name,
                callbackUrl: callbackUrl || zainbox.callbackUrl,
                emailNotification: emailNotification || zainbox.emailNotification,
                tags: tags || zainbox.tags,
            });
        } catch (zainpayError: any) {
            console.error('Zainpay update error:', zainpayError);
            res.status(400).json({
                success: false,
                message: 'Failed to update Zainbox on Zainpay',
            });
            return;
        }

        // Update local database
        if (name) zainbox.name = name;
        if (callbackUrl) zainbox.callbackUrl = callbackUrl;
        if (emailNotification) zainbox.emailNotification = emailNotification;
        if (tags) zainbox.tags = tags;

        await zainbox.save();

        res.json({
            success: true,
            message: 'Zainbox updated successfully',
            data: zainbox,
        });
    } catch (error) {
        console.error('Update zainbox error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update zainbox',
        });
    }
});

/**
 * Delete a Zainbox
 * DELETE /api/admin/zainboxes/:id
 */
router.delete('/zainboxes/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const zainbox = await Zainbox.findById(id);

        if (!zainbox) {
            res.status(404).json({
                success: false,
                message: 'Zainbox not found',
            });
            return;
        }

        // Note: We don't delete from Zainpay as they don't have a delete API for Zainboxes usually
        // We just remove it from our local tracking
        await Zainbox.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Zainbox deleted successfully from local database',
        });
    } catch (error: any) {
        console.error('Delete zainbox error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete zainbox',
        });
    }
});

/**
 * Get virtual accounts for a Zainbox
 * GET /api/admin/zainboxes/:zainboxCode/accounts
 */
router.get('/zainboxes/:zainboxCode/accounts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { zainboxCode } = req.params;

        const zainbox = await Zainbox.findOne({ zainboxCode });

        if (!zainbox) {
            res.status(404).json({
                success: false,
                message: 'Zainbox not found',
            });
            return;
        }

        // Fetch virtual accounts from local DB
        const accounts = await VirtualAccount.find({
            zainboxCode,
            accountName: { $ne: 'Internal Settlement Account' }
        });

        res.json({
            success: true,
            data: accounts.map(acc => ({
                name: acc.accountName,
                bankAccount: acc.accountNumber,
                bankName: acc.bankName,
                status: acc.status,
                createdAt: acc.createdAt
            }))
        });
    } catch (error) {
        console.error('Get zainbox accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            data: []
        });
    }
});


/**
 * Get zainbox by code (admin view with full details)
 * GET /api/admin/zainboxes/:zainboxCode
 */
router.get('/zainboxes/:zainboxCode', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { zainboxCode } = req.params;

        const zainbox = await Zainbox.findOne({ zainboxCode })
            .populate('userId', 'email firstName lastName businessName');

        if (!zainbox) {
            res.status(404).json({
                success: false,
                message: 'Zainbox not found',
            });
            return;
        }

        // Sync virtual accounts from Zainpay
        try {
            const zainpayAccounts = await zainpayService.getZainboxAccounts(zainboxCode);
            if (zainpayAccounts.code === '00' && Array.isArray(zainpayAccounts.data)) {
                for (const zAccount of zainpayAccounts.data) {
                    // Do not include the Internal Settlement Account
                    if (zAccount.name === 'Internal Settlement Account') {
                        continue;
                    }

                    const exists = await VirtualAccount.findOne({ accountNumber: zAccount.bankAccount });
                    if (!exists) {
                        const rawName = zAccount.name.replace(/Zainpay|znpay/gi, '').replace(/\s+/g, ' ').replace(/^[\s-]*|[\s-]*$/g, '');
                        const finalName = `VTPay - ${rawName}`;

                        await VirtualAccount.create({
                            userId: zainbox.userId,
                            accountNumber: zAccount.bankAccount,
                            accountName: finalName,
                            bankName: zAccount.bankName,
                            bankType: 'gtBank', // Default
                            zainboxCode: zainboxCode,
                            email: (zainbox.userId as any).email,
                            status: 'active',
                            reference: `imported_${Date.now()}_${Math.random().toString(36).substring(7)}`
                        });
                    }
                }
            }
        } catch (syncError) {
            console.error('Error syncing Zainbox accounts:', syncError);
        }

        // Get associated virtual accounts (now including synced ones)
        const virtualAccounts = await VirtualAccount.find({
            zainboxCode,
            accountName: { $ne: 'Internal Settlement Account' }
        });

        res.json({
            success: true,
            data: {
                zainbox,
                virtualAccounts,
            },
        });
    } catch (error) {
        console.error('Get zainbox by code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get zainbox',
        });
    }
});

/**
 * Get zainbox balances
 * GET /api/admin/zainboxes/:zainboxCode/balances
 */
router.get('/zainboxes/:zainboxCode/balances', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { zainboxCode } = req.params;
        const { totalBalance: rawTotal, balances: rawBalances } = await zainpayService.getZainboxBalance(zainboxCode);

        const balances = rawBalances.map(acc => ({
            ...acc,
            balanceAmount: (acc.balanceAmount || 0) / 100
        }));

        const totalBalance = rawTotal / 100;

        res.json({
            success: true,
            data: {
                balances,
                totalBalance,
            },
        });
    } catch (error: any) {
        console.error('Get zainbox balances error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch balances',
        });
    }
});

/**
 * Get all transactions (admin view)
 * GET /api/admin/transactions
 */
router.get('/transactions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { limit = '50', offset = '0', type, status, tenantId } = req.query;

        // Fetch admin IDs to exclude
        const admins = await User.find({ role: 'admin' }).select('_id');
        const adminIds = admins.map(a => a._id);

        const query: any = {
            userId: { $nin: adminIds }
        };
        if (type && type !== 'all') query.type = type;
        if (status && status !== 'all') query.status = status;
        if (tenantId) query.userId = tenantId;

        const transactions = await Transaction.find(query)
            .populate('userId', 'email firstName lastName businessName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                }
            },
        });
    } catch (error) {
        console.error('Get all transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get transactions',
        });
    }
});

/**
 * Flag/Unflag a transaction
 * PATCH /api/admin/transactions/:id/flag
 */
router.patch('/transactions/:id/flag', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { flagged } = req.body;

        const transaction = await Transaction.findByIdAndUpdate(
            id,
            { flagged },
            { new: true }
        );

        if (!transaction) {
            res.status(404).json({ success: false, message: 'Transaction not found' });
            return;
        }

        res.json({ success: true, data: transaction });
    } catch (error: any) {
        console.error('Flag transaction error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to flag transaction' });
    }
});

/**
 * Manually verify a transaction
 * POST /api/admin/transactions/:id/verify
 */
router.post('/transactions/:id/verify', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findById(id);

        if (!transaction) {
            res.status(404).json({ success: false, message: 'Transaction not found' });
            return;
        }

        if (transaction.status === 'success') {
            res.status(400).json({ success: false, message: 'Transaction is already successful' });
            return;
        }

        // Logic for manual verification would go here
        // For now, we just mark it as success
        transaction.status = 'success';
        await transaction.save();

        res.json({ success: true, message: 'Transaction verified manually', data: transaction });
    } catch (error: any) {
        console.error('Verify transaction error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to verify transaction' });
    }
});

/**
 * Get all settlements (admin view)
 * GET /api/admin/settlements
 */
router.get('/settlements', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // For now, we'll return successful transfers as "settlements" 
        // until we have a dedicated Settlement model
        // Fetch admin IDs to exclude
        const admins = await User.find({ role: 'admin' }).select('_id');
        const adminIds = admins.map(a => a._id);

        const settlements = await Transaction.find({
            category: 'transfer',
            status: { $in: ['success', 'pending'] },
            userId: { $nin: adminIds }
        })
            .populate('userId', 'email firstName lastName businessName')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: settlements,
        });
    } catch (error) {
        console.error('Get all settlements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get settlements',
        });
    }
});

/**
 * Get all settlements (admin view)
 * GET /api/admin/settlements
 */
router.get('/settlements', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const settlements = await Transaction.find({
            category: 'settlement'
        })
            .populate('userId', 'email firstName lastName businessName')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: settlements,
        });
    } catch (error) {
        console.error('Get settlements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get settlements',
        });
    }
});

/**
 * Process a settlement
 * POST /api/admin/settlements/:id/process
 */
router.post('/settlements/:id/process', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const settlement = await Transaction.findById(id);

        if (!settlement || settlement.category !== 'settlement') {
            res.status(404).json({
                success: false,
                message: 'Settlement not found',
            });
            return;
        }

        if (settlement.status !== 'pending') {
            res.status(400).json({
                success: false,
                message: 'Settlement is not in pending status',
            });
            return;
        }

        // TODO: Implement actual settlement processing logic here
        // This would involve calling Payrant or Zainpay to move funds

        settlement.status = 'success';
        await settlement.save();

        res.json({
            success: true,
            message: 'Settlement processed successfully',
            data: settlement,
        });
    } catch (error) {
        console.error('Process settlement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process settlement',
        });
    }
});

/**
 * Retry a settlement
 * POST /api/admin/settlements/:id/retry
 */
router.post('/settlements/:id/retry', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const settlement = await Transaction.findById(id);

        if (!settlement || settlement.category !== 'settlement') {
            res.status(404).json({
                success: false,
                message: 'Settlement not found',
            });
            return;
        }

        // Reset status to pending to allow reprocessing
        settlement.status = 'pending';
        await settlement.save();

        res.json({
            success: true,
            message: 'Settlement reset to pending for retry',
            data: settlement,
        });
    } catch (error) {
        console.error('Retry settlement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retry settlement',
        });
    }
});

/**
 * Manual trigger settlement
 * POST /api/admin/settlements/manual-trigger
 */
router.post('/settlements/manual-trigger', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { userId, amount, reason } = req.body;

        if (!userId || !amount) {
            res.status(400).json({
                success: false,
                message: 'User ID and amount are required',
            });
            return;
        }

        // Create a manual settlement transaction
        const settlement = await Transaction.create({
            userId,
            amount,
            category: 'settlement',
            status: 'pending',
            reference: `MAN-${Date.now()}`,
            narration: reason || 'Manual settlement trigger',
            type: 'debit' // Settlement is a debit from the system/user wallet perspective
        });

        res.json({
            success: true,
            message: 'Manual settlement triggered successfully',
            data: settlement,
        });
    } catch (error) {
        console.error('Manual trigger settlement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger manual settlement',
        });
    }
});

/**
 * Get all webhook logs
 * GET /api/admin/webhooks
 */
router.get('/webhooks', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { limit = '50', offset = '0', source, status } = req.query;

        // Fetch admin IDs to exclude
        const admins = await User.find({ role: 'admin' }).select('_id');
        const adminIds = admins.map(a => a._id);

        const query: any = {
            userId: { $nin: adminIds }
        };
        if (source && source !== 'all') query.source = source;
        if (status && status !== 'all') query.dispatchStatus = status;

        const webhooks = await WebhookLog.find(query)
            .populate('userId', 'email businessName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        const total = await WebhookLog.countDocuments(query);

        res.json({
            success: true,
            data: {
                webhooks,
                pagination: {
                    total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                }
            },
        });
    } catch (error) {
        console.error('Get webhooks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get webhooks',
        });
    }
});

/**
 * Retry a webhook dispatch
 * POST /api/admin/webhooks/:id/retry
 */
router.post('/webhooks/:id/retry', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await webhookService.retryDispatch(id);

        if (!result.success) {
            res.status(400).json(result);
            return;
        }

        res.json(result);
    } catch (error: any) {
        console.error('Retry webhook error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to retry webhook',
        });
    }
});

/**
 * Get all API keys (from Users)
 * GET /api/admin/api-keys
 */
router.get('/api-keys', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const usersWithKeys = await User.find({
            apiKey: { $exists: true, $ne: null },
            role: { $ne: 'admin' }
        })
            .select('email businessName firstName lastName apiKey createdAt updatedAt status');

        // Map to the format expected by the frontend
        const apiKeys = usersWithKeys.map(user => ({
            _id: user._id,
            tenantId: user._id,
            tenantName: user.businessName || `${user.firstName} ${user.lastName}`,
            keyName: 'Default API Key',
            fullKey: user.apiKey,
            status: user.status === 'suspended' ? 'revoked' : 'active',
            usageCount: 0, // Placeholder
            rateLimit: 1000, // Placeholder
            currentUsage: 0, // Placeholder
            scopes: ['all'], // Placeholder
            createdAt: user.createdAt,
        }));

        res.json({
            success: true,
            data: apiKeys,
        });
    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get API keys',
        });
    }
});

/**
 * Get all fee rules
 * GET /api/admin/fees
 */
router.get('/fees', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const fees = await FeeRule.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            data: fees,
        });
    } catch (error) {
        console.error('Get fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get fees',
        });
    }
});

/**
 * Create a fee rule
 * POST /api/admin/fees
 */
router.post('/fees', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const fee = await FeeRule.create(req.body);
        res.json({
            success: true,
            data: fee,
        });
    } catch (error) {
        console.error('Create fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create fee',
        });
    }
});

/**
 * Update a fee rule
 * PATCH /api/admin/fees/:id
 */
router.patch('/fees/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const fee = await FeeRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({
            success: true,
            data: fee,
        });
    } catch (error) {
        console.error('Update fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update fee',
        });
    }
});

/**
 * Delete a fee rule
 * DELETE /api/admin/fees/:id
 */
router.delete('/fees/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        await FeeRule.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: 'Fee rule deleted',
        });
    } catch (error) {
        console.error('Delete fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete fee',
        });
    }
});

/**
 * Get all risk rules
 * GET /api/admin/risk
 */
router.get('/risk', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const rules = await RiskRule.find().sort({ priority: 1 });
        res.json({
            success: true,
            data: rules,
        });
    } catch (error) {
        console.error('Get risk rules error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get risk rules',
        });
    }
});

/**
 * Create a risk rule
 * POST /api/admin/risk
 */
router.post('/risk', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const rule = await RiskRule.create(req.body);
        res.json({
            success: true,
            data: rule,
        });
    } catch (error) {
        console.error('Create risk rule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create risk rule',
        });
    }
});

/**
 * Update a risk rule
 * PATCH /api/admin/risk/:id
 */
router.patch('/risk/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const rule = await RiskRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({
            success: true,
            data: rule,
        });
    } catch (error) {
        console.error('Update risk rule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update risk rule',
        });
    }
});

/**
 * Delete a risk rule
 * DELETE /api/admin/risk/:id
 */
router.delete('/risk/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        await RiskRule.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: 'Risk rule deleted',
        });
    } catch (error) {
        console.error('Delete risk rule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete risk rule',
        });
    }
});

/**
 * Send bulk email
 * POST /api/admin/communications/send
 */
router.post('/communications/send', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { recipientType, selectedTenants, subject, message } = req.body;

        let query: any = {};
        if (recipientType === 'active') {
            query.status = 'active';
        } else if (recipientType === 'specific') {
            query._id = { $in: selectedTenants };
        }

        const tenants = await User.find(query).select('email');
        const emails = tenants.map(t => t.email);

        await emailService.sendBulkEmail(emails, subject, message);

        // Save communication to history
        await Communication.create({
            recipientType,
            recipientCount: emails.length,
            selectedTenants: recipientType === 'specific' ? selectedTenants : [],
            subject,
            message,
            sentBy: (req as any).user._id,
            sentAt: new Date()
        });

        res.json({
            success: true,
            message: `Email sent to ${emails.length} recipients`,
        });
    } catch (error) {
        console.error('Send bulk email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send bulk email',
        });
    }
});

/**
 * Get recent communications
 * GET /api/admin/communications/recent
 */
router.get('/communications/recent', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const communications = await Communication.find()
            .sort({ sentAt: -1 })
            .limit(20);

        res.json({
            success: true,
            data: communications,
        });
    } catch (error) {
        console.error('Get recent communications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent communications',
        });
    }
});

/**
 * Send single email
 * POST /api/admin/communications/send-single
 */
router.post('/communications/send-single', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { userId, subject, message } = req.body;

        const user = await User.findById(userId).select('email');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }



        // Convert plain text message to simple HTML
        const html = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                ${message.replace(/\n/g, '<br>')}
            </div>
        `;

        await emailService.sendEmail(user.email, subject, html);

        // Save to communication history
        await Communication.create({
            recipientType: 'specific',
            recipientCount: 1,
            selectedTenants: [userId],
            subject,
            message,
            sentBy: (req as any).user._id,
            sentAt: new Date()
        });

        res.json({
            success: true,
            message: 'Email sent successfully',
        });
    } catch (error) {
        console.error('Send single email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send email',
        });
    }
});

/**
 * Get system settings
 * GET /api/admin/settings
 */
router.get('/settings', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) {
            settings = await SystemSetting.create({});
        }
        res.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get settings',
        });
    }
});

/**
 * Update system settings
 * PATCH /api/admin/settings
 */
router.patch('/settings', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) {
            settings = await SystemSetting.create(req.body);
        } else {
            Object.assign(settings, req.body);
            await settings.save();
        }

        // Refresh Zainpay/Payrant config if integrations settings were updated
        if (req.body.integrations?.zainpay) {
            await zainpayService.refreshConfig();
        }
        if (req.body.integrations?.payrant) {
            const { payrantService } = await import('../services/PayrantService');
            await payrantService.refreshConfig();
        }

        // Update Global Settlement is handled by generic Object.assign above,
        // but we might want to trigger updates for existing Zainboxes here if needed.
        // For now, we only apply to new Zainboxes as requested.

        // Refreshed configs above.

        const settlementSettings = req.body.globalSettlement;

        if (settlementSettings?.settlementAccounts?.length > 0) {
            console.log('Starting scalable global settlement update for all Zainboxes...');

            // Run in background to avoid blocking response
            (async () => {
                try {
                    const BATCH_SIZE = 20; // Concurrent requests limit
                    let processedCount = 0;
                    let successCount = 0;
                    let errorCount = 0;

                    // Use cursor to stream documents instead of loading all into memory
                    const cursor = Zainbox.find({ isActive: true }).cursor();
                    const processingAndPending: Promise<void>[] = [];

                    for await (const zBox of cursor) {
                        const task = async () => {
                            try {
                                // Ensure scheduleType is valid for Zainpay API
                                const validScheduleTypes = ['T1', 'T7', 'T30'];
                                let scheduleType = settlementSettings.scheduleType;
                                if (!validScheduleTypes.includes(scheduleType)) {
                                    scheduleType = 'T1';
                                }

                                await zainpayService.createSettlement({
                                    name: `Settlement-${zBox.codeName}`,
                                    zainboxCode: zBox.zainboxCode,
                                    scheduleType: scheduleType as any,
                                    schedulePeriod: settlementSettings.schedulePeriod,
                                    settlementAccountList: settlementSettings.settlementAccounts.map((acc: any) => ({
                                        accountNumber: acc.accountNumber,
                                        bankCode: acc.bankCode,
                                        percentage: acc.percentage
                                    })),
                                    status: true
                                });
                                successCount++;
                            } catch (err: any) {
                                errorCount++;
                                console.error(`Failed to update Zainbox ${zBox.zainboxCode}:`, err.message);
                            } finally {
                                processedCount++;
                                if (processedCount % 100 === 0) {
                                    console.log(`Global Settlement Progress: ${processedCount} processed (${successCount} success, ${errorCount} failed)`);
                                }
                            }
                        };

                        // Add task to queue
                        const p = task();
                        processingAndPending.push(p);

                        // If reached batch limit, wait for one to finish (simple sliding window)
                        // Or better: await Promise.all if we want strict batches, but that's slower.
                        // Let's stick to a strict batch for simplicity and safety against rate limits.
                        if (processingAndPending.length >= BATCH_SIZE) {
                            await Promise.all(processingAndPending);
                            processingAndPending.length = 0; // Clear batch
                        }
                    }

                    // Process remaining
                    if (processingAndPending.length > 0) {
                        await Promise.all(processingAndPending);
                    }

                    console.log(`Global Settlement Update Complete. Total: ${processedCount}, Success: ${successCount}, Errors: ${errorCount}`);
                } catch (bgError) {
                    console.error('CRITICAL ERROR in background settlement update:', bgError);
                }
            })();
        }


        res.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
        });
    }
});

/**
 * Configure Zainpay Settlement
 * POST /api/admin/settings/zainpay-settlement
 */
router.post('/settings/zainpay-settlement', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { zainboxCode, scheduleType, schedulePeriod, settlementAccountList, status } = req.body;

        if (!zainboxCode || !scheduleType || !schedulePeriod || !settlementAccountList) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields for settlement configuration',
            });
            return;
        }

        const response = await zainpayService.createSettlement({
            name: 'daily-settlement',
            zainboxCode,
            scheduleType: scheduleType as 'T1' | 'T7' | 'T30',
            schedulePeriod,
            settlementAccountList,
            status,
        });

        if (response.status === 'success' || response.status === 'Successful' || response.code === '00') {
            // Update local settings
            let settings = await SystemSetting.findOne();
            if (settings) {
                settings.zainpaySettlement = {
                    zainboxCode,
                    scheduleType,
                    schedulePeriod,
                    status,
                };
                await settings.save();
            }

            res.json({
                success: true,
                message: 'Zainpay settlement configured successfully',
                data: response.data,
            });
        } else {
            res.status(400).json({
                success: false,
                message: response.description || 'Failed to configure Zainpay settlement',
            });
        }
    } catch (error) {
        console.error('Configure settlement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to configure Zainpay settlement',
        });
    }
});



/**
 * Create a new Zainbox (Admin)
 * POST /api/admin/zainboxes
 */
router.post('/zainboxes', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id; // Admin creates it for themselves for now, or we could add userId to body to create for others
        const { name, emailNotification, tags, callbackUrl } = req.body;

        if (!name || !emailNotification || !tags || !callbackUrl) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: name, emailNotification, tags, callbackUrl',
            });
            return;
        }

        // Call Zainpay API to create Zainbox
        const zainpayResponse = await zainpayService.createZainbox({
            name,
            emailNotification,
            tags,
            callbackUrl,
        });

        if (zainpayResponse.code !== '00' || !zainpayResponse.data) {
            res.status(400).json({
                success: false,
                message: zainpayResponse.description || 'Failed to create Zainbox on Zainpay',
            });
            return;
        }

        // The API returns a single Zainbox object
        const createdZainboxData = zainpayResponse.data;

        // Save to local DB
        const zainbox = new Zainbox({
            userId,
            name: createdZainboxData.name || name,
            emailNotification: createdZainboxData.emailNotification || emailNotification,
            tags: createdZainboxData.tags || tags,
            callbackUrl: createdZainboxData.callbackUrl || callbackUrl,
            codeName: createdZainboxData.codeName,
            zainboxCode: createdZainboxData.zainboxCode || createdZainboxData.codeName,
            isLive: createdZainboxData.isLive || false,
        });

        await zainbox.save();

        res.status(201).json({
            success: true,
            message: 'Zainbox created successfully',
            data: zainbox,
        });



    } catch (error: any) {
        console.error('Create Zainbox error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create Zainbox',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            details: error.response?.data || error
        });
    }
});

/**
 * Generate API Key (Admin)
 * POST /api/admin/api-keys
 */
router.post('/api-keys', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { userId, name, environment, scopes } = req.body;

        if (!userId) {
            res.status(400).json({
                success: false,
                message: 'User ID is required',
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

        // Generate a new API key
        const randomPart = crypto.randomBytes(24).toString('hex');
        const prefix = user.kycLevel < 3 ? 'sk_test_' : 'sk_live_';
        const newApiKey = `${prefix}${randomPart}`;

        user.apiKey = newApiKey;
        await user.save();

        res.json({
            success: true,
            message: 'API key generated successfully',
            data: {
                apiKey: newApiKey,
            },
        });
    } catch (error) {
        console.error('Generate API key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate API key',
        });
    }
});

/**
 * Revoke API Key
 * DELETE /api/admin/api-keys/:id
 */
router.delete('/api-keys/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        user.apiKey = undefined; // Remove the key
        await user.save();

        res.json({
            success: true,
            message: 'API key revoked successfully',
        });
    } catch (error) {
        console.error('Revoke API key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke API key',
        });
    }
});

/**
 * Get Admin Profile
 * GET /api/admin/profile
 */
router.get('/profile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user!.id).select('-passwordHash');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Admin not found',
            });
            return;
        }
        res.json({
            success: true,
            data: {
                _id: user._id,
                email: user.email,
                first_name: user.firstName,
                last_name: user.lastName,
                phone: user.phone,
                kycLevel: user.kycLevel,
                status: user.status,
            },
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
        });
    }
});

/**
 * Update Admin Profile
 * PUT /api/admin/profile
 */
router.put('/profile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { firstName, lastName, first_name, last_name, phone, email } = req.body;

        const updateData: any = {};
        if (firstName || first_name) updateData.firstName = firstName || first_name;
        if (lastName || last_name) updateData.lastName = lastName || last_name;
        if (phone) updateData.phone = phone;
        if (email) updateData.email = email;

        const user = await User.findByIdAndUpdate(
            req.user!.id,
            updateData,
            { new: true }
        ).select('-passwordHash');

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                _id: user._id,
                email: user.email,
                first_name: user.firstName,
                last_name: user.lastName,
                phone: user.phone,
                kycLevel: user.kycLevel,
                status: user.status,
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
 * Change Admin Password
 * PUT /api/admin/profile/password
 */
router.put('/profile/password', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user!.id);

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            res.status(400).json({
                success: false,
                message: 'Incorrect current password',
            });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
        });
    }
});



/**
 * GET /api/admin/disputes
 * List all settlement disputes
 */
router.get('/disputes', isAdmin, async (req: Request, res: Response) => {
    try {
        const disputes = await SettlementDispute.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            data: disputes
        });
    } catch (error) {
        console.error('Error fetching disputes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
    }
});

/**
 * POST /api/admin/dispute
 * Create a new dispute
 */
router.post('/dispute', isAdmin, async (req: Request, res: Response) => {
    try {
        const { settlementReference, reason, amount, priority, zainboxCode } = req.body;
        const dispute = await SettlementDispute.create({
            settlementReference,
            reason,
            amount,
            priority,
            zainboxCode,
            status: 'OPEN',
            adminNote: 'Created by admin',
            createdAt: new Date()
        });
        res.json({
            success: true,
            data: dispute,
            message: 'Dispute created successfully'
        });
    } catch (error) {
        console.error('Error creating dispute:', error);
        res.status(500).json({ success: false, message: 'Failed to create dispute' });
    }
});

/**
 * PATCH /api/admin/dispute/:id
 * Update dispute status/note
 */
router.patch('/dispute/:id', isAdmin, async (req: Request, res: Response) => {
    try {
        const { status, adminNote } = req.body;
        const dispute = await SettlementDispute.findByIdAndUpdate(
            req.params.id,
            {
                status,
                adminNote,
                ...(status === 'RESOLVED' || status === 'REJECTED' ? { resolvedBy: (req as any).user._id } : {})
            },
            { new: true }
        );
        res.json({
            success: true,
            data: dispute,
            message: 'Dispute updated successfully'
        });
    } catch (error) {
        console.error('Error updating dispute:', error);
        res.status(500).json({ success: false, message: 'Failed to update dispute' });
    }
});
/**
 * Manual Trigger Settlement
 * POST /api/admin/settlements/manual-trigger
 */
router.post('/settlements/manual-trigger', isAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, amount, reason } = req.body;

        if (!userId || !amount || !reason) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }

        // Check weekend restriction
        const settings = await SystemSetting.findOne();
        if (settings?.globalSettlement?.weekendSettlementEnabled === false) {
            const today = new Date().getDay();
            const isWeekend = today === 0 || today === 6; // 0 is Sunday, 6 is Saturday
            if (isWeekend) {
                res.status(400).json({
                    success: false,
                    message: 'Settlements are disabled on weekends.'
                });
                return;
            }
        }

        // Create a transaction to record this manual settlement
        const transaction = await Transaction.create({
            userId,
            amount: -amount, // Debit user/Tenant
            type: 'settlement',
            status: 'pending', // Pending manual review or processing
            reference: `MAN-SET-${Date.now()}`,
            narration: reason,
            metadata: {
                manualTrigger: true,
                triggeredBy: (req as any).user._id
            }
        });

        res.json({
            success: true,
            message: 'Manual settlement triggered successfully',
            data: transaction
        });

    } catch (error) {
        console.error('Manual settlement trigger error:', error);
        res.status(500).json({ success: false, message: 'Failed to trigger settlement' });
    }
});

/**
 * Get settlement schedule for a zainbox
 * GET /api/admin/settlements/:zainboxCode/schedule
 */
router.get('/settlements/:zainboxCode/schedule', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { zainboxCode } = req.params;
        const schedule = await zainpayService.getSettlement(zainboxCode);

        res.json({
            success: true,
            data: schedule.data || null
        });
    } catch (error: any) {
        console.error('Get settlement schedule error:', error);
        // If 404 or no settlement configured, return null instead of error
        if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('406')) {
            res.json({
                success: true,
                data: null,
                message: 'No settlement schedule configured'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to get settlement schedule'
            });
        }
    }
});

/**
 * Create or update settlement schedule for a zainbox
 * POST /api/admin/settlements/:zainboxCode/schedule
 */
router.post('/settlements/:zainboxCode/schedule', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { zainboxCode } = req.params;
        const { name, scheduleType, schedulePeriod, settlementAccountList, status } = req.body;

        // Validation
        if (!scheduleType || !schedulePeriod || !settlementAccountList || !Array.isArray(settlementAccountList)) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: scheduleType, schedulePeriod, settlementAccountList'
            });
            return;
        }

        // Validate schedule type
        if (!['T1', 'T7', 'T30'].includes(scheduleType)) {
            res.status(400).json({
                success: false,
                message: 'Invalid scheduleType. Must be T1, T7, or T30'
            });
            return;
        }

        // Validate settlement accounts
        if (settlementAccountList.length === 0) {
            res.status(400).json({
                success: false,
                message: 'At least one settlement account is required'
            });
            return;
        }

        // Validate percentages sum to 100
        const totalPercentage = settlementAccountList.reduce((sum: number, acc: any) => {
            return sum + parseFloat(acc.percentage || '0');
        }, 0);

        if (Math.abs(totalPercentage - 100) > 0.01) {
            res.status(400).json({
                success: false,
                message: `Settlement percentages must sum to 100%. Current total: ${totalPercentage}%`
            });
            return;
        }

        // Create settlement payload
        const payload = {
            name: name || `${scheduleType}-settlement-${Date.now()}`,
            zainboxCode,
            scheduleType: scheduleType as 'T1' | 'T7' | 'T30',
            schedulePeriod,
            settlementAccountList,
            status: status !== undefined ? status : true
        };

        const result = await zainpayService.createSettlement(payload);

        res.json({
            success: true,
            data: result,
            message: 'Settlement schedule configured successfully'
        });
    } catch (error: any) {
        console.error('Create settlement schedule error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create settlement schedule'
        });
    }
});

/**
 * Deactivate settlement schedule for a zainbox
 * DELETE /api/admin/settlements/:zainboxCode/schedule
 */
router.delete('/settlements/:zainboxCode/schedule', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { zainboxCode } = req.params;

        // Get current settlement
        const current = await zainpayService.getSettlement(zainboxCode);

        if (!current.data) {
            res.status(404).json({
                success: false,
                message: 'No settlement schedule found to deactivate'
            });
            return;
        }

        // Deactivate by setting status to false
        const payload = {
            name: current.data.name,
            zainboxCode,
            scheduleType: current.data.scheduleType as 'T1' | 'T7' | 'T30',
            schedulePeriod: current.data.schedulePeriod,
            settlementAccountList: current.data.settlementAccounts,
            status: false
        };

        const result = await zainpayService.createSettlement(payload);

        res.json({
            success: true,
            data: result,
            message: 'Settlement schedule deactivated successfully'
        });
    } catch (error: any) {
        console.error('Deactivate settlement schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to deactivate settlement schedule'
        });
    }
});

/**
 * Update global settlement configuration
 * PUT /api/admin/settlements/global-config
 */
router.put('/settlements/global-config', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { status, scheduleType, schedulePeriod, settlementAccounts } = req.body;

        // Validation
        if (!scheduleType || !schedulePeriod || !settlementAccounts || !Array.isArray(settlementAccounts)) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: scheduleType, schedulePeriod, settlementAccounts'
            });
            return;
        }

        // Validate schedule type
        if (!['T1', 'T7', 'T30'].includes(scheduleType)) {
            res.status(400).json({
                success: false,
                message: 'Invalid scheduleType. Must be T1, T7, or T30'
            });
            return;
        }

        // Validate percentages sum to 100
        const totalPercentage = settlementAccounts.reduce((sum: number, acc: any) => {
            return sum + parseFloat(acc.percentage || '0');
        }, 0);

        if (Math.abs(totalPercentage - 100) > 0.01) {
            res.status(400).json({
                success: false,
                message: `Settlement percentages must sum to 100%. Current total: ${totalPercentage}%`
            });
            return;
        }

        let systemSettings = await SystemSetting.findOne();
        if (!systemSettings) {
            systemSettings = new SystemSetting();
        }

        systemSettings.globalSettlement = {
            status: status !== undefined ? status : true,
            weekendSettlementEnabled: systemSettings.globalSettlement?.weekendSettlementEnabled ?? true,
            scheduleType,
            schedulePeriod,
            settlementAccounts
        };

        await systemSettings.save();

        res.json({
            success: true,
            message: 'Global settlement configuration updated successfully',
            data: systemSettings.globalSettlement
        });
    } catch (error: any) {
        console.error('Update global settlement config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update global settlement configuration'
        });
    }
});

/**
 * Get global settlement configuration
 * GET /api/admin/settlements/global-config
 */
router.get('/settlements/global-config', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const systemSettings = await SystemSetting.findOne();

        res.json({
            success: true,
            data: systemSettings?.globalSettlement || null
        });
    } catch (error: any) {
        console.error('Get global settlement config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get global settlement configuration'
        });
    }
});

/**
 * Bulk configure settlement schedules for all zainboxes
 * POST /api/admin/settlements/bulk-configure
 */
router.post('/settlements/bulk-configure', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { force } = req.body; // If true, reconfigure even if settlement exists

        const systemSettings = await SystemSetting.findOne();

        if (!systemSettings?.globalSettlement?.status || !systemSettings.globalSettlement.settlementAccounts?.length) {
            res.status(400).json({
                success: false,
                message: 'Global settlement configuration not set. Please configure it first in Settings.'
            });
            return;
        }

        const allZainboxes = await Zainbox.find({});
        let configuredCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        const results: any[] = [];

        for (const zBox of allZainboxes) {
            try {
                // Check if settlement already exists
                let shouldConfigure = force;

                if (!force) {
                    try {
                        const existingSettlement = await zainpayService.getSettlement(zBox.zainboxCode);
                        if (existingSettlement?.data) {
                            skippedCount++;
                            results.push({
                                zainboxCode: zBox.zainboxCode,
                                status: 'skipped',
                                message: 'Settlement already configured'
                            });
                            continue;
                        }
                    } catch (error: any) {
                        // If 404 or not found, settlement doesn't exist
                        if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('406')) {
                            shouldConfigure = true;
                        } else {
                            throw error;
                        }
                    }
                }

                // Create/Update settlement schedule
                const settlementPayload = {
                    name: `auto-settlement-${zBox.zainboxCode}`,
                    zainboxCode: zBox.zainboxCode,
                    scheduleType: systemSettings.globalSettlement.scheduleType as 'T1' | 'T7' | 'T30',
                    schedulePeriod: systemSettings.globalSettlement.schedulePeriod,
                    settlementAccountList: systemSettings.globalSettlement.settlementAccounts,
                    status: true
                };

                await zainpayService.createSettlement(settlementPayload);
                configuredCount++;
                results.push({
                    zainboxCode: zBox.zainboxCode,
                    status: 'success',
                    message: 'Settlement configured successfully'
                });
            } catch (error: any) {
                failedCount++;
                results.push({
                    zainboxCode: zBox.zainboxCode,
                    status: 'failed',
                    message: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Bulk configuration completed. Configured: ${configuredCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`,
            data: {
                total: allZainboxes.length,
                configured: configuredCount,
                skipped: skippedCount,
                failed: failedCount,
                results
            }
        });
    } catch (error: any) {
        console.error('Bulk configure settlements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk configure settlements'
        });
    }
});

export default router;
