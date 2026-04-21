import { Router, Response, Request } from 'express';
import mongoose from 'mongoose';
import { User, VirtualAccount, Wallet, Transaction, WebhookLog, FeeRule, RiskRule, SystemSetting, Communication, Dispute, Notification } from '../models';
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
                    kyc_status: user.kyc_status,
                    payoutRequestStatus: user.payoutRequestStatus,
                    isPayoutEnabled: user.isPayoutEnabled,
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

    // 1. Ensure PalmPay Virtual Account exists if needed
    // (Virtual account creation is handled by the user themselves in the app)


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
        const { year, month } = req.query;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        
        let selectedYear = year ? parseInt(year as string) : currentYear;
        let selectedMonth = month ? parseInt(month as string) - 1 : currentMonth;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear + 1, 0, 1);
        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 1);

        // 1. Transaction Stats with dynamic filtering and quarterly aggregation
        const statsAggregation = await Transaction.aggregate([
            {
                $match: {
                    status: 'success',
                    createdAt: { $gte: startOfYear, $lt: endOfYear }
                }
            },
            {
                $group: {
                    _id: null,
                    // Quarterly Stats
                    q1Inflow: { $sum: { $cond: [{ $lt: ["$createdAt", new Date(selectedYear, 3, 1)] }, { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] }, 0] } },
                    q1Outflow: { $sum: { $cond: [{ $lt: ["$createdAt", new Date(selectedYear, 3, 1)] }, { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] }, 0] } },
                    
                    q2Inflow: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", new Date(selectedYear, 3, 1)] }, { $lt: ["$createdAt", new Date(selectedYear, 6, 1)] }] }, { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] }, 0] } },
                    q2Outflow: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", new Date(selectedYear, 3, 1)] }, { $lt: ["$createdAt", new Date(selectedYear, 6, 1)] }] }, { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] }, 0] } },
                    
                    q3Inflow: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", new Date(selectedYear, 6, 1)] }, { $lt: ["$createdAt", new Date(selectedYear, 9, 1)] }] }, { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] }, 0] } },
                    q3Outflow: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", new Date(selectedYear, 6, 1)] }, { $lt: ["$createdAt", new Date(selectedYear, 9, 1)] }] }, { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] }, 0] } },
                    
                    q4Inflow: { $sum: { $cond: [{ $gte: ["$createdAt", new Date(selectedYear, 9, 1)] }, { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] }, 0] } },
                    q4Outflow: { $sum: { $cond: [{ $gte: ["$createdAt", new Date(selectedYear, 9, 1)] }, { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] }, 0] } },

                    // Selected Month Stats
                    selectedMonthInflow: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfMonth] }, { $lt: ["$createdAt", endOfMonth] }] }, { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] }, 0] } },
                    selectedMonthOutflow: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfMonth] }, { $lt: ["$createdAt", endOfMonth] }] }, { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] }, 0] } },
                    
                    // Daily Inflow (Only if current day is within selected year/month)
                    dailyInflow: { $sum: { $cond: [{ $gte: ["$createdAt", today] }, { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] }, 0] } },
                    dailyOutflow: { $sum: { $cond: [{ $gte: ["$createdAt", today] }, { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] }, 0] } },

                    // Yearly Stats
                    yearlyInflow: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] } },
                    yearlyOutflow: { $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] } }
                }
            }
        ]);

        const tStats = statsAggregation[0] || {
            dailyInflow: 0, dailyOutflow: 0,
            selectedMonthInflow: 0, selectedMonthOutflow: 0,
            yearlyInflow: 0, yearlyOutflow: 0,
            q1Inflow: 0, q1Outflow: 0,
            q2Inflow: 0, q2Outflow: 0,
            q3Inflow: 0, q3Outflow: 0,
            q4Inflow: 0, q4Outflow: 0
        };

        // 2. Pending/Failed/Success Transactions
        const pendingTransactionsCount = await Transaction.countDocuments({ status: 'pending' });
        const failedTransactionsCount = await Transaction.countDocuments({ status: 'failed' });
        const successTransactionsCount = await Transaction.countDocuments({ status: 'success' });

        // 3. Tenant Stats
        const totalTenants = await User.countDocuments({ role: { $ne: 'admin' } });
        const activeTenants = await User.countDocuments({ role: { $ne: 'admin' }, status: 'active' });
        const suspendedTenants = await User.countDocuments({ role: { $ne: 'admin' }, status: 'suspended' });
        const pendingTenants = await User.countDocuments({ role: { $ne: 'admin' }, status: 'pending' });

        const totalAdmins = await User.countDocuments({ role: 'admin' });

        // 4. Webhook Stats (Last 24h)
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
                    // Current/Legacy fields (Reflects selected month)
                    totalInflow: tStats.selectedMonthInflow,
                    totalOutflow: tStats.selectedMonthOutflow,
                    
                    // Detailed fields
                    dailyInflow: tStats.dailyInflow,
                    dailyOutflow: tStats.dailyOutflow,
                    monthlyInflow: tStats.selectedMonthInflow,
                    monthlyOutflow: tStats.selectedMonthOutflow,
                    yearlyInflow: tStats.yearlyInflow,
                    yearlyOutflow: tStats.yearlyOutflow,

                    // Quarterly Stats
                    quarters: {
                        q1: { inflow: tStats.q1Inflow, outflow: tStats.q1Outflow },
                        q2: { inflow: tStats.q2Inflow, outflow: tStats.q2Outflow },
                        q3: { inflow: tStats.q3Inflow, outflow: tStats.q3Outflow },
                        q4: { inflow: tStats.q4Inflow, outflow: tStats.q4Outflow },
                    },

                    successCount: successTransactionsCount,
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
 * Delete admin
 * DELETE /api/admin/admins/:id
 */
