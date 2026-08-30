import { Response } from 'express';
import mongoose from 'mongoose';
import { License, renewalStatuses } from '../models/License';
import { Client } from '../models/Client';
import { User } from '../models/User';
import { RenewalActivity } from '../models/RenewalActivity';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { ExpiryBucket, expiryBucketFilter, getExpiryBucket, parseDate, recordActivity, daysUntil } from '../services/renewalDomain';
import { LicenseOffer } from '../models/LicenseOffer';

const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
const validId = (value: unknown): value is string => typeof value === 'string' && mongoose.isValidObjectId(value);
const admin = (req: AuthRequest) => req.user?.role === UserRole.ADMIN;
const allowed = (req: AuthRequest, item: any) => admin(req) || item.assignedBy?.toString() === req.user?.id;
const populate = (query: any) => query.populate('client').populate('assignedBy', '-password').populate('offer');
const present = (doc: any) => {
  const raw = doc.toObject();
  const days = daysUntil(doc.expiryDate);
  const status = doc.archivedAt ? 'archived'
    : doc.renewalStatus === 'declined' ? 'declined'
    : doc.renewalStatus === 'renewed' ? 'renewed'
    : days < 0 ? 'expired' : days <= 15 ? 'expiring' : 'active';
  return { ...raw, id: String(raw._id), owner: raw.assignedBy, status,
    urgency: getExpiryBucket(doc.expiryDate), daysUntilExpiry: days };
};
const findOwned = async (req: AuthRequest) => {
  if (!validId(req.params.id)) return null;
  const item = await License.findById(req.params.id);
  return item && allowed(req, item) && (admin(req) || !item.archivedAt) ? item : null;
};

const openItem = (item: any) => item.isActive && !item.archivedAt && !['renewed', 'declined'].includes(item.renewalStatus);

export const createLicense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { client, offer, description, quantity } = req.body;
    const startDate = parseDate(req.body.startDate), expiryDate = parseDate(req.body.expiryDate);
    if (!validId(client) || !validId(offer) || !startDate || !expiryDate || expiryDate <= startDate) {
      fail(res, 400, 'VALIDATION_ERROR', 'Client, offre et dates chronologiques valides sont requis'); return;
    }
    const [clientRecord, offerRecord] = await Promise.all([
      Client.findOne({ _id: client, archivedAt: null }),
      LicenseOffer.findOne({ _id: offer, active: true })
    ]);
    if (!clientRecord) { fail(res, 404, 'CLIENT_NOT_FOUND', 'Client introuvable'); return; }
    if (!offerRecord) { fail(res, 404, 'LICENSE_OFFER_NOT_FOUND', 'Offre de licence introuvable ou inactive'); return; }
    const owner = req.user!.id;
    if (!validId(owner) || !(await User.exists({ _id: owner, role: UserRole.AGENT }))) {
      fail(res, 400, 'INVALID_OWNER', 'Le responsable doit être un agent'); return;
    }
    if (clientRecord.assignedAgent && clientRecord.assignedAgent.toString() !== owner) {
      fail(res, 403, 'CLIENT_SCOPE_DENIED', 'Ce client est déjà attribué à un autre agent'); return;
    }
    if (!clientRecord.assignedAgent) {
      clientRecord.assignedAgent = owner;
      await clientRecord.save();
    }
    const license = await License.create({ client, offer, name: offerRecord.name, description: description || offerRecord.description,
      startDate, expiryDate, value: offerRecord.unitPrice * quantity, quantity,
      assignedBy: owner, isActive: true, renewalStatus: 'not_contacted' });
    await recordActivity('license', license._id as mongoose.Types.ObjectId, 'created', req.user!.id);
    res.status(201).json({ data: present(await populate(License.findById(license._id))) });
  } catch (error) { console.error(error); fail(res, 500, 'INTERNAL_ERROR', 'Impossible de créer la licence'); }
};

export const getLicenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = { archivedAt: null };
    if (!admin(req)) filter.assignedBy = req.user!.id;
    else if (validId(req.query.ownerId)) filter.assignedBy = req.query.ownerId;
    if (validId(req.query.clientId)) filter.client = req.query.clientId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (typeof req.query.renewalStatus === 'string' && renewalStatuses.includes(req.query.renewalStatus as any)) filter.renewalStatus = req.query.renewalStatus;
    if (typeof req.query.urgency === 'string' && ['expired', 'critical', 'urgent', 'upcoming', 'safe'].includes(req.query.urgency))
      Object.assign(filter, expiryBucketFilter(req.query.urgency as ExpiryBucket));
    if (req.query.overdue === 'true') filter.nextFollowUpAt = { $lt: new Date() };
    if (typeof req.query.search === 'string' && req.query.search.trim()) filter.name = { $regex: req.query.search.trim(), $options: 'i' };
    const licenses = await populate(License.find(filter).sort({ expiryDate: 1 }));
    res.json({ data: licenses.map(present) });
  } catch (error) { console.error(error); fail(res, 500, 'INTERNAL_ERROR', 'Impossible de charger les licences'); }
};

