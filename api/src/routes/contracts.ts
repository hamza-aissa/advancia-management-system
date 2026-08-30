import { Router } from 'express';
import {
  createContract,
  getContracts,
  getContract,
  updateContract,
  deleteContract,
  markContractContacted,
  scheduleContractFollowUp,
  renewContract,
  declineContract,
  assignContract,
  getContractActivity
} from '../controllers/contractController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import { writeLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { assignmentSchema, contractCreateSchema, contractUpdateSchema, declineSchema, followUpSchema, idParamsSchema, noteSchema, renewSchema } from './domainValidation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Consultants manage contracts; admins supervise, reassign and archive.
router.post('/', writeLimiter, authorize(UserRole.CONSULTANT), validate(contractCreateSchema), createContract);
router.get('/', authorize(UserRole.CONSULTANT, UserRole.ADMIN), getContracts);
router.post('/:id/contact', writeLimiter, authorize(UserRole.CONSULTANT), validate(idParamsSchema, 'params'), validate(noteSchema), markContractContacted);
router.post('/:id/follow-up', writeLimiter, authorize(UserRole.CONSULTANT), validate(idParamsSchema, 'params'), validate(followUpSchema), scheduleContractFollowUp);
router.post('/:id/renew', writeLimiter, authorize(UserRole.CONSULTANT), validate(idParamsSchema, 'params'), validate(renewSchema), renewContract);
router.post('/:id/decline', writeLimiter, authorize(UserRole.CONSULTANT), validate(idParamsSchema, 'params'), validate(declineSchema), declineContract);
router.patch('/:id/assignee', writeLimiter, authorize(UserRole.ADMIN), validate(idParamsSchema, 'params'), validate(assignmentSchema), assignContract);
router.get('/:id/activity', authorize(UserRole.CONSULTANT, UserRole.ADMIN), validate(idParamsSchema, 'params'), getContractActivity);
router.get('/:id', authorize(UserRole.CONSULTANT, UserRole.ADMIN), validate(idParamsSchema, 'params'), getContract);
router.patch('/:id', writeLimiter, authorize(UserRole.CONSULTANT), validate(idParamsSchema, 'params'), validate(contractUpdateSchema), updateContract);
router.put('/:id', writeLimiter, authorize(UserRole.CONSULTANT), validate(idParamsSchema, 'params'), validate(contractUpdateSchema), updateContract);
router.delete('/:id', writeLimiter, authorize(UserRole.ADMIN), validate(idParamsSchema, 'params'), deleteContract);

export default router;