router.delete('/admins/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (req.user!.id === id) {
            res.status(403).json({
                success: false,
                message: 'You cannot delete your own admin account',
            });
            return;
        }

        const user = await User.findById(id);
        if (!user || user.role !== 'admin') {
            res.status(404).json({
                success: false,
                message: 'Admin not found',
            });
            return;
        }

        // Prevent deleting super/default admin
        if (['admin@vtstack.com.ng'].includes(user.email)) {
            res.status(403).json({
                success: false,
                message: 'Cannot delete the master admin account',
            });
            return;
        }

        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Admin deleted successfully',
        });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete admin',
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
        if (['admin@vtstack.com.ng', 'admin@myconnecta.ng'].includes(user.email)) {
            res.status(403).json({
                success: false,
                message: 'Cannot delete admin account',
            });
            return;
        }

        // Delete associated data
        await Promise.all([
            Wallet.deleteMany({ userId: id }),
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

        const virtualAccounts = await VirtualAccount.find({ userId: id });

        // Financial Aggregation: Total sum of all transactions for this user
        const transactionStats = await Transaction.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(id), status: 'success' } },
            { $group: { _id: null, totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);

        const totalTransactionAmount = transactionStats[0]?.totalAmount || 0;
        const totalTransactionCount = transactionStats[0]?.count || 0;

        res.json({
            success: true,
            data: {
                user,
                wallet,
                virtualAccounts,
                stats: {
                    totalTransactionAmount,
                    totalTransactionCount
                }
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
 * Impersonate tenant (Login as User)
 * POST /api/admin/tenants/:id/impersonate
 */
router.post('/tenants/:id/impersonate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
            });
            return;
        }

        // Generate token for the target user (Standard User Token)
        const token = generateToken(user._id.toString(), user.email);

        res.json({
            success: true,
            message: `Session generated for ${user.firstName}`,
            data: {
                user: {
                    _id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Impersonate tenant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to impersonate tenant',
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

        const currentUser = await User.findById(id);
        if (!currentUser) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
            });
            return;
        }

        // status 'verified' from T1 submission sets level 2 (Fully Verified T1)
        const kycLevel: number = status === 'verified' ? 2 : (status === 'rejected' ? 0 : currentUser.kycLevel || 1);

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { kyc_status: status, kycLevel },
            { new: true }
        ).select('-passwordHash');

        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
            });
            return;
        }

        // If KYC is verified, also activate the account if it's not already active
        if (status === 'verified') {
            if (updatedUser.status !== 'active') {
                updatedUser.status = 'active';
                await updatedUser.save();
            }
            await activateUserAccount(updatedUser);
        }

        // We already have the updatedUser from findByIdAndUpdate

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
 * Get all virtual accounts (admin view)
 * GET /api/admin/virtual-accounts
 */
router.get('/virtual-accounts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const virtualAccounts = await VirtualAccount.find()
            .populate('userId', 'email firstName lastName businessName role')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: virtualAccounts,
        });
    } catch (error) {
        console.error('Get all virtual accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get virtual accounts',
        });
    }
});
/**
 * Get all transactions (admin view)
 * GET /api/admin/transactions
 */
