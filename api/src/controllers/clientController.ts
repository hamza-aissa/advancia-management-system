import { Response } from 'express';
import { FilterQuery } from 'mongoose';
import { Client, ClientDocument } from '../models/Client';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { ClientStatus, UserRole } from '../types';
import { sendError } from '../utils/errors';
import { License } from '../models/License';
import { Contract } from '../models/Contract';

const assignedUserFields = 'firstName lastName email role';

const visibleAssignments = (role: UserRole) => role === UserRole.ADMIN
  ? ['assignedAgent', 'assignedConsultant']
  : role === UserRole.AGENT ? ['assignedAgent'] : ['assignedConsultant'];

const populateVisibleAssignments = async (client: ClientDocument, role: UserRole): Promise<void> => {
  await client.populate(visibleAssignments(role).map((path) => ({ path, select: assignedUserFields })));
};

export const redactClientForRole = (client: Record<string, unknown>, role: UserRole): Record<string, unknown> => {
  const result = { ...client };
  if (role === UserRole.AGENT) delete result.assignedConsultant;
  if (role === UserRole.CONSULTANT) delete result.assignedAgent;
  return result;
};

const withComputedStatus = async (clients: ClientDocument[], role: UserRole): Promise<Record<string, unknown>[]> => {
  if (clients.length === 0) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 15);
  const clientIds = clients.map((client) => client._id);
  const open = { isActive: true, archivedAt: null, renewalStatus: { $nin: ['renewed', 'declined'] } };
  const riskWindow = { $or: [{ expiryDate: { $lte: cutoff } }, { nextFollowUpAt: { $lt: new Date() } }] };
  const [licenseClientIds, contractClientIds] = await Promise.all([
    role === UserRole.CONSULTANT ? Promise.resolve([]) : License.distinct('client', { client: { $in: clientIds }, ...open, ...riskWindow }),
    role === UserRole.AGENT ? Promise.resolve([]) : Contract.distinct('client', { client: { $in: clientIds }, ...open, ...riskWindow })
  ]);
  const atRisk = new Set([...licenseClientIds, ...contractClientIds].map(String));
  return clients.map((client) => redactClientForRole({
    ...client.toJSON(),
    status: client.archivedAt
      ? ClientStatus.INACTIVE
      : atRisk.has(String(client._id)) ? ClientStatus.AT_RISK : ClientStatus.ACTIVE
  }, role));
};

export const buildClientScope = (user: NonNullable<AuthRequest['user']>): FilterQuery<ClientDocument> => {
  if (user.role === UserRole.ADMIN) return {};
  if (user.role === UserRole.AGENT) return { assignedAgent: user.id };
  if (user.role === UserRole.CONSULTANT) return { assignedConsultant: user.id };
  return { _id: { $exists: false } };
};

const validateAssignments = async (agentId?: string, consultantId?: string): Promise<boolean> => {
  const [agent, consultant] = await Promise.all([
    agentId ? User.exists({ _id: agentId, role: UserRole.AGENT }) : true,
    consultantId ? User.exists({ _id: consultantId, role: UserRole.CONSULTANT }) : true
  ]);
  return Boolean(agent && consultant);
};

export const createClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const input = { ...req.body };
    if (req.user!.role === UserRole.AGENT) input.assignedAgent = req.user!.id;
    if (req.user!.role === UserRole.CONSULTANT) input.assignedConsultant = req.user!.id;
    if (req.user!.role === UserRole.ADMIN && (!input.assignedAgent || !input.assignedConsultant)) {
      sendError(res, 422, 'INVALID_ASSIGNMENT', 'Admin-created clients require both assignments', {
        assignedAgent: input.assignedAgent ? [] : ['Select an active agent'],
        assignedConsultant: input.assignedConsultant ? [] : ['Select an active consultant']
      });
      return;
    }
    if (!(await validateAssignments(input.assignedAgent, input.assignedConsultant))) {
      sendError(res, 422, 'INVALID_ASSIGNMENT', 'Assigned users must be an agent and a consultant', {
        assignedAgent: ['Select an active agent'],
        assignedConsultant: ['Select an active consultant']
      });
      return;
    }

    const client = await Client.create(input);
    await populateVisibleAssignments(client, req.user!.role);
    const [data] = await withComputedStatus([client], req.user!.role);
    res.status(201).json({ data });
  } catch (error: any) {
    console.error('Create client error:', error);
    if (error?.code === 11000) {
      sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', { email: ['A client with this email already exists'] });
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to create client');
  }
};

