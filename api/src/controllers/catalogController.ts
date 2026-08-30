import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ContractType } from '../models/ContractType';
import { LicenseOffer } from '../models/LicenseOffer';
import { sendError } from '../utils/errors';

const duplicate = (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000);

export const listLicenseOffers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = req.user?.role === 'admin' && req.query.includeInactive === 'true' ? {} : { active: true };
    res.json({ data: { offers: await LicenseOffer.find(filter).sort({ name: 1 }) } });
  } catch { sendError(res, 500, 'INTERNAL_ERROR', 'Impossible de charger les offres de licences'); }
};

export const createLicenseOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(201).json({ data: await LicenseOffer.create(req.body) });
  } catch (error) {
    if (duplicate(error)) { sendError(res, 409, 'OFFER_NAME_EXISTS', 'Une offre de licence porte déjà ce nom'); return; }
    sendError(res, 500, 'INTERNAL_ERROR', "Impossible de créer l'offre de licence");
  }
};

export const updateLicenseOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const offer = await LicenseOffer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!offer) { sendError(res, 404, 'LICENSE_OFFER_NOT_FOUND', 'Offre de licence introuvable'); return; }
    res.json({ data: offer });
  } catch (error) {
    if (duplicate(error)) { sendError(res, 409, 'OFFER_NAME_EXISTS', 'Une offre de licence porte déjà ce nom'); return; }
    sendError(res, 500, 'INTERNAL_ERROR', "Impossible de modifier l'offre de licence");
  }
};

export const listContractTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = req.user?.role === 'admin' && req.query.includeInactive === 'true' ? {} : { active: true };
    res.json({ data: { types: await ContractType.find(filter).sort({ name: 1 }) } });
  } catch { sendError(res, 500, 'INTERNAL_ERROR', 'Impossible de charger les types de contrats'); }
};

export const createContractType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(201).json({ data: await ContractType.create(req.body) });
  } catch (error) {
    if (duplicate(error)) { sendError(res, 409, 'CONTRACT_TYPE_NAME_EXISTS', 'Un type de contrat porte déjà ce nom'); return; }
    sendError(res, 500, 'INTERNAL_ERROR', 'Impossible de créer le type de contrat');
  }
};

export const updateContractType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const type = await ContractType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!type) { sendError(res, 404, 'CONTRACT_TYPE_NOT_FOUND', 'Type de contrat introuvable'); return; }
    res.json({ data: type });
  } catch (error) {
    if (duplicate(error)) { sendError(res, 409, 'CONTRACT_TYPE_NAME_EXISTS', 'Un type de contrat porte déjà ce nom'); return; }
    sendError(res, 500, 'INTERNAL_ERROR', 'Impossible de modifier le type de contrat');
  }
};