router.get('/transactions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { limit = '50', offset = '0', type, status, category, tenantId, search } = req.query;
        console.log('GET /transactions query:', { type, status, category, tenantId, search });

        // Fetch admin IDs to exclude
        const admins = await User.find({ role: 'admin' }).select('_id');
        const adminIds = admins.map(a => a._id);

        const query: any = {
            userId: { $nin: adminIds }
        };
        if (type && type !== 'all') query.type = type;
        if (status && status !== 'all') query.status = status;
        if (category && category !== 'all') query.category = category;
        if (tenantId) query.userId = tenantId;

        // Add search filtering
        if (search) {
            const searchRegex = new RegExp(search as string, 'i');
            
            // Find users matching search for user-based filtering
            const matchingUsers = await User.find({
                $or: [
                    { email: searchRegex },
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { businessName: searchRegex }
                ]
            }).select('_id');
            const matchingUserIds = matchingUsers.map(u => u._id);

            query.$or = [
                { reference: searchRegex },
                { externalRef: searchRegex },
                { narration: searchRegex },
                { userId: { $in: matchingUserIds } }
            ];

            // If it looks like a number, also try searching the amount
            if (!isNaN(Number(search))) {
                query.$or.push({ amount: Number(search) * 100 });
            }
        }

        const transactions = await Transaction.find(query)
            .populate('userId', 'email firstName lastName businessName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        const total = await Transaction.countDocuments(query);

        const statsAggregation = [
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalVolume: { $sum: "$amount" },
                    totalCount: { $sum: 1 },
                    breakdown: {
                        $push: {
                            category: "$category",
                            status: "$status",
                            amount: "$amount"
                        }
                    }
                }
            },
            { $project: { _id: 0, totalVolume: 1, totalCount: 1, breakdown: 1 } }
        ];

        const statsResult = await Transaction.aggregate(statsAggregation);
        const stats = statsResult[0] || { totalVolume: 0, totalCount: 0, breakdown: [] };

        // Process breakdown for backward compatibility or cleaner frontend usage
        const categoryStats = stats.breakdown.reduce((acc: any, curr: any) => {
            const key = `${curr.category}-${curr.status}`;
            if (!acc[key]) acc[key] = { category: curr.category, status: curr.status, count: 0, volume: 0 };
            acc[key].count++;
            acc[key].volume += curr.amount;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                },
                stats: Object.values(categoryStats),
                meta: {
                    totalVolume: stats.totalVolume,
                    totalCount: stats.totalCount
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
 * Get fee revenue analytics
 * GET /api/admin/fees/revenue
 */
router.get('/fees/revenue', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const now = new Date();

        // Time boundaries
        const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const settings = await SystemSetting.findOne();
        const depositPct = (settings?.deposit?.virtualAccountChargePercent || 1.0) / 100;
        const tierStep = settings?.payout?.payoutTierStep || 2500;
        const tierFee = settings?.payout?.payoutTierFeeStep || 25;

        const buildRevenuePipeline = (startDate: Date) => [
            { $match: { status: 'success', createdAt: { $gte: startDate }, category: { $in: ['deposit', 'withdrawal'] } } },
            {
                $addFields: {
                    calculatedFee: {
                        $cond: {
                            if: { $eq: ['$category', 'deposit'] },
                            then: { $multiply: ['$amount', depositPct] },
                            else: {
                                // Tiered fee: Math.ceil(amount / (tierStep * 100)) * (tierFee * 100)
                                // tierStep and tierFee are in Naira, but amount and revenue should be in Kobo
                                $multiply: [
                                    { $ceil: { $divide: ['$amount', { $multiply: [tierStep, 100] }] } },
                                    { $multiply: [tierFee, 100] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$category',
                    totalFee: { $sum: '$calculatedFee' },
                    totalVolume: { $sum: '$amount' },
                    count: { $sum: 1 },
                }
            }
        ];

        const [dayData, weekData, monthData, yearData] = await Promise.all([
            Transaction.aggregate(buildRevenuePipeline(startOfDay)),
            Transaction.aggregate(buildRevenuePipeline(startOfWeek)),
            Transaction.aggregate(buildRevenuePipeline(startOfMonth)),
            Transaction.aggregate(buildRevenuePipeline(startOfYear)),
        ]);

        const parseResult = (data: any[]) => {
            const deposit = data.find((d: any) => d._id === 'deposit') || { totalFee: 0, totalVolume: 0, count: 0 };
            const withdrawal = data.find((d: any) => d._id === 'withdrawal') || { totalFee: 0, totalVolume: 0, count: 0 };
            return {
                payin: { fee: deposit.totalFee, volume: deposit.totalVolume, count: deposit.count },
                payout: { fee: withdrawal.totalFee, volume: withdrawal.totalVolume, count: withdrawal.count },
                totalFee: deposit.totalFee + withdrawal.totalFee,
                totalVolume: deposit.totalVolume + withdrawal.totalVolume,
            };
        };

        res.json({
            success: true,
            data: {
                day: parseResult(dayData),
                week: parseResult(weekData),
                month: parseResult(monthData),
                year: parseResult(yearData),
            }
        });
    } catch (error) {
        console.error('Get fee revenue error:', error);
        res.status(500).json({ success: false, message: 'Failed to get fee revenue' });
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
        } else if (recipientType === 'inactive') {
            query.status = { $ne: 'active' };
        } else if (recipientType === 'unverified') {
            query.kycLevel = { $lt: 3 };
        } else if (recipientType === 'specific') {
            query._id = { $in: selectedTenants };
        }

        // Always exclude admins unless explicitly choosing 'specific' or a special flag.
        // For general announcements, we probably only want tenants.
        if (recipientType !== 'specific') {
            query.role = { $ne: 'admin' };
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
            sentBy: (req as any).user.id,
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
            sentBy: (req as any).user.id,
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



        // Update Global Settlement is handled by generic Object.assign above,
        // but we might want to trigger updates for existing Zainboxes here if needed.
        // For now, we only apply to new Zainboxes as requested.

        // Refreshed configs above.




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
                role: user.role,
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
                role: user.role,
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
 * Get settlement cron job status
 * GET /api/admin/settlements/cron/status
 */
router.get('/settlements/cron/status', isAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { cronService } = await import('../services/CronService');
        const status = cronService.getCronStatus();
        const settings = await SystemSetting.findOne();
        res.json({
            success: true,
            data: {
                ...status,
                weekendSettlementEnabled: settings?.globalSettlement?.weekendSettlementEnabled ?? true,
                globalSettlementEnabled: settings?.globalSettlement?.status ?? false,
            }
        });
    } catch (error) {
        console.error('Get cron status error:', error);
        res.status(500).json({ success: false, message: 'Failed to get cron status' });
    }
});

/**
 * Pause settlement cron job
 * POST /api/admin/settlements/cron/pause
 */
router.post('/settlements/cron/pause', isAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { cronService } = await import('../services/CronService');
        const result = cronService.pauseSettlement();
        if (!result.success) {
            res.status(400).json({ success: false, message: result.message });
            return;
        }
        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error('Pause cron error:', error);
        res.status(500).json({ success: false, message: 'Failed to pause cron job' });
    }
});

/**
 * Resume settlement cron job
 * POST /api/admin/settlements/cron/resume
 */
router.post('/settlements/cron/resume', isAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { cronService } = await import('../services/CronService');
        const result = cronService.resumeSettlement();
        if (!result.success) {
            res.status(400).json({ success: false, message: result.message });
            return;
        }
        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error('Resume cron error:', error);
        res.status(500).json({ success: false, message: 'Failed to resume cron job' });
    }
});

/**
 * Update weekend settlement toggle
 * PATCH /api/admin/settlements/settings
 */
router.patch('/settlements/settings', isAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { weekendSettlementEnabled } = req.body;
        const settings = await SystemSetting.findOne();
        if (!settings) {
            res.status(404).json({ success: false, message: 'Settings not found' });
            return;
        }
        settings.globalSettlement.weekendSettlementEnabled = weekendSettlementEnabled;
        await settings.save();
        res.json({ success: true, message: 'Settlement settings updated', data: { weekendSettlementEnabled } });
    } catch (error) {
        console.error('Update settlement settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
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
                triggeredBy: (req as any).user.id
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
 * Get all settlements (Withdrawals & Settlements)
 * GET /api/admin/settlements
 */
router.get('/settlements', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { limit = '50', offset = '0', status } = req.query;
        const query: any = {
            category: { $in: ['withdrawal', 'settlement'] }
        };
        if (status && status !== 'all') query.status = status;

        const settlements = await Transaction.find(query)
            .populate('userId', 'email firstName lastName businessName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        res.json({
            success: true,
            data: settlements // Return array directly
        });
    } catch (error) {
        console.error('Get settlements error:', error);
        res.status(500).json({ success: false, message: 'Failed to get settlements' });
    }
});


/**
 * Process a settlement (Manual)
 * POST /api/admin/settlements/:id/process
 */
router.post('/settlements/:id/process', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findById(id);

        if (!transaction) {
            res.status(404).json({ success: false, message: 'Settlement not found' });
            return;
        }

        if (transaction.status !== 'pending') {
            res.status(400).json({ success: false, message: `Cannot process settlement in ${transaction.status} state` });
            return;
        }

        // Mark as success (Assuming manual processing)
        transaction.status = 'success';
        await transaction.save();

        // Check if there is a linked Payout
        if (transaction.metadata?.payoutId) {
            // We could update Payout model too, but staying simple for now.
            // Just logging for audit.
            console.log(`Manual process for payout transaction ${id}`);
        }

        res.json({ success: true, message: 'Settlement processed successfully', data: transaction });
    } catch (error) {
        console.error('Process settlement error:', error);
        res.status(500).json({ success: false, message: 'Failed to process settlement' });
    }
});

