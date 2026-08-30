import { z } from 'zod';
import { objectIdSchema } from '../middleware/validate';

const isoDate = z.string().datetime({ offset: true });
const optionalText = (max: number) => z.string().trim().max(max).optional();

const chronological = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict().superRefine((value, context) => {
  const dates = value as unknown as { startDate: string; expiryDate: string };
  const start = new Date(dates.startDate);
  const expiry = new Date(dates.expiryDate);
  if (expiry <= start) context.addIssue({ code: 'custom', path: ['expiryDate'], message: "La date d'échéance doit être postérieure à la date de début" });
});

export const licenseCreateSchema = chronological({
  client: objectIdSchema,
  offer: objectIdSchema,
  description: optionalText(2000),
  startDate: isoDate,
  expiryDate: isoDate,
  quantity: z.number().int().positive(),
  owner: objectIdSchema.optional()
});

export const contractServiceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative()
}).strict();

export const contractCreateSchema = chronological({
  client: objectIdSchema,
  contractType: objectIdSchema,
  description: optionalText(2000),
  startDate: isoDate,
  expiryDate: isoDate,
  services: z.array(contractServiceSchema).min(1).max(50),
  owner: objectIdSchema.optional()
});

export const licenseUpdateSchema = z.object({
  description: optionalText(2000),
  quantity: z.number().int().positive().optional()
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Au moins un champ est requis' });

export const contractUpdateSchema = z.object({
  description: optionalText(2000),
  services: z.array(contractServiceSchema).min(1).max(50).optional()
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Au moins un champ est requis' });

export const noteSchema = z.object({ note: optionalText(2000) }).strict();
export const followUpSchema = z.object({
  nextFollowUpAt: isoDate.refine((value) => new Date(value) > new Date(), 'La relance doit être planifiée dans le futur'),
  note: optionalText(2000)
}).strict();
export const renewSchema = z.object({
  startDate: isoDate.optional(),
  expiryDate: isoDate,
  value: z.number().nonnegative().optional(),
  note: optionalText(2000)
}).strict();
export const declineSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
  note: optionalText(2000)
}).strict();
export const assignmentSchema = z.object({ owner: objectIdSchema.nullable() }).strict();
export const idParamsSchema = z.object({ id: objectIdSchema }).strict();
