"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const middleware_1 = require("../middleware");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const EmailService_1 = require("../services/EmailService");
const CronService_1 = require("../services/CronService");
const WebhookService_1 = require("../services/WebhookService");
const AuditService_1 = require("../services/AuditService");
const router = (0, express_1.Router)();
// Moved sync route to top to avoid conflicts
// Public Debug Routes (No Auth for easy debugging)
router.get('/debug/ping', (req, res) => {
    res.json({ success: true, message: 'Admin router reachable' });
});
/**
 * Admin Login
 * POST /api/admin/login
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
        // Generate token
        const token = (0, middleware_1.generateToken)(user._id.toString(), user.email);
        // Get wallet
        const wallet = await models_1.Wallet.findOne({ userId: user._id });
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
        });
    }
});
// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.',
        });
    }
};
// Helper function to activate user account (Zainbox, API Key, Email)
const activateUserAccount = async (user) => {
    console.log(`Activating account for user: ${user.email}`);
    // 1. Ensure PalmPay Virtual Account exists if needed
    // (Virtual account creation is handled by the user themselves in the app)
    // 2. Ensure user is fully verified and has API key
    try {
        const updateData = {
            kycLevel: 3,
            kyc_status: 'verified',
            status: 'active'
        };
        if (!user.apiKey) {
            const randomPart = crypto_1.default.randomBytes(24).toString('hex');
            updateData.apiKey = `sk_live_${randomPart}`;
            console.log(`Auto-generating Live API Key for ${user.email}`);
        }
        console.log(`Updating user ${user.email} with data:`, updateData);
        const result = await models_1.User.findByIdAndUpdate(user._id, updateData, { new: true });
        console.log(`User ${user.email} update result:`, {
            id: result?._id,
            status: result?.status,
            kycLevel: result?.kycLevel,
            kyc_status: result?.kyc_status
        });
    }
    catch (updateError) {
        console.error(`Error updating user verification status for ${user.email}:`, updateError);
    }
    // 3. Send approval email
    try {
        await EmailService_1.emailService.sendApprovalEmail(user.email, user.firstName);
        console.log(`Approval email sent to ${user.email}`);
    }
    catch (emailError) {
        console.error(`Failed to send approval email to ${user.email}:`, emailError);
    }
};
// All admin routes require authentication and admin role
router.use(middleware_1.authenticate, middleware_1.requireAdmin);
// Apply audit middleware to log all admin actions
router.use((0, middleware_1.auditMiddleware)());
/**
 * Get audit logs
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', async (req, res) => {
    try {
        const { page = 1, limit = 20, action, actorEmail, startDate, endDate } = req.query;
        const result = await AuditService_1.auditService.getLogs({
            action, actorEmail, startDate, endDate
        }, Number(page), Number(limit));
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
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
router.get('/stats', async (req, res) => {
    try {
        const { year, month } = req.query;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        let selectedYear = year ? parseInt(year) : currentYear;
        let selectedMonth = month ? parseInt(month) - 1 : currentMonth;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear + 1, 0, 1);
        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 1);
        // 1. Transaction Stats with dynamic filtering and quarterly aggregation
        const statsAggregation = await models_1.Transaction.aggregate([
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
        const pendingTransactionsCount = await models_1.Transaction.countDocuments({ status: 'pending' });
        const failedTransactionsCount = await models_1.Transaction.countDocuments({ status: 'failed' });
        const successTransactionsCount = await models_1.Transaction.countDocuments({ status: 'success' });
        // 3. Tenant Stats
        const totalTenants = await models_1.User.countDocuments({ role: { $ne: 'admin' } });
        const activeTenants = await models_1.User.countDocuments({ role: { $ne: 'admin' }, status: 'active' });
        const suspendedTenants = await models_1.User.countDocuments({ role: { $ne: 'admin' }, status: 'suspended' });
        const pendingTenants = await models_1.User.countDocuments({ role: { $ne: 'admin' }, status: 'pending' });
        const totalAdmins = await models_1.User.countDocuments({ role: 'admin' });
        // 4. Webhook Stats (Last 24h)
        const totalWebhooks = await models_1.WebhookLog.countDocuments({ createdAt: { $gte: today } });
        const successWebhooks = await models_1.WebhookLog.countDocuments({ createdAt: { $gte: today }, dispatchStatus: 'success' });
        const failedWebhooks = await models_1.WebhookLog.countDocuments({ createdAt: { $gte: today }, dispatchStatus: 'failed' });
        const pendingWebhooks = await models_1.WebhookLog.countDocuments({ createdAt: { $gte: today }, dispatchStatus: 'pending' });
        // 6. Recent Transactions
        const recentTransactions = await models_1.Transaction.find()
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
    }
    catch (error) {
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
router.get('/admins', async (req, res) => {
    try {
        const admins = await models_1.User.find({ role: 'admin' }).select('-passwordHash').sort({ createdAt: -1 });
        res.json({
            success: true,
            data: admins,
        });
    }
    catch (error) {
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
router.post('/admins', async (req, res) => {
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
        const existingUser = await models_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
            return;
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Create admin user
        const admin = new models_1.User({
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
        await models_1.Wallet.create({
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
    }
    catch (error) {
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
router.delete('/admins/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent admin from deleting themselves
        if (req.user.id === id) {
            res.status(403).json({
                success: false,
                message: 'You cannot delete your own admin account',
            });
            return;
        }
        const user = await models_1.User.findById(id);
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
        await models_1.User.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Admin deleted successfully',
        });
    }
    catch (error) {
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
router.get('/tenants', async (req, res) => {
    try {
        // Exclude admin users
        const users = await models_1.User.find({
            role: { $ne: 'admin' }
        }).select('-passwordHash').sort({ createdAt: -1 });
        res.json({
            success: true,
            data: users,
        });
    }
    catch (error) {
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
router.delete('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user exists
        const user = await models_1.User.findById(id);
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
            models_1.Wallet.deleteMany({ userId: id }),
            models_1.VirtualAccount.deleteMany({ userId: id }),
            models_1.Transaction.deleteMany({ userId: id }),
            models_1.User.findByIdAndDelete(id)
        ]);
        res.json({
            success: true,
            message: 'Tenant and all associated data deleted successfully',
        });
    }
    catch (error) {
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
router.get('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await models_1.User.findById(id).select('-passwordHash');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
            });
            return;
        }
        // Get associated data
        const wallet = await models_1.Wallet.findOne({ userId: id });
        const virtualAccounts = await models_1.VirtualAccount.find({ userId: id });
        // Financial Aggregation: Total sum of all transactions for this user
        const transactionStats = await models_1.Transaction.aggregate([
            { $match: { userId: new mongoose_1.default.Types.ObjectId(id), status: 'success' } },
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
    }
    catch (error) {
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
router.post('/tenants/:id/impersonate', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await models_1.User.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
            });
            return;
        }
        // Generate token for the target user (Standard User Token)
        const token = (0, middleware_1.generateToken)(user._id.toString(), user.email);
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
    }
    catch (error) {
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
router.patch('/tenants/:id/status', async (req, res) => {
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
        const user = await models_1.User.findByIdAndUpdate(id, { status }, { new: true }).select('-passwordHash');
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
        const updatedUser = await models_1.User.findById(id).select('-passwordHash');
        res.json({
            success: true,
            message: `Tenant status updated to ${status}`,
            data: updatedUser,
        });
    }
    catch (error) {
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
router.patch('/tenants/:id/kyc', async (req, res) => {
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
        const user = await models_1.User.findByIdAndUpdate(id, { kyc_status: status, kycLevel }, { new: true }).select('-passwordHash');
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
        const updatedUser = await models_1.User.findById(id).select('-passwordHash');
        res.json({
            success: true,
            message: `Tenant KYC status updated to ${status}`,
            data: updatedUser,
        });
    }
    catch (error) {
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
router.get('/virtual-accounts', async (req, res) => {
    try {
        const virtualAccounts = await models_1.VirtualAccount.find()
            .populate('userId', 'email firstName lastName businessName role')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: virtualAccounts,
        });
    }
    catch (error) {
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
router.get('/transactions', async (req, res) => {
    try {
        const { limit = '50', offset = '0', type, status, category, tenantId, search } = req.query;
        console.log('GET /transactions query:', { type, status, category, tenantId, search });
        // Fetch admin IDs to exclude
        const admins = await models_1.User.find({ role: 'admin' }).select('_id');
        const adminIds = admins.map(a => a._id);
        const query = {
            userId: { $nin: adminIds }
        };
        if (type && type !== 'all')
            query.type = type;
        if (status && status !== 'all')
            query.status = status;
        if (category && category !== 'all')
            query.category = category;
        if (tenantId)
            query.userId = tenantId;
        // Add search filtering
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            // Find users matching search for user-based filtering
            const matchingUsers = await models_1.User.find({
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
        const transactions = await models_1.Transaction.find(query)
            .populate('userId', 'email firstName lastName businessName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));
        const total = await models_1.Transaction.countDocuments(query);
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
        const statsResult = await models_1.Transaction.aggregate(statsAggregation);
        const stats = statsResult[0] || { totalVolume: 0, totalCount: 0, breakdown: [] };
        // Process breakdown for backward compatibility or cleaner frontend usage
        const categoryStats = stats.breakdown.reduce((acc, curr) => {
            const key = `${curr.category}-${curr.status}`;
            if (!acc[key])
                acc[key] = { category: curr.category, status: curr.status, count: 0, volume: 0 };
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
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                },
                stats: Object.values(categoryStats),
                meta: {
                    totalVolume: stats.totalVolume,
                    totalCount: stats.totalCount
                }
            },
        });
    }
    catch (error) {
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
router.patch('/transactions/:id/flag', async (req, res) => {
    try {
        const { id } = req.params;
        const { flagged } = req.body;
        const transaction = await models_1.Transaction.findByIdAndUpdate(id, { flagged }, { new: true });
        if (!transaction) {
            res.status(404).json({ success: false, message: 'Transaction not found' });
            return;
        }
        res.json({ success: true, data: transaction });
    }
    catch (error) {
        console.error('Flag transaction error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to flag transaction' });
    }
});
/**
 * Manually verify a transaction
 * POST /api/admin/transactions/:id/verify
 */