/**
 * Retry a settlement
 * POST /api/admin/settlements/:id/retry
 */
router.post('/settlements/:id/retry', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findById(id);

        if (!transaction) {
            res.status(404).json({ success: false, message: 'Settlement not found' });
            return;
        }

        if (transaction.status !== 'failed') {
            res.status(400).json({ success: false, message: 'Only failed settlements can be retried' });
            return;
        }

        // Reset to pending
        transaction.status = 'pending';
        await transaction.save();

        res.json({ success: true, message: 'Settlement reset to pending', data: transaction });
    } catch (error) {
        console.error('Retry settlement error:', error);
        res.status(500).json({ success: false, message: 'Failed to retry settlement' });
    }
});

/**
 * Get Revenue Statistics
 * GET /api/admin/revenue-stats
 */
/**
 * Retry Webhook (Dispatch to tenant)
 * POST /api/admin/webhooks/:id/retry
 */
router.post('/webhooks/:id/retry', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const log = await WebhookLog.findById(id);

        if (!log) {
            res.status(404).json({ success: false, message: 'Webhook log not found' });
            return;
        }

        if (log.source !== 'vtpay') {
            res.status(400).json({ success: false, message: 'Only outbound (vtpay) webhooks can be retried for delivery' });
            return;
        }

        // Trigger redelivery
        await webhookService.sendUserWebhook(log.userId!.toString(), log.eventType, log.payload.data);

        log.dispatchStatus = 'success';
        log.dispatchAttempts = (log.dispatchAttempts || 0) + 1;
        await log.save();

        res.json({ success: true, message: 'Webhook retry initiated' });
    } catch (error: any) {
        console.error('Retry webhook error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Reprocess Webhook (Inbound from provider)
 * POST /api/admin/webhooks/:id/reprocess
 */
router.post('/webhooks/:id/reprocess', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const log = await WebhookLog.findById(id);

        if (!log) {
            res.status(404).json({ success: false, message: 'Webhook log not found' });
            return;
        }

        // Re-verify signature if it was previously invalid (using new logic)
        if (!log.signatureValid && log.source === 'palmpay') {
            const signature = log.payload.sign || log.payload.signature || log.signature;
            const isValid = webhookService.verifyBodySignature(log.payload, signature);
            if (isValid) {
                log.signatureValid = true;
                await log.save();
            }
        }

        // Process the event
        const result = await webhookService.processWebhook(log.payload);

        // Update log with result and user ID
        await WebhookLog.findByIdAndUpdate(id, {
            dispatchStatus: result.success ? 'success' : 'failed',
            userId: result.userId,
            processingResult: result.message
        });

        res.json({
            success: result.success,
            message: result.message || 'Webhook reprocessed'
        });
    } catch (error: any) {
        console.error('Reprocess webhook error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/revenue-stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // 1. Total Revenue (Sum of all fees)
        // We can sum the 'fee' field from all success transactions
        const totalRevenueResult = await Transaction.aggregate([
            { $match: { status: 'success' } },
            { $group: { _id: null, total: { $sum: '$fee' } } }
        ]);
        const totalRevenue = totalRevenueResult[0]?.total || 0;

        // 2. Transaction Counts (Deposits vs Withdrawals)
        const depositCount = await Transaction.countDocuments({ category: 'deposit', status: 'success' });
        const withdrawalCount = await Transaction.countDocuments({ category: 'withdrawal', status: 'success' }); // Includes settlements

        // 3. Today's Revenue
        const todayRevenueResult = await Transaction.aggregate([
            { $match: { status: 'success', createdAt: { $gte: today } } },
            { $group: { _id: null, total: { $sum: '$fee' } } }
        ]);
        const todayRevenue = todayRevenueResult[0]?.total || 0;

        // 4. This Month's Revenue
        const monthRevenueResult = await Transaction.aggregate([
            { $match: { status: 'success', createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$fee' } } }
        ]);
        const monthRevenue = monthRevenueResult[0]?.total || 0;

        // 5. Daily Revenue Trend (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const dailyTrend = await Transaction.aggregate([
            {
                $match: {
                    status: 'success',
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$fee" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                totalRevenue,
                depositCount,
                withdrawalCount,
                todayRevenue,
                monthRevenue,
                dailyTrend
            }
        });

    } catch (error) {
        console.error('Get revenue stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get revenue stats' });
    }
});

/**
 * Get system status
 * GET /api/admin/system/cron-status
 */
router.get('/system/cron-status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        res.json({
            success: true,
            data: cronService.getCronStatus()
        });
    } catch (error) {
        console.error('Get system logic error:', error);
        res.status(500).json({ success: false, message: 'Failed to get system status' });
    }
});

