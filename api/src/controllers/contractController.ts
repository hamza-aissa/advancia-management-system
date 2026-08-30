import { Response } from 'express';
import mongoose from 'mongoose';
import { Contract } from '../models/Contract';
import { renewalStatuses } from '../models/License';
import { Client } from '../models/Client';
import { User } from '../models/User';
import { RenewalActivity } from '../models/RenewalActivity';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { ExpiryBucket, expiryBucketFilter, getExpiryBucket, parseDate, recordActivity, daysUntil } from '../services/renewalDomain';
import { ContractType } from '../models/ContractType';
import { ContractService } from '../models/Contract';

const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
const validId = (value: unknown): value is string => typeof value === 'string' && mongoose.isValidObjectId(value);
const admin = (req: AuthRequest) => req.user?.role === UserRole.ADMIN;
const populate = (query: any) => query.populate('client').populate('managedBy', '-password').populate('contractType');
export const contractServicesValue = (services: ContractService[]) => services.reduce((total, service) => total + service.quantity * service.unitPrice, 0);
const present = (doc: any) => { const raw = doc.toObject(), days = daysUntil(doc.expiryDate); return {
  ...raw, id: String(raw._id), owner: raw.managedBy,
  status: doc.archivedAt ? 'archived'
    : doc.renewalStatus === 'declined' ? 'declined'
    : doc.renewalStatus === 'renewed' ? 'renewed'
    : days < 0 ? 'expired' : days <= 15 ? 'expiring' : 'active',
  urgency: getExpiryBucket(doc.expiryDate), daysUntilExpiry: days }; };
const findOwned = async (req: AuthRequest) => {
  if (!validId(req.params.id)) return null;
  const item = await Contract.findById(req.params.id);
  return item && (admin(req) || item.managedBy?.toString() === req.user?.id) && (admin(req) || !item.archivedAt) ? item : null;
};

const openItem = (item: any) => item.isActive && !item.archivedAt && !['renewed', 'declined'].includes(item.renewalStatus);

export const createContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { client, contractType, description, services } = req.body;
    const startDate = parseDate(req.body.startDate), expiryDate = parseDate(req.body.expiryDate);
    if (!validId(client) || !validId(contractType) || !startDate || !expiryDate || expiryDate <= startDate) {
      fail(res, 400, 'VALIDATION_ERROR', 'Client, type et dates chronologiques valides sont requis'); return;
    }
    const [clientRecord, type, existing] = await Promise.all([
      Client.findOne({ _id: client, archivedAt: null }),
      ContractType.findOne({ _id: contractType, active: true }),
      Contract.exists({ client })
    ]);
    if (!clientRecord) { fail(res, 404, 'CLIENT_NOT_FOUND', 'Client introuvable'); return; }
    if (!type) { fail(res, 404, 'CONTRACT_TYPE_NOT_FOUND', 'Type de contrat introuvable ou inactif'); return; }
    if (existing) { fail(res, 409, 'CLIENT_ALREADY_HAS_CONTRACT', 'Ce client possède déjà un contrat. Renouvelez le contrat existant.'); return; }
    const owner = req.user!.id;
    if (!validId(owner) || !(await User.exists({ _id: owner, role: UserRole.CONSULTANT }))) {
      fail(res, 400, 'INVALID_OWNER', 'Le responsable doit être un consultant'); return;
    }
    if (clientRecord.assignedConsultant && clientRecord.assignedConsultant.toString() !== owner) {
      fail(res, 403, 'CLIENT_SCOPE_DENIED', 'Ce client est déjà attribué à un autre consultant'); return;
    }
    if (!clientRecord.assignedConsultant) {
      clientRecord.assignedConsultant = owner;
      await clientRecord.save();
    }
    const item = await Contract.create({ client, contractType, title: type.name, description, services, startDate, expiryDate,
      value: contractServicesValue(services), managedBy: owner, isActive: true, renewalStatus: 'not_contacted' });
    await recordActivity('contract', item._id as mongoose.Types.ObjectId, 'created', req.user!.id);
    res.status(201).json({ data: present(await populate(Contract.findById(item._id))) });
  } catch (error: any) {
    console.error(error);
    if (error?.code === 11000) { fail(res, 409, 'CLIENT_ALREADY_HAS_CONTRACT', 'Ce client possède déjà un contrat. Renouvelez le contrat existant.'); return; }
    fail(res, 500, 'INTERNAL_ERROR', 'Impossible de créer le contrat');
  }
};

export const getContracts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = { archivedAt: null };
    if (!admin(req)) filter.managedBy = req.user!.id;
    else if (validId(req.query.ownerId)) filter.managedBy = req.query.ownerId;
    if (validId(req.query.clientId)) filter.client = req.query.clientId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (typeof req.query.renewalStatus === 'string' && renewalStatuses.includes(req.query.renewalStatus as any)) filter.renewalStatus = req.query.renewalStatus;
    if (typeof req.query.urgency === 'string' && ['expired', 'critical', 'urgent', 'upcoming', 'safe'].includes(req.query.urgency))
      Object.assign(filter, expiryBucketFilter(req.query.urgency as ExpiryBucket));
    if (req.query.overdue === 'true') filter.nextFollowUpAt = { $lt: new Date() };
    if (typeof req.query.search === 'string' && req.query.search.trim()) filter.title = { $regex: req.query.search.trim(), $options: 'i' };
    const items = await populate(Contract.find(filter).sort({ expiryDate: 1 }));
    res.json({ data: items.map(present) });
  } catch { fail(res, 500, 'INTERNAL_ERROR', 'Impossible de charger les contrats'); }
};

export const getContract = async (req: AuthRequest, res: Response): Promise<void> => {
  const raw = await findOwned(req);
  if (!raw) { fail(res, 404, 'CONTRACT_NOT_FOUND', 'Contrat introuvable'); return; }
  res.json({ data: present(await populate(Contract.findById(raw._id))) });
};

export const updateContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await findOwned(req);
    if (!item) { fail(res, 404, 'CONTRACT_NOT_FOUND', 'Contrat introuvable'); return; }
    if (req.body.description !== undefined) item.description = req.body.description;
    if (req.body.services !== undefined) {
      item.services = req.body.services;
      item.value = contractServicesValue(req.body.services);
    }
    await item.save();
    await recordActivity('contract', item._id as mongoose.Types.ObjectId, 'updated', req.user!.id);
    res.json({ data: present(await populate(Contract.findById(item._id))) });
  } catch { fail(res, 500, 'INTERNAL_ERROR', 'Impossible de modifier le contrat'); }
};

const act = async (req: AuthRequest, res: Response, action: 'contacted'|'follow_up_scheduled'|'renewed'|'declined') => {
  try {
    const item = await findOwned(req);
    if (!item) { fail(res, 404, 'CONTRACT_NOT_FOUND', 'Contrat introuvable'); return; }
    if (!openItem(item)) { fail(res, 409, 'ITEM_NOT_OPEN', 'Seul un contrat actif et ouvert peut recevoir une action de renouvellement'); return; }
    const now = new Date(); let metadata: Record<string, unknown> | undefined;
    if (action === 'contacted') {
      item.renewalStatus = 'contacted';
      item.nextFollowUpAt = undefined;
      await Client.updateOne({ _id: item.client }, { lastContactAt: now });
    }
    if (action === 'follow_up_scheduled') {
      const date = parseDate(req.body.nextFollowUpAt);
      if (!date) { fail(res, 400, 'VALIDATION_ERROR', 'Une date de relance valide est requise'); return; }
      item.renewalStatus = 'waiting'; item.nextFollowUpAt = date;
    }
    if (action === 'declined') {
      if (typeof req.body.reason !== 'string' || !req.body.reason.trim()) { fail(res, 400, 'VALIDATION_ERROR', 'Le motif du refus est requis'); return; }
      item.renewalStatus = 'declined'; item.declineReason = req.body.reason.trim(); item.nextFollowUpAt = undefined; item.isActive = false;
    }
    if (action === 'renewed') {
      const date = parseDate(req.body.expiryDate);
      if (!date || date <= item.expiryDate) { fail(res, 400, 'VALIDATION_ERROR', 'La nouvelle échéance doit être postérieure à l’échéance actuelle'); return; }
      const previousStartDate = item.startDate;
      const previousExpiryDate = item.expiryDate;
      const newStartDate = parseDate(req.body.startDate) ?? previousExpiryDate;
      if (date <= newStartDate) { fail(res, 400, 'VALIDATION_ERROR', 'La nouvelle échéance doit être postérieure à la date de début'); return; }
      item.renewalHistory.push({ previousStartDate, previousExpiryDate, newStartDate, newExpiryDate: date, renewedAt: now,
        renewedBy: new mongoose.Types.ObjectId(req.user!.id), value: req.body.value });
      item.startDate = newStartDate; item.expiryDate = date; item.renewalStatus = 'not_contacted'; item.isActive = true;
      item.nextFollowUpAt = undefined; item.declineReason = undefined;
      if (req.body.value !== undefined) item.value = req.body.value;
      metadata = { previousStartDate, previousExpiryDate, newStartDate, newExpiryDate: date, value: req.body.value };
    }
    item.lastActionAt = now; await item.save();
    await recordActivity('contract', item._id as mongoose.Types.ObjectId, action, req.user!.id, req.body.note, metadata);
    res.json({ data: present(await populate(Contract.findById(item._id))) });
  } catch (error) { console.error(error); fail(res, 500, 'INTERNAL_ERROR', 'Impossible d’appliquer l’action de renouvellement'); }
};

export const markContractContacted = (req: AuthRequest, res: Response) => act(req, res, 'contacted');
export const scheduleContractFollowUp = (req: AuthRequest, res: Response) => act(req, res, 'follow_up_scheduled');
export const renewContract = (req: AuthRequest, res: Response) => act(req, res, 'renewed');
export const declineContract = (req: AuthRequest, res: Response) => act(req, res, 'declined');

export const assignContract = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.body.owner !== null && (!validId(req.body.owner) || !(await User.exists({ _id: req.body.owner, role: UserRole.CONSULTANT })))) {
    fail(res, 400, 'INVALID_OWNER', 'Le responsable doit être un consultant'); return;
  }
  const item = validId(req.params.id) ? await Contract.findById(req.params.id) : null;
  if (!item) { fail(res, 404, 'CONTRACT_NOT_FOUND', 'Contrat introuvable'); return; }
  const previousOwner = item.managedBy?.toString() ?? null;
  item.managedBy = req.body.owner ?? undefined; await item.save();
  await Client.updateOne({ _id: item.client }, { assignedConsultant: req.body.owner ?? null });
  await recordActivity('contract', item._id as mongoose.Types.ObjectId, 'reassigned', req.user!.id, 'Responsable réattribué', { previousOwner, newOwner: req.body.owner });
  res.json({ data: present(await populate(Contract.findById(item._id))) });
};

export const getContractActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await findOwned(req);
  if (!item) { fail(res, 404, 'CONTRACT_NOT_FOUND', 'Contrat introuvable'); return; }
  const data = await RenewalActivity.find({ itemType: 'contract', itemId: item._id }).populate('performedBy', '-password').sort({ createdAt: -1 });
  res.json({ data });
};

export const deleteContract = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = validId(req.params.id) ? await Contract.findOne({ _id: req.params.id, archivedAt: null }) : null;
  if (!item) { fail(res, 404, 'CONTRACT_NOT_FOUND', 'Contrat introuvable'); return; }
  item.isActive = false; item.archivedAt = new Date(); item.nextFollowUpAt = undefined; await item.save();
  await recordActivity('contract', item._id as mongoose.Types.ObjectId, 'archived', req.user!.id);
  res.json({ data: { id: String(item._id), archived: true } });
};
