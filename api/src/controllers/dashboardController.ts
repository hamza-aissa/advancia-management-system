import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { Contract } from '../models/Contract';
import { License, renewalStatuses } from '../models/License';
import { UserRole } from '../types';
import { sendError } from '../utils/errors';
import { ExpiryBucket, expiryBucketFilter } from '../services/renewalDomain';
import {
  ActionItem,
  ActionKind,
  actionItemFromDocument,
  actionScope,
  compareActionItems,
  dashboardPayload,
  matchesActionSearch
} from '../services/dashboardService';

const querySchema = z.object({
  kind: z.enum(['license', 'contract']).optional(),
  urgency: z.enum(['expired', 'critical', 'urgent', 'upcoming', 'safe']).optional(),
  renewalStatus: z.enum(renewalStatuses).optional(),
  ownerId: z.string().refine(mongoose.isValidObjectId, 'Must be a valid identifier').optional(),
  clientId: z.string().refine(mongoose.isValidObjectId, 'Must be a valid identifier').optional(),
  overdue: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  search: z.string().trim().max(120).optional()
});

const loadActions = async (
  req: AuthRequest,
  options: { dashboardOnly?: boolean } = {}
): Promise<ActionItem[]> => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw parsed.error;
  const filters = parsed.data;
  const kinds: ActionKind[] = filters.kind ? [filters.kind] : ['license', 'contract'];
  const now = new Date();
  const common: Record<string, unknown> = { archivedAt: null };
  if (options.dashboardOnly) {
    common.isActive = true;
    common.renewalStatus = { $nin: ['renewed', 'declined'] };
  } else if (filters.renewalStatus) {
    common.renewalStatus = filters.renewalStatus;
  } else {
    common.isActive = true;
    common.renewalStatus = { $nin: ['renewed', 'declined'] };
  }
  if (filters.clientId) common.client = filters.clientId;
  if (filters.urgency) Object.assign(common, expiryBucketFilter(filters.urgency as ExpiryBucket, now));
  if (filters.overdue !== undefined) {
    common.nextFollowUpAt = filters.overdue ? { $lt: now } : { $not: { $lt: now } };
  }

  const tasks: Promise<ActionItem[]>[] = kinds.map(async (kind): Promise<ActionItem[]> => {
    if (req.user!.role === UserRole.AGENT && kind === 'contract') return [];
    if (req.user!.role === UserRole.CONSULTANT && kind === 'license') return [];
    const scope = actionScope(kind, req.user!.role, req.user!.id, filters.ownerId);
    const model: any = kind === 'license' ? License : Contract;
    const ownerPath = kind === 'license' ? 'assignedBy' : 'managedBy';
    const documents: any[] = await model.find({ ...common, ...scope })
      .populate({ path: 'client', match: { archivedAt: null }, select: 'name email' })
      .populate(ownerPath, 'firstName lastName email role')
      .sort({ expiryDate: 1 });
    return documents
      .filter((document: any) => document.client)
      .map((document: any) => actionItemFromDocument(kind, document, now));
  });

  const actions: ActionItem[] = (await Promise.all(tasks)).flat();
  return actions
    .filter((item) => matchesActionSearch(item, filters.search))
    .filter((item) => filters.overdue === undefined || item.overdue === filters.overdue)
    .sort(compareActionItems);
};

const sendValidationError = (res: Response, error: z.ZodError): void => {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.') || 'query';
    (fields[field] ??= []).push(issue.message);
  }
  sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', fields);
};

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ data: dashboardPayload(await loadActions(req, { dashboardOnly: true })) });
  } catch (error) {
    if (error instanceof z.ZodError) return sendValidationError(res, error);
    console.error('Dashboard error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to load dashboard');
  }
};

export const getActions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ data: { actions: await loadActions(req) } });
  } catch (error) {
    if (error instanceof z.ZodError) return sendValidationError(res, error);
    console.error('Actions error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to load actions');
  }
};
