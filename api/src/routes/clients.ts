import { Router } from 'express';
import {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient
} from '../controllers/clientController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All authenticated users can view clients
router.get('/', getClients);
router.get('/:id', getClient);

// Only agents, consultants, and admins can manage clients
router.post('/', authorize(UserRole.AGENT, UserRole.CONSULTANT, UserRole.ADMIN), createClient);
router.put('/:id', authorize(UserRole.AGENT, UserRole.CONSULTANT, UserRole.ADMIN), updateClient);
router.delete('/:id', authorize(UserRole.ADMIN), deleteClient);

export default router;
