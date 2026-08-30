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
      sendError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentification requise');
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: UserRole;
    };

    const user = await User.findById(decoded.id).select('email role active');
    if (!user || user.active === false) {
      sendError(res, 401, 'INVALID_TOKEN', 'Session invalide ou expirée');
      return;
    }

    req.user = { id: String(user._id), email: user.email, role: user.role };
    next();
  } catch (error) {
    sendError(res, 401, 'INVALID_TOKEN', 'Session invalide ou expirée');
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentification requise');
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 403, 'FORBIDDEN', 'Accès interdit pour votre département');
      return;
    }

    next();
  };
};
