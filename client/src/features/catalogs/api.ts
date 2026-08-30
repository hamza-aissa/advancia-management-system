import { api } from '@/lib/api'
import type { ContractType, LicenseOffer } from './types'

type Envelope<T> = { data: T }

export const catalogApi = {
  licenseOffers: async (includeInactive = false) =>
    (await api.get<Envelope<{ offers: LicenseOffer[] }>>('/catalog/license-offers', { params: { includeInactive } })).data.data.offers,
  createLicenseOffer: async (input: Omit<LicenseOffer, 'id'>) =>
    (await api.post<Envelope<LicenseOffer>>('/catalog/license-offers', input)).data.data,
  updateLicenseOffer: async (id: string, input: Partial<Omit<LicenseOffer, 'id'>>) =>
    (await api.patch<Envelope<LicenseOffer>>(`/catalog/license-offers/${id}`, input)).data.data,
  contractTypes: async (includeInactive = false) =>
    (await api.get<Envelope<{ types: ContractType[] }>>('/catalog/contract-types', { params: { includeInactive } })).data.data.types,
  createContractType: async (input: Omit<ContractType, 'id'>) =>
    (await api.post<Envelope<ContractType>>('/catalog/contract-types', input)).data.data,
  updateContractType: async (id: string, input: Partial<Omit<ContractType, 'id'>>) =>
    (await api.patch<Envelope<ContractType>>(`/catalog/contract-types/${id}`, input)).data.data,
}
