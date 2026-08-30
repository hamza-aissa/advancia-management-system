import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { UserRole } from '../types';
import { sendError } from '../utils/errors';

const operationalRoles = [UserRole.AGENT, UserRole.CONSULTANT];

export const getAssignableUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const role = req.query.role;
  if (role !== undefined && !operationalRoles.includes(role as UserRole)) {
    sendError(res, 422, 'VALIDATION_ERROR', 'La validation a échoué', { role: ['Le rôle doit être Agent ou Consultant'] });
    return;
  }

  try {
    const filter: Record<string, unknown> = role ? { role } : { role: { $in: operationalRoles } };
    if (req.query.includeInactive !== 'true') filter.active = { $ne: false };
    const users = await User.find(filter)
      .select('firstName lastName email role active createdAt')
      .sort({ role: 1, firstName: 1, lastName: 1 });
    res.json({ data: { users } });
  } catch (error) {
    console.error('Get users error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Impossible de charger les utilisateurs');
  }
};

export const createOperationalUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const password = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({ ...req.body, email: req.body.email.toLowerCase(), password, active: true });
    res.status(201).json({ data: user });
  } catch (error: any) {
    if (error?.code === 11000) {
      sendError(res, 409, 'USER_EMAIL_EXISTS', 'Cette adresse e-mail est déjà utilisée', { email: ['Cette adresse e-mail est déjà utilisée'] });
      return;
    }
    console.error('Create user error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Impossible de créer le compte');
  }
};

export const setOperationalUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: operationalRoles } },
      { active: req.body.active },
      { new: true, runValidators: true }
    ).select('firstName lastName email role active createdAt');
    if (!user) {
      sendError(res, 404, 'USER_NOT_FOUND', 'Collaborateur introuvable');
      return;
    }
    res.json({ data: user });
  } catch (error) {
    console.error('Update user status error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Impossible de modifier le compte');
  }
};
