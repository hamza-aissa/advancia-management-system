import { NextFunction, Request, Response } from 'express';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export const sendError = (
  res: Response,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string[]>
): void => {
  const body: ApiErrorBody = { error: { code, message } };
  if (fields && Object.keys(fields).length > 0) body.error.fields = fields;
  res.status(status).json(body);
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export const notFoundHandler = (_req: Request, res: Response): void => {
  sendError(res, 404, 'ROUTE_NOT_FOUND', 'Route not found');
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof HttpError) {
    sendError(res, error.status, error.code, error.message);
    return;
  }

  console.error('Unhandled API error:', error);
  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
};
