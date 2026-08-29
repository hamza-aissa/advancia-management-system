import { Router } from 'express';
import { getActions, getDashboard } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();
const interactiveOnly = authorize(UserRole.AGENT, UserRole.CONSULTANT, UserRole.ADMIN);
router.get('/dashboard', authenticate, interactiveOnly, getDashboard);
router.get('/actions', authenticate, interactiveOnly, getActions);

export default router;
