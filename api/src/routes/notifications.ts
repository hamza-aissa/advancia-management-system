import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { NotificationLog } from '../models/NotificationLog';
import { UserRole } from '../types';
import { sendError } from '../utils/errors';

const router = Router();
router.get('/history', authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  try {
    const notifications = await NotificationLog.find({}).sort({ createdAt: -1 }).limit(250);
    res.json({ data: { notifications } });
  } catch (error) {
    console.error('Notification history error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to retrieve notification history');
  }
});
export default router;
