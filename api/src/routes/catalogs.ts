import { Router } from 'express';
import { z } from 'zod';
import {
  createContractType, createLicenseOffer, listContractTypes, listLicenseOffers,
  updateContractType, updateLicenseOffer
} from '../controllers/catalogController';
import { authenticate, authorize } from '../middleware/auth';
import { objectIdSchema, validate } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimiter';
import { UserRole } from '../types';

const optionalText = z.string().trim().max(2000).optional().or(z.literal(''));
const offerCreateSchema = z.object({
  name: z.string().trim().min(2).max(160), description: optionalText,
  unitPrice: z.number().nonnegative(), active: z.boolean().optional()
}).strict();
const offerUpdateSchema = offerCreateSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'Au moins un champ est requis' });
const typeCreateSchema = z.object({
  name: z.string().trim().min(2).max(160), description: optionalText, active: z.boolean().optional()
}).strict();
const typeUpdateSchema = typeCreateSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'Au moins un champ est requis' });
const idSchema = z.object({ id: objectIdSchema }).strict();

const router = Router();
router.use(authenticate);

router.get('/license-offers', authorize(UserRole.AGENT, UserRole.ADMIN), listLicenseOffers);
router.post('/license-offers', authorize(UserRole.ADMIN), writeLimiter, validate(offerCreateSchema), createLicenseOffer);
router.patch('/license-offers/:id', authorize(UserRole.ADMIN), writeLimiter, validate(idSchema, 'params'), validate(offerUpdateSchema), updateLicenseOffer);

router.get('/contract-types', authorize(UserRole.CONSULTANT, UserRole.ADMIN), listContractTypes);
router.post('/contract-types', authorize(UserRole.ADMIN), writeLimiter, validate(typeCreateSchema), createContractType);
router.patch('/contract-types/:id', authorize(UserRole.ADMIN), writeLimiter, validate(idSchema, 'params'), validate(typeUpdateSchema), updateContractType);

export default router;
