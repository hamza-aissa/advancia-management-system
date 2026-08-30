import { ContractType } from '../models/ContractType';
import { LicenseOffer } from '../models/LicenseOffer';

const defaultOffers = [
  { name: 'Licence standard', description: 'Offre générique à personnaliser depuis le catalogue', unitPrice: 0, active: true }
];
const defaultContractTypes = [
  { name: 'Contrat de services', description: 'Type générique à personnaliser depuis le catalogue', active: true }
];

/** Keeps an existing database immediately usable without overwriting business catalogues. */
export async function ensureDefaultCatalogs(): Promise<void> {
  const [offerCount, typeCount] = await Promise.all([LicenseOffer.countDocuments(), ContractType.countDocuments()]);
  await Promise.all([
    offerCount === 0 ? LicenseOffer.insertMany(defaultOffers) : Promise.resolve(),
    typeCount === 0 ? ContractType.insertMany(defaultContractTypes) : Promise.resolve()
  ]);
}
