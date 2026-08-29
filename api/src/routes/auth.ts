import { Router } from 'express';
import { login, getProfile } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email('Must be a valid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128)
});

router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/profile', authenticate, getProfile);

export default router;
