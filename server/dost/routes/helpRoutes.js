"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middleware_1.authenticate);
/**
 * Submit a new help message
 * POST /api/help
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { subject, message } = req.body;
        if (!subject || !message) {
            res.status(400).json({
                success: false,
                message: 'Subject and message are required',
            });
            return;
        }
        const helpMessage = await models_1.HelpMessage.create({
            userId,
            subject,
            message,
        });
        res.status(201).json({
            success: true,
            message: 'Help message submitted successfully',
            data: helpMessage,
        });
    }
    catch (error) {
        console.error('Submit help message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit help message',
        });
    }
});
/**
 * Get user's help messages
 * GET /api/help/my-messages
 */
router.get('/my-messages', async (req, res) => {
    try {
        const userId = req.user.id;
        const messages = await models_1.HelpMessage.find({ userId }).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: messages,
        });
    }
    catch (error) {
        console.error('Get my help messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get help messages',
        });
    }
});
/**
 * Admin: List all help messages
 * GET /api/help/admin/messages
 */
router.get('/admin/messages', middleware_1.requireAdmin, async (req, res) => {
    try {
        const messages = await models_1.HelpMessage.find()
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: messages,
        });
    }
    catch (error) {
        console.error('Admin get help messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get help messages',
        });
    }
});
/**
 * Admin: Update message status
 * PATCH /api/help/admin/messages/:id/status
 */
router.patch('/admin/messages/:id/status', middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['pending', 'in_progress', 'resolved'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Invalid status',
            });
            return;
        }
        const message = await models_1.HelpMessage.findByIdAndUpdate(id, { status }, { new: true });
        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Message not found',
            });
            return;
        }
        res.json({
            success: true,
            message: 'Status updated successfully',
            data: message,
        });
    }
    catch (error) {
        console.error('Update help message status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status',
        });
    }
});
exports.default = router;
//# sourceMappingURL=helpRoutes.js.map