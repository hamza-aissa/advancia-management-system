import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { sendError } from '../utils/errors';

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      return;
    }

    const token = jwt.sign(
      { id: String(user._id), email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration } as jwt.SignOptions
    );

    res.json({
      data: {
        token,
        user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to log in');
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }
    res.json({ data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to retrieve profile');
  }
};
