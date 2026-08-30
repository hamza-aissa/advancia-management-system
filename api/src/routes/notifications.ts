import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { NotificationLog } from '../models/NotificationLog';
import { UserRole } from '../types';
import { sendError } from '../utils/errors';
import { expiryCheckerJob } from '../jobs/expiryChecker';

const router = Router();
router.post('/run-scheduled', async (req, res) => {
  const expected = process.env.CRON_SECRET;
  const supplied = req.header('x-cron-secret');
  if (!expected || !supplied || supplied !== expected) {
    sendError(res, 401, 'INVALID_CRON_SECRET', 'Déclenchement planifié non autorisé');
    return;
  }
  try {
    const report = await expiryCheckerJob.run('scheduled');
    if (!report) {
      sendError(res, 409, 'REMINDER_JOB_RUNNING', 'Une vérification des échéances est déjà en cours');
      return;
    }
    res.json({ data: { report } });
  } catch (error) {
    console.error('Scheduled notification run error:', error);
    sendError(res, 500, 'REMINDER_JOB_FAILED', 'La vérification planifiée des échéances a échoué');
  }
});
router.get('/history', authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  try {
    const notifications = await NotificationLog.find({}).sort({ createdAt: -1 }).limit(250);
    res.json({ data: { notifications } });
  } catch (error) {
    console.error('Notification history error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', "Impossible de charger l'historique des notifications");
  }
});
router.get('/status', authenticate, authorize(UserRole.ADMIN), (_req, res) => {
  res.json({ data: expiryCheckerJob.getStatus() });
});
router.post('/run', authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  try {
    const report = await expiryCheckerJob.run('manual');
    if (!report) {
      sendError(res, 409, 'REMINDER_JOB_RUNNING', 'Une vérification des échéances est déjà en cours');
      return;
    }
    res.json({ data: { report } });
  } catch (error) {
    console.error('Manual notification run error:', error);
    sendError(res, 500, 'REMINDER_JOB_FAILED', 'La vérification des échéances a échoué');
  }
});
export default router;
