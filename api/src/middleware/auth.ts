import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '../types';
import { User } from '../models/User';
import { sendError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authorization = req.header('Authorization');
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : undefined;

    if (!token) {
      sendError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: UserRole;
    };

    const user = await User.findById(decoded.id).select('email role');
    if (!user) {
      sendError(res, 401, 'INVALID_TOKEN', 'Invalid or expired token');
      return;
    }

    req.user = { id: String(user._id), email: user.email, role: user.role };
    next();
  } catch (error) {
    sendError(res, 401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
      return;
    }

    next();
  };
};
