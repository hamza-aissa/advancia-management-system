import { Router } from 'express';
import {
  createLicense,
  getLicenses,
  getLicense,
  updateLicense,
  deleteLicense
} from '../controllers/licenseController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import { writeLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Agents and admins can manage licenses
router.post('/', writeLimiter, authorize(UserRole.AGENT, UserRole.ADMIN), createLicense);
router.get('/', authorize(UserRole.AGENT, UserRole.ADMIN), getLicenses);
router.get('/:id', authorize(UserRole.AGENT, UserRole.ADMIN), getLicense);
router.put('/:id', writeLimiter, authorize(UserRole.AGENT, UserRole.ADMIN), updateLicense);
router.delete('/:id', writeLimiter, authorize(UserRole.ADMIN), deleteLicense);

export default router;
