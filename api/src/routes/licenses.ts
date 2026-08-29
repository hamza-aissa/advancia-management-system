import { Router } from 'express';
import {
  createLicense,
  getLicenses,
  getLicense,
  updateLicense,
  deleteLicense,
  markLicenseContacted,
  scheduleLicenseFollowUp,
  renewLicense,
  declineLicense,
  assignLicense,
  getLicenseActivity
} from '../controllers/licenseController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import { writeLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { assignmentSchema, declineSchema, followUpSchema, idParamsSchema, licenseCreateSchema, licenseUpdateSchema, noteSchema, renewSchema } from './domainValidation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Agents and admins can manage licenses
router.post('/', writeLimiter, authorize(UserRole.AGENT, UserRole.ADMIN), validate(licenseCreateSchema), createLicense);
router.get('/', authorize(UserRole.AGENT, UserRole.ADMIN), getLicenses);
router.post('/:id/contact', writeLimiter, authorize(UserRole.AGENT, UserRole.ADMIN), validate(idParamsSchema, 'params'), validate(noteSchema), markLicenseContacted);
router.post('/:id/follow-up', writeLimiter, authorize(UserRole.AGENT, UserRole.ADMIN), validate(idParamsSchema, 'params'), validate(followUpSchema), scheduleLicenseFollowUp);
router.post('/:id/renew', writeLimiter, authorize(UserRole.AGENT, UserRole.ADMIN), validate(idParamsSchema, 'params'), validate(renewSchema), renewLicense);
router.post('/:id/decline', writeLimiter, authorize(UserRole.AGENT, UserRole.ADMIN), validate(idParamsSchema, 'params'), validate(declineSchema), declineLicense);
router.patch('/:id/assignee', writeLimiter, authorize(UserRole.ADMIN), validate(idParamsSchema, 'params'), validate(assignmentSchema), assignLicense);
router.get('/:id/activity', authorize(UserRole.AGENT, UserRole.ADMIN), validate(idParamsSchema, 'params'), getLicenseActivity);
router.get('/:id', authorize(UserRole.AGENT, UserRole.ADMIN), validate(idParamsSchema, 'params'), getLicense);
router.put('/:id', writeLimiter, authorize(UserRole.AGENT, UserRole.ADMIN), validate(idParamsSchema, 'params'), validate(licenseUpdateSchema), updateLicense);
router.delete('/:id', writeLimiter, authorize(UserRole.ADMIN), validate(idParamsSchema, 'params'), deleteLicense);

export default router;