export const getLicense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw = await findOwned(req);
    if (!raw) { fail(res, 404, 'LICENSE_NOT_FOUND', 'Licence introuvable'); return; }
    res.json({ data: present(await populate(License.findById(raw._id))) });
  } catch { fail(res, 500, 'INTERNAL_ERROR', 'Impossible de charger la licence'); }
};

export const updateLicense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await findOwned(req);
    if (!item) { fail(res, 404, 'LICENSE_NOT_FOUND', 'Licence introuvable'); return; }
    if (req.body.description !== undefined) item.description = req.body.description;
    if (req.body.quantity !== undefined) {
      item.quantity = req.body.quantity;
      const offer = item.offer ? await LicenseOffer.findById(item.offer) : null;
      if (offer) item.value = offer.unitPrice * req.body.quantity;
    }
    await item.save();
    await recordActivity('license', item._id as mongoose.Types.ObjectId, 'updated', req.user!.id);
    res.json({ data: present(await populate(License.findById(item._id))) });
  } catch { fail(res, 500, 'INTERNAL_ERROR', 'Impossible de modifier la licence'); }
};

const act = async (req: AuthRequest, res: Response, action: 'contacted'|'follow_up_scheduled'|'renewed'|'declined') => {
  try {
    const item = await findOwned(req);
    if (!item) { fail(res, 404, 'LICENSE_NOT_FOUND', 'Licence introuvable'); return; }
    if (!openItem(item)) { fail(res, 409, 'ITEM_NOT_OPEN', 'Seule une licence active et ouverte peut recevoir une action de renouvellement'); return; }
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
    await recordActivity('license', item._id as mongoose.Types.ObjectId, action, req.user!.id, req.body.note, metadata);
    res.json({ data: present(await populate(License.findById(item._id))) });
  } catch (error) { console.error(error); fail(res, 500, 'INTERNAL_ERROR', 'Impossible d’appliquer l’action de renouvellement'); }
};

export const markLicenseContacted = (req: AuthRequest, res: Response) => act(req, res, 'contacted');
export const scheduleLicenseFollowUp = (req: AuthRequest, res: Response) => act(req, res, 'follow_up_scheduled');
export const renewLicense = (req: AuthRequest, res: Response) => act(req, res, 'renewed');
export const declineLicense = (req: AuthRequest, res: Response) => act(req, res, 'declined');

export const assignLicense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.body.owner !== null && (!validId(req.body.owner) || !(await User.exists({ _id: req.body.owner, role: UserRole.AGENT })))) {
      fail(res, 400, 'INVALID_OWNER', 'Le responsable doit être un agent'); return;
    }
    const item = validId(req.params.id) ? await License.findById(req.params.id) : null;
    if (!item) { fail(res, 404, 'LICENSE_NOT_FOUND', 'Licence introuvable'); return; }
    const previousOwner = item.assignedBy?.toString() ?? null;
    item.assignedBy = req.body.owner ?? undefined; await item.save();
    await Client.updateOne({ _id: item.client }, { assignedAgent: req.body.owner ?? null });
    await recordActivity('license', item._id as mongoose.Types.ObjectId, 'reassigned', req.user!.id, 'Responsable réattribué', { previousOwner, newOwner: req.body.owner });
    res.json({ data: present(await populate(License.findById(item._id))) });
  } catch { fail(res, 500, 'INTERNAL_ERROR', 'Impossible de réattribuer la licence'); }
};

export const getLicenseActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await findOwned(req);
  if (!item) { fail(res, 404, 'LICENSE_NOT_FOUND', 'Licence introuvable'); return; }
  const data = await RenewalActivity.find({ itemType: 'license', itemId: item._id }).populate('performedBy', '-password').sort({ createdAt: -1 });
  res.json({ data });
};

export const deleteLicense = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = validId(req.params.id) ? await License.findOne({ _id: req.params.id, archivedAt: null }) : null;
  if (!item) { fail(res, 404, 'LICENSE_NOT_FOUND', 'Licence introuvable'); return; }
  item.isActive = false; item.archivedAt = new Date(); item.nextFollowUpAt = undefined; await item.save();
  await recordActivity('license', item._id as mongoose.Types.ObjectId, 'archived', req.user!.id);
  res.json({ data: { id: String(item._id), archived: true } });
};