/**
 * Get all disputes
 * GET /api/admin/disputes
 */
router.get('/disputes', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const disputes = await Dispute.find().sort({ createdAt: -1 });
        res.json({ success: true, data: disputes });
    } catch (error) {
        console.error('Get disputes error:', error);
        res.status(500).json({ success: false, message: 'Failed to get disputes' });
    }
});

/**
 * Log a new dispute
 * POST /api/admin/dispute
 */
router.post('/dispute', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const dispute = await Dispute.create(req.body);
        res.json({ success: true, data: dispute });
    } catch (error) {
        console.error('Create dispute error:', error);
        res.status(500).json({ success: false, message: 'Failed to create dispute' });
    }
});

/**
 * Update dispute status
 * PATCH /api/admin/dispute/:id
 */
router.patch('/dispute/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const dispute = await Dispute.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: dispute });
    } catch (error) {
        console.error('Update dispute error:', error);
        res.status(500).json({ success: false, message: 'Failed to update dispute' });
    }
});

/**
 * Approve Payout API Request
 * POST /api/admin/payout/approve/:userId
 */
router.post('/payout/approve/:userId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        user.payoutRequestStatus = 'approved';
        user.isPayoutEnabled = true;
        user.kycLevel = 3; // Fully Verified Tier 3
        user.kyc_status = 'verified'; // Ensure KYC status is also verified
        await user.save();

        const html = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <h3>Payout API Approved</h3>
                <p>Hello ${user.firstName},</p>
                <p>Your request to access the Private Payout API has been approved.</p>
                <p>Please log in to your developer dashboard to generate your high-security Payout Secret Key. <strong>Remember to copy it immediately as it will never be displayed again.</strong></p>
            </div>
        `;
        if (typeof emailService !== 'undefined') {
            await emailService.sendEmail(user.email, 'VTStack Payout API - Approved', html).catch((err: any) => console.error('Email failed', err));
        }

        res.json({ success: true, message: 'Payout API request approved successfully' });
    } catch (error) {
        console.error('Approve payout error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve payout request' });
    }
});

/**
 * Reject Payout API Request
 * POST /api/admin/payout/reject/:userId
 */
router.post('/payout/reject/:userId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        const user = await User.findById(userId);

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        user.payoutRequestStatus = 'rejected';
        user.payoutRequestReason = reason || 'Rejected due to compliance policies.';
        user.isPayoutEnabled = false;
        await user.save();

        res.json({ success: true, message: 'Payout API request rejected successfully' });
    } catch (error) {
        console.error('Reject payout error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject payout request' });
    }
});

/**
 * Get system notifications
 * GET /api/admin/notifications
 */
router.get('/notifications', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const notifications = await Notification.find()
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            success: true,
            data: notifications,
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to get notifications' });
    }
});

/**
 * Mark all notifications as read
 * PATCH /api/admin/notifications/read-all
 */
router.patch('/notifications/read-all', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        await Notification.updateMany({ isRead: false }, { isRead: true });
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ success: false, message: 'Failed to update notifications' });
    }
});

/**
 * Mark a single notification as read
 * PATCH /api/admin/notifications/:id/read
 */
router.patch('/notifications/:id/read', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update notification' });
    }
});

export default router;