router.post('/transactions/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await models_1.Transaction.findById(id);
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
    }
    catch (error) {
        console.error('Verify transaction error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to verify transaction' });
    }
});
/**
 * Get all webhook logs
 * GET /api/admin/webhooks
 */
router.get('/webhooks', async (req, res) => {
    try {
        const { limit = '50', offset = '0', source, status } = req.query;
        // Fetch admin IDs to exclude
        const admins = await models_1.User.find({ role: 'admin' }).select('_id');
        const adminIds = admins.map(a => a._id);
        const query = {
            userId: { $nin: adminIds }
        };
        if (source && source !== 'all')
            query.source = source;
        if (status && status !== 'all')
            query.dispatchStatus = status;
        const webhooks = await models_1.WebhookLog.find(query)
            .populate('userId', 'email businessName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));
        const total = await models_1.WebhookLog.countDocuments(query);
        res.json({
            success: true,
            data: {
                webhooks,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                }
            },
        });
    }
    catch (error) {
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
router.get('/api-keys', async (req, res) => {
    try {
        const usersWithKeys = await models_1.User.find({
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
    }
    catch (error) {
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
router.get('/fees', async (req, res) => {
    try {
        const fees = await models_1.FeeRule.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            data: fees,
        });
    }
    catch (error) {
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
router.get('/fees/revenue', async (req, res) => {
    try {
        const now = new Date();
        // Time boundaries
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const settings = await models_1.SystemSetting.findOne();
        const depositPct = (settings?.deposit?.virtualAccountChargePercent || 1.0) / 100;
        const tierStep = settings?.payout?.payoutTierStep || 2500;
        const tierFee = settings?.payout?.payoutTierFeeStep || 25;
        const buildRevenuePipeline = (startDate) => [
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
            models_1.Transaction.aggregate(buildRevenuePipeline(startOfDay)),
            models_1.Transaction.aggregate(buildRevenuePipeline(startOfWeek)),
            models_1.Transaction.aggregate(buildRevenuePipeline(startOfMonth)),
            models_1.Transaction.aggregate(buildRevenuePipeline(startOfYear)),
        ]);
        const parseResult = (data) => {
            const deposit = data.find((d) => d._id === 'deposit') || { totalFee: 0, totalVolume: 0, count: 0 };
            const withdrawal = data.find((d) => d._id === 'withdrawal') || { totalFee: 0, totalVolume: 0, count: 0 };
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
    }
    catch (error) {
        console.error('Get fee revenue error:', error);
        res.status(500).json({ success: false, message: 'Failed to get fee revenue' });
    }
});
/**
 * Create a fee rule
 * POST /api/admin/fees
 */
router.post('/fees', async (req, res) => {
    try {
        const fee = await models_1.FeeRule.create(req.body);
        res.json({
            success: true,
            data: fee,
        });
    }
    catch (error) {
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
router.patch('/fees/:id', async (req, res) => {
    try {
        const fee = await models_1.FeeRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({
            success: true,
            data: fee,
        });
    }
    catch (error) {
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
router.delete('/fees/:id', async (req, res) => {
    try {
        await models_1.FeeRule.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: 'Fee rule deleted',
        });
    }
    catch (error) {
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
router.get('/risk', async (req, res) => {
    try {
        const rules = await models_1.RiskRule.find().sort({ priority: 1 });
        res.json({
            success: true,
            data: rules,
        });
    }
    catch (error) {
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
router.post('/risk', async (req, res) => {
    try {
        const rule = await models_1.RiskRule.create(req.body);
        res.json({
            success: true,
            data: rule,
        });
    }
    catch (error) {
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
router.patch('/risk/:id', async (req, res) => {
    try {
        const rule = await models_1.RiskRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({
            success: true,
            data: rule,
        });
    }
    catch (error) {
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
router.delete('/risk/:id', async (req, res) => {
    try {
        await models_1.RiskRule.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: 'Risk rule deleted',
        });
    }
    catch (error) {
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
router.post('/communications/send', async (req, res) => {
    try {
        const { recipientType, selectedTenants, subject, message } = req.body;
        let query = {};
        if (recipientType === 'active') {
            query.status = 'active';
        }
        else if (recipientType === 'inactive') {
            query.status = { $ne: 'active' };
        }
        else if (recipientType === 'unverified') {
            query.kycLevel = { $lt: 3 };
        }
        else if (recipientType === 'specific') {
            query._id = { $in: selectedTenants };
        }
        // Always exclude admins unless explicitly choosing 'specific' or a special flag.
        // For general announcements, we probably only want tenants.
        if (recipientType !== 'specific') {
            query.role = { $ne: 'admin' };
        }
        const tenants = await models_1.User.find(query).select('email');
        const emails = tenants.map(t => t.email);
        await EmailService_1.emailService.sendBulkEmail(emails, subject, message);
        // Save communication to history
        await models_1.Communication.create({
            recipientType,
            recipientCount: emails.length,
            selectedTenants: recipientType === 'specific' ? selectedTenants : [],
            subject,
            message,
            sentBy: req.user.id,
            sentAt: new Date()
        });
        res.json({
            success: true,
            message: `Email sent to ${emails.length} recipients`,
        });
    }
    catch (error) {
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
router.get('/communications/recent', async (req, res) => {
    try {
        const communications = await models_1.Communication.find()
            .sort({ sentAt: -1 })
            .limit(20);
        res.json({
            success: true,
            data: communications,
        });
    }
    catch (error) {
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
router.post('/communications/send-single', async (req, res) => {
    try {
        const { userId, subject, message } = req.body;
        const user = await models_1.User.findById(userId).select('email');
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
        await EmailService_1.emailService.sendEmail(user.email, subject, html);
        // Save to communication history
        await models_1.Communication.create({
            recipientType: 'specific',
            recipientCount: 1,
            selectedTenants: [userId],
            subject,
            message,
            sentBy: req.user.id,
            sentAt: new Date()
        });
        res.json({
            success: true,
            message: 'Email sent successfully',
        });
    }
    catch (error) {
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
router.get('/settings', async (req, res) => {
    try {
        let settings = await models_1.SystemSetting.findOne();
        if (!settings) {
            settings = await models_1.SystemSetting.create({});
        }
        res.json({
            success: true,
            data: settings,
        });
    }
    catch (error) {
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
router.patch('/settings', async (req, res) => {
    try {
        let settings = await models_1.SystemSetting.findOne();
        if (!settings) {
            settings = await models_1.SystemSetting.create(req.body);
        }
        else {
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
    }
    catch (error) {
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
router.post('/api-keys', async (req, res) => {
    try {
        const { userId, name, environment, scopes } = req.body;
        if (!userId) {
            res.status(400).json({
                success: false,
                message: 'User ID is required',
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
        // Generate a new API key
        const randomPart = crypto_1.default.randomBytes(24).toString('hex');
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
    }
    catch (error) {
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
router.delete('/api-keys/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await models_1.User.findById(id);
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
    }
    catch (error) {
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
router.get('/profile', async (req, res) => {
    try {
        const user = await models_1.User.findById(req.user.id).select('-passwordHash');
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
    }
    catch (error) {
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
router.put('/profile', async (req, res) => {
    try {
        const { firstName, lastName, first_name, last_name, phone, email } = req.body;
        const updateData = {};
        if (firstName || first_name)
            updateData.firstName = firstName || first_name;
        if (lastName || last_name)
            updateData.lastName = lastName || last_name;
        if (phone)
            updateData.phone = phone;
        if (email)
            updateData.email = email;
        const user = await models_1.User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-passwordHash');
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
 * Change Admin Password
 * PUT /api/admin/profile/password
 */
router.put('/profile/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await models_1.User.findById(req.user.id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            res.status(400).json({
                success: false,
                message: 'Incorrect current password',
            });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        user.passwordHash = await bcryptjs_1.default.hash(newPassword, salt);
        await user.save();
        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    }
    catch (error) {
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
router.get('/settlements/cron/status', isAdmin, async (req, res) => {
    try {
        const { cronService } = await Promise.resolve().then(() => __importStar(require('../services/CronService')));
        const status = cronService.getCronStatus();
        const settings = await models_1.SystemSetting.findOne();
        res.json({
            success: true,
            data: {
                ...status,
                weekendSettlementEnabled: settings?.globalSettlement?.weekendSettlementEnabled ?? true,
                globalSettlementEnabled: settings?.globalSettlement?.status ?? false,
            }
        });
    }
    catch (error) {
        console.error('Get cron status error:', error);
        res.status(500).json({ success: false, message: 'Failed to get cron status' });
    }
});
/**
 * Pause settlement cron job
 * POST /api/admin/settlements/cron/pause
 */
router.post('/settlements/cron/pause', isAdmin, async (req, res) => {
    try {
        const { cronService } = await Promise.resolve().then(() => __importStar(require('../services/CronService')));
        const result = cronService.pauseSettlement();
        if (!result.success) {
            res.status(400).json({ success: false, message: result.message });
            return;
        }
        res.json({ success: true, message: result.message });
    }
    catch (error) {
        console.error('Pause cron error:', error);
        res.status(500).json({ success: false, message: 'Failed to pause cron job' });
    }
});
/**
 * Resume settlement cron job
 * POST /api/admin/settlements/cron/resume
 */
router.post('/settlements/cron/resume', isAdmin, async (req, res) => {
    try {
        const { cronService } = await Promise.resolve().then(() => __importStar(require('../services/CronService')));
        const result = cronService.resumeSettlement();
        if (!result.success) {
            res.status(400).json({ success: false, message: result.message });
            return;
        }
        res.json({ success: true, message: result.message });
    }
    catch (error) {
        console.error('Resume cron error:', error);
        res.status(500).json({ success: false, message: 'Failed to resume cron job' });
    }
});
/**
 * Update weekend settlement toggle
 * PATCH /api/admin/settlements/settings
 */
router.patch('/settlements/settings', isAdmin, async (req, res) => {
    try {
        const { weekendSettlementEnabled } = req.body;
        const settings = await models_1.SystemSetting.findOne();
        if (!settings) {
            res.status(404).json({ success: false, message: 'Settings not found' });
            return;
        }
        settings.globalSettlement.weekendSettlementEnabled = weekendSettlementEnabled;
        await settings.save();
        res.json({ success: true, message: 'Settlement settings updated', data: { weekendSettlementEnabled } });
    }
    catch (error) {
        console.error('Update settlement settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
});
/**
 * Manual Trigger Settlement
 * POST /api/admin/settlements/manual-trigger
 */
router.post('/settlements/manual-trigger', isAdmin, async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;
        if (!userId || !amount || !reason) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }
        // Check weekend restriction
        const settings = await models_1.SystemSetting.findOne();
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
        const transaction = await models_1.Transaction.create({
            userId,
            amount: -amount, // Debit user/Tenant
            type: 'settlement',
            status: 'pending', // Pending manual review or processing
            reference: `MAN-SET-${Date.now()}`,
            narration: reason,
            metadata: {
                manualTrigger: true,
                triggeredBy: req.user.id
            }
        });
        res.json({
            success: true,
            message: 'Manual settlement triggered successfully',
            data: transaction
        });
    }
    catch (error) {
        console.error('Manual settlement trigger error:', error);
        res.status(500).json({ success: false, message: 'Failed to trigger settlement' });
    }
});
/**
 * Get all settlements (Withdrawals & Settlements)
 * GET /api/admin/settlements
 */
router.get('/settlements', async (req, res) => {
    try {
        const { limit = '50', offset = '0', status } = req.query;
        const query = {
            category: { $in: ['withdrawal', 'settlement'] }
        };
        if (status && status !== 'all')
            query.status = status;
        const settlements = await models_1.Transaction.find(query)
            .populate('userId', 'email firstName lastName businessName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));
        res.json({
            success: true,
            data: settlements // Return array directly
        });
    }
    catch (error) {
        console.error('Get settlements error:', error);
        res.status(500).json({ success: false, message: 'Failed to get settlements' });
    }
});
/**
 * Process a settlement (Manual)
 * POST /api/admin/settlements/:id/process
 */
router.post('/settlements/:id/process', async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await models_1.Transaction.findById(id);
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
    }
    catch (error) {
        console.error('Process settlement error:', error);
        res.status(500).json({ success: false, message: 'Failed to process settlement' });
    }
});
/**
 * Retry a settlement
 * POST /api/admin/settlements/:id/retry
 */
router.post('/settlements/:id/retry', async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await models_1.Transaction.findById(id);
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
    }
    catch (error) {
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
router.post('/webhooks/:id/retry', async (req, res) => {
    try {
        const { id } = req.params;
        const log = await models_1.WebhookLog.findById(id);
        if (!log) {
            res.status(404).json({ success: false, message: 'Webhook log not found' });
            return;
        }
        if (log.source !== 'vtpay') {
            res.status(400).json({ success: false, message: 'Only outbound (vtpay) webhooks can be retried for delivery' });
            return;
        }
        // Trigger redelivery
        await WebhookService_1.webhookService.sendUserWebhook(log.userId.toString(), log.eventType, log.payload.data);
        log.dispatchStatus = 'success';
        log.dispatchAttempts = (log.dispatchAttempts || 0) + 1;
        await log.save();
        res.json({ success: true, message: 'Webhook retry initiated' });
    }
    catch (error) {
        console.error('Retry webhook error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * Reprocess Webhook (Inbound from provider)
 * POST /api/admin/webhooks/:id/reprocess
 */
router.post('/webhooks/:id/reprocess', async (req, res) => {
    try {
        const { id } = req.params;
        const log = await models_1.WebhookLog.findById(id);
        if (!log) {
            res.status(404).json({ success: false, message: 'Webhook log not found' });
            return;
        }
        // Re-verify signature if it was previously invalid (using new logic)
        if (!log.signatureValid && log.source === 'palmpay') {
            const signature = log.payload.sign || log.payload.signature || log.signature;
            const isValid = WebhookService_1.webhookService.verifyBodySignature(log.payload, signature);
            if (isValid) {
                log.signatureValid = true;
                await log.save();
            }
        }
        // Process the event
        const result = await WebhookService_1.webhookService.processWebhook(log.payload);
        // Update log with result and user ID
        await models_1.WebhookLog.findByIdAndUpdate(id, {
            dispatchStatus: result.success ? 'success' : 'failed',
            userId: result.userId,
            processingResult: result.message
        });
        res.json({
            success: result.success,
            message: result.message || 'Webhook reprocessed'
        });
    }
    catch (error) {
        console.error('Reprocess webhook error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/revenue-stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        // 1. Total Revenue (Sum of all fees)
        // We can sum the 'fee' field from all success transactions
        const totalRevenueResult = await models_1.Transaction.aggregate([
            { $match: { status: 'success' } },
            { $group: { _id: null, total: { $sum: '$fee' } } }
        ]);
        const totalRevenue = totalRevenueResult[0]?.total || 0;
        // 2. Transaction Counts (Deposits vs Withdrawals)
        const depositCount = await models_1.Transaction.countDocuments({ category: 'deposit', status: 'success' });
        const withdrawalCount = await models_1.Transaction.countDocuments({ category: 'withdrawal', status: 'success' }); // Includes settlements
        // 3. Today's Revenue
        const todayRevenueResult = await models_1.Transaction.aggregate([
            { $match: { status: 'success', createdAt: { $gte: today } } },
            { $group: { _id: null, total: { $sum: '$fee' } } }
        ]);
        const todayRevenue = todayRevenueResult[0]?.total || 0;
        // 4. This Month's Revenue
        const monthRevenueResult = await models_1.Transaction.aggregate([
            { $match: { status: 'success', createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$fee' } } }
        ]);
        const monthRevenue = monthRevenueResult[0]?.total || 0;
        // 5. Daily Revenue Trend (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const dailyTrend = await models_1.Transaction.aggregate([
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
    }
    catch (error) {
        console.error('Get revenue stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get revenue stats' });
    }
});
/**
 * Get system status
 * GET /api/admin/system/cron-status
 */
router.get('/system/cron-status', async (req, res) => {
    try {
        res.json({
            success: true,
            data: CronService_1.cronService.getCronStatus()
        });
    }
    catch (error) {
        console.error('Get system logic error:', error);
        res.status(500).json({ success: false, message: 'Failed to get system status' });
    }
});
/**
 * Get all disputes
 * GET /api/admin/disputes
 */
router.get('/disputes', async (req, res) => {
    try {
        const disputes = await models_1.Dispute.find().sort({ createdAt: -1 });
        res.json({ success: true, data: disputes });
    }
    catch (error) {
        console.error('Get disputes error:', error);
        res.status(500).json({ success: false, message: 'Failed to get disputes' });
    }
});
/**
 * Log a new dispute
 * POST /api/admin/dispute
 */
router.post('/dispute', async (req, res) => {
    try {
        const dispute = await models_1.Dispute.create(req.body);
        res.json({ success: true, data: dispute });
    }
    catch (error) {
        console.error('Create dispute error:', error);
        res.status(500).json({ success: false, message: 'Failed to create dispute' });
    }
});
/**
 * Update dispute status
 * PATCH /api/admin/dispute/:id
 */
router.patch('/dispute/:id', async (req, res) => {
    try {
        const dispute = await models_1.Dispute.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: dispute });
    }
    catch (error) {
        console.error('Update dispute error:', error);
        res.status(500).json({ success: false, message: 'Failed to update dispute' });
    }
});
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map