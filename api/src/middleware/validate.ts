import { NextFunction, Request, Response } from 'express';
import { z, ZodType } from 'zod';
import { sendError } from '../utils/errors';

type RequestPart = 'body' | 'params' | 'query';

export const validate = (schema: ZodType, part: RequestPart = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || part;
        (fields[key] ??= []).push(issue.message);
      }
      sendError(res, 422, 'VALIDATION_ERROR', 'La validation a échoué', fields);
      return;
    }

    // Zod strips unknown body fields so controllers only receive approved input.
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid identifier');
