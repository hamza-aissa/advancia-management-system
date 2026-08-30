import { NextFunction, Response, Router } from 'express';
import { z } from 'zod';
import {
  archiveClient,
  createClient,
  getClient,
  getClients,
  updateClient
} from '../controllers/clientController';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { objectIdSchema, validate } from '../middleware/validate';
import { UserRole } from '../types';
import { writeLimiter } from '../middleware/rateLimiter';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const commonOperationalFields = {
  notes: optionalText(2000),
  lastContactAt: z.string().datetime({ offset: true }).nullable().optional()
};

export const createClientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: optionalText(40),
  address: optionalText(500),
  assignedAgent: objectIdSchema.optional(),
  assignedConsultant: objectIdSchema.optional(),
  ...commonOperationalFields
}).strict();

const operationalUpdateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: optionalText(40),
  address: optionalText(500),
  ...commonOperationalFields
})
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Au moins un champ est requis' });

const adminUpdateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: optionalText(40),
  address: optionalText(500),
  assignedAgent: objectIdSchema.optional(),
  assignedConsultant: objectIdSchema.optional(),
  ...commonOperationalFields
})
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Au moins un champ est requis' });

const validateClientUpdate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const schema = req.user?.role === UserRole.ADMIN ? adminUpdateSchema : operationalUpdateSchema;
  validate(schema)(req, res, next);
};

const idParamsSchema = z.object({ id: objectIdSchema });
const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.AGENT, UserRole.CONSULTANT, UserRole.ADMIN));

router.get('/', getClients);
router.get('/:id', validate(idParamsSchema, 'params'), getClient);
router.post('/', writeLimiter, validate(createClientSchema), createClient);
router.patch('/:id', writeLimiter, validate(idParamsSchema, 'params'), validateClientUpdate, updateClient);
router.put('/:id', writeLimiter, validate(idParamsSchema, 'params'), validateClientUpdate, updateClient);
router.patch('/:id/archive', writeLimiter, authorize(UserRole.ADMIN), validate(idParamsSchema, 'params'), archiveClient);
router.delete('/:id', writeLimiter, authorize(UserRole.ADMIN), validate(idParamsSchema, 'params'), archiveClient);

export default router;
