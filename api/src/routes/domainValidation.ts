import { z } from 'zod';
import { objectIdSchema } from '../middleware/validate';

const isoDate = z.string().datetime({ offset: true });
const optionalText = (max: number) => z.string().trim().max(max).optional();

const chronological = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict().superRefine((value, context) => {
  const dates = value as unknown as { startDate: string; expiryDate: string };
  const start = new Date(dates.startDate);
  const expiry = new Date(dates.expiryDate);
  if (expiry <= start) context.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Expiry date must be after start date' });
});

export const licenseCreateSchema = chronological({
  client: objectIdSchema,
  name: z.string().trim().min(1).max(160),
  description: optionalText(2000),
  startDate: isoDate,
  expiryDate: isoDate,
  quantity: z.number().int().positive(),
  value: z.number().nonnegative().optional(),
  owner: objectIdSchema.optional()
});

export const contractCreateSchema = chronological({
  client: objectIdSchema,
  title: z.string().trim().min(1).max(160),
  description: optionalText(2000),
  startDate: isoDate,
  expiryDate: isoDate,
  value: z.number().nonnegative().optional(),
  owner: objectIdSchema.optional()
});

export const licenseUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: optionalText(2000),
  quantity: z.number().int().positive().optional(),
  value: z.number().nonnegative().optional()
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const contractUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: optionalText(2000),
  value: z.number().nonnegative().optional()
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const noteSchema = z.object({ note: optionalText(2000) }).strict();
export const followUpSchema = z.object({
  nextFollowUpAt: isoDate.refine((value) => new Date(value) > new Date(), 'Follow-up must be in the future'),
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
