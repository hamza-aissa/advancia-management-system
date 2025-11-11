import { Router } from 'express';
import {
  createContract,
  getContracts,
  getContract,
  updateContract,
  deleteContract
} from '../controllers/contractController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import { writeLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Consultants and admins can manage contracts
router.post('/', writeLimiter, authorize(UserRole.CONSULTANT, UserRole.ADMIN), createContract);
router.get('/', authorize(UserRole.CONSULTANT, UserRole.ADMIN), getContracts);
router.get('/:id', authorize(UserRole.CONSULTANT, UserRole.ADMIN), getContract);
router.put('/:id', writeLimiter, authorize(UserRole.CONSULTANT, UserRole.ADMIN), updateContract);
router.delete('/:id', writeLimiter, authorize(UserRole.ADMIN), deleteContract);

export default router;
