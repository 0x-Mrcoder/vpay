"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const middleware_1 = require("../middleware");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const EmailService_1 = require("../services/EmailService");
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // 1. Transaction Stats (Today)
        const todayTransactions = await models_1.Transaction.find({
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
        const pendingTransactionsCount = await models_1.Transaction.countDocuments({ status: 'pending' });
        const failedTransactionsCount = await models_1.Transaction.countDocuments({ status: 'failed' });
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
        if (['admin@vtfree.com', 'admin@myconnecta.ng'].includes(user.email)) {
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
        res.json({
            success: true,
            data: {
                user,
                wallet,
                virtualAccounts,
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
        const { limit = '50', offset = '0', type, status, tenantId } = req.query;
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
        if (tenantId)
            query.userId = tenantId;
        const transactions = await models_1.Transaction.find(query)
            .populate('userId', 'email firstName lastName businessName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));
        const total = await models_1.Transaction.countDocuments(query);
        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
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
        else if (recipientType === 'specific') {
            query._id = { $in: selectedTenants };
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
            sentBy: req.user._id,
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
            sentBy: req.user._id,
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
                triggeredBy: req.user._id
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
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map