import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { UserRole } from '../types';
import { sendError } from '../utils/errors';

export const getAssignableUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const role = req.query.role;
  if (role !== UserRole.AGENT && role !== UserRole.CONSULTANT) {
    sendError(res, 422, 'VALIDATION_ERROR', 'La validation a échoué', {
      role: ['Role must be agent or consultant']
    });
    return;
  }

  try {
    const users = await User.find({ role })
      .select('firstName lastName email role')
      .sort({ firstName: 1, lastName: 1 });
    res.json({ data: { users } });
  } catch (error) {
    console.error('Get users error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Impossible de charger les utilisateurs');
  }
};
