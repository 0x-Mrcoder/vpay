import { Router, Response } from 'express';
import { HelpMessage } from '../models';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Submit a new help message
 * POST /api/help
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { subject, message } = req.body;

        if (!subject || !message) {
            res.status(400).json({
                success: false,
                message: 'Subject and message are required',
            });
            return;
        }

        const helpMessage = await HelpMessage.create({
            userId,
            subject,
            message,
        });

        res.status(201).json({
            success: true,
            message: 'Help message submitted successfully',
            data: helpMessage,
        });
    } catch (error: any) {
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
router.get('/my-messages', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const messages = await HelpMessage.find({ userId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: messages,
        });
    } catch (error: any) {
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
router.get('/admin/messages', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const messages = await HelpMessage.find()
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: messages,
        });
    } catch (error: any) {
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
router.patch('/admin/messages/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

        const message = await HelpMessage.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

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
    } catch (error: any) {
        console.error('Update help message status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status',
        });
    }
});

export default router;
