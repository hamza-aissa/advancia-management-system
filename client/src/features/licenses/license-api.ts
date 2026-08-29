import { api } from '@/lib/api'
import type { License, LicenseClientOption, LicenseFilters, LicenseInput, LicensePerson, RenewalActivity } from './types'

const compact = (params: LicenseFilters) => Object.fromEntries(Object.entries(params).filter(([, value]) => value))

export const licenseApi = {
  list: async (filters: LicenseFilters = {}) =>
    (await api.get<{ data: License[] }>('/licenses', { params: compact(filters) })).data.data,
  get: async (id: string) => (await api.get<{ data: License }>(`/licenses/${id}`)).data.data,
  create: async (input: LicenseInput) => (await api.post<{ data: License }>('/licenses', input)).data.data,
  update: async (id: string, input: Partial<LicenseInput>) =>
    (await api.patch<{ data: License }>(`/licenses/${id}`, input)).data.data,
  assign: async (id: string, owner: string) =>
    (await api.patch<{ data: License }>(`/licenses/${id}/assignee`, { owner })).data.data,
  contact: async (id: string, note?: string) =>
    (await api.post<{ data: License }>(`/licenses/${id}/contact`, { note })).data.data,
  followUp: async (id: string, nextFollowUpAt: string, note?: string) =>
    (await api.post<{ data: License }>(`/licenses/${id}/follow-up`, { nextFollowUpAt, note })).data.data,
  renew: async (id: string, expiryDate: string, value?: number, note?: string) =>
    (await api.post<{ data: License }>(`/licenses/${id}/renew`, { expiryDate, value, note })).data.data,
  decline: async (id: string, reason: string, note?: string) =>
    (await api.post<{ data: License }>(`/licenses/${id}/decline`, { reason, note })).data.data,
  activity: async (id: string) =>
    (await api.get<{ data: RenewalActivity[] }>(`/licenses/${id}/activity`)).data.data,
  clients: async () => {
    const response = await api.get<{ data: { clients: LicenseClientOption[] } }>('/clients')
    return response.data.data.clients
  },
  agents: async () => {
    const response = await api.get<{ data: { users: LicensePerson[] } }>('/users', { params: { role: 'agent' } })
    return response.data.data.users
  },
}
