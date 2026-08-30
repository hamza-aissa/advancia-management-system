import { Router } from 'express';
import { z } from 'zod';
import { createOperationalUser, getAssignableUsers, setOperationalUserStatus } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { objectIdSchema, validate } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimiter';
import { UserRole } from '../types';

const createUserSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: z.enum([UserRole.AGENT, UserRole.CONSULTANT])
}).strict();
const statusSchema = z.object({ active: z.boolean() }).strict();
const idSchema = z.object({ id: objectIdSchema }).strict();

const router = Router();
router.use(authenticate, authorize(UserRole.ADMIN));
router.get('/', getAssignableUsers);
router.post('/', writeLimiter, validate(createUserSchema), createOperationalUser);
router.patch('/:id/status', writeLimiter, validate(idSchema, 'params'), validate(statusSchema), setOperationalUserStatus);

export default router;