export const getClients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: FilterQuery<ClientDocument> = { ...buildClientScope(req.user!) };
    const isAdmin = req.user!.role === UserRole.ADMIN;
    filter.archivedAt = isAdmin && req.query.archived === 'true' ? { $ne: null } : null;
    if (req.query.search) {
      const safeSearch = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    let query = Client.find(filter);
    for (const path of visibleAssignments(req.user!.role)) query = query.populate(path, assignedUserFields);
    const clients = await query.sort({ status: 1, name: 1 });
    const decoratedClients = await withComputedStatus(clients, req.user!.role);
    const data = req.query.status
      ? decoratedClients.filter((client) => client.status === req.query.status)
      : decoratedClients;
    res.json({ data: { clients: data } });
  } catch (error) {
    console.error('Get clients error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to retrieve clients');
  }
};

export const getClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let query = Client.findOne({
      _id: req.params.id,
      archivedAt: null,
      ...buildClientScope(req.user!)
    });
    for (const path of visibleAssignments(req.user!.role)) query = query.populate(path, assignedUserFields);
    const client = await query;

    if (!client) {
      // Returning 404 avoids disclosing that another employee owns the record.
      sendError(res, 404, 'CLIENT_NOT_FOUND', 'Client not found');
      return;
    }
    const [decorated] = await withComputedStatus([client], req.user!.role);
    const itemBase = { client: client._id, archivedAt: null };
    const [licenses, contracts] = await Promise.all([
      req.user!.role === UserRole.CONSULTANT ? Promise.resolve([]) : License.find({ ...itemBase, ...(req.user!.role === UserRole.AGENT ? { assignedBy: req.user!.id } : {}) }).sort({ expiryDate: 1 }),
      req.user!.role === UserRole.AGENT ? Promise.resolve([]) : Contract.find({ ...itemBase, ...(req.user!.role === UserRole.CONSULTANT ? { managedBy: req.user!.id } : {}) }).sort({ expiryDate: 1 })
    ]);
    res.json({ data: { ...decorated, licenses, contracts } });
  } catch (error) {
    console.error('Get client error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to retrieve client');
  }
};

export const updateClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user!.role === UserRole.ADMIN;
    const client = await Client.findOne({
      _id: req.params.id,
      archivedAt: null,
      ...buildClientScope(req.user!)
    });

    if (!client) {
      sendError(res, 404, 'CLIENT_NOT_FOUND', 'Client not found');
      return;
    }

    if (isAdmin && (req.body.assignedAgent || req.body.assignedConsultant)) {
      const agentId = req.body.assignedAgent ?? client.assignedAgent?.toString();
      const consultantId = req.body.assignedConsultant ?? client.assignedConsultant?.toString();
      if (!agentId || !consultantId || !(await validateAssignments(agentId, consultantId))) {
        sendError(res, 422, 'INVALID_ASSIGNMENT', 'Assigned users must be an agent and a consultant');
        return;
      }
    }

    Object.assign(client, req.body);
    await client.save();
    await populateVisibleAssignments(client, req.user!.role);
    const [data] = await withComputedStatus([client], req.user!.role);
    res.json({ data });
  } catch (error: any) {
    console.error('Update client error:', error);
    if (error?.code === 11000) {
      sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', { email: ['A client with this email already exists'] });
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to update client');
  }
};

export const archiveClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      { archivedAt: new Date(), status: ClientStatus.INACTIVE },
      { new: true }
    );
    if (!client) {
      sendError(res, 404, 'CLIENT_NOT_FOUND', 'Client not found');
      return;
    }
    res.json({ data: client });
  } catch (error) {
    console.error('Archive client error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Unable to archive client');
  }
};
