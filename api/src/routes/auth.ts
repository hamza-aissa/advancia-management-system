import { Router } from 'express';
import { login, getProfile } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email('Saisissez une adresse e-mail valide').max(254),
  password: z.string().min(1, 'Le mot de passe est obligatoire').max(128)
});

router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/profile', authenticate, getProfile);

export default router;
