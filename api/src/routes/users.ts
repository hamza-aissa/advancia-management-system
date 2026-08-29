import { Router } from 'express';
import { getAssignableUsers } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();
router.use(authenticate, authorize(UserRole.ADMIN));
router.get('/', getAssignableUsers);

export default router;
