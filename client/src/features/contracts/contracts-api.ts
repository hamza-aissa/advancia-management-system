import { api } from '@/lib/api'
import type { ClientRef, Contract, ContractService, PersonRef, RenewalActivity } from './types'

type Envelope<T> = { data: T }

export interface ContractInput {
  client: string
  contractType: string
  description?: string
  startDate: string
  expiryDate: string
  services: ContractService[]
}

export const contractsApi = {
  async list() { return (await api.get<Envelope<Contract[]>>('/contracts')).data.data },
  async get(id: string) { return (await api.get<Envelope<Contract>>(`/contracts/${id}`)).data.data },
  async create(input: ContractInput) { return (await api.post<Envelope<Contract>>('/contracts', input)).data.data },
  async update(id: string, input: Partial<ContractInput>) { return (await api.patch<Envelope<Contract>>(`/contracts/${id}`, input)).data.data },
  async contact(id: string, note?: string) { return (await api.post<Envelope<Contract>>(`/contracts/${id}/contact`, { note })).data.data },
  async followUp(id: string, nextFollowUpAt: string, note?: string) { return (await api.post<Envelope<Contract>>(`/contracts/${id}/follow-up`, { nextFollowUpAt, note })).data.data },
  async renew(id: string, expiryDate: string, value?: number, note?: string) { return (await api.post<Envelope<Contract>>(`/contracts/${id}/renew`, { expiryDate, value, note })).data.data },
  async decline(id: string, reason: string, note?: string) { return (await api.post<Envelope<Contract>>(`/contracts/${id}/decline`, { reason, note })).data.data },
  async reassign(id: string, owner: string) { return (await api.patch<Envelope<Contract>>(`/contracts/${id}/assignee`, { owner })).data.data },
  async archive(id: string) { return (await api.delete<Envelope<{ id: string; archived: boolean }>>(`/contracts/${id}`)).data.data },
  async activity(id: string) { return (await api.get<Envelope<RenewalActivity[]>>(`/contracts/${id}/activity`)).data.data },
  async clients() {
    const response = await api.get<Envelope<{ clients: ClientRef[] }>>('/clients')
    return response.data.data.clients
  },
  async consultants() {
    const response = await api.get<Envelope<{ users: PersonRef[] }>>('/users', { params: { role: 'consultant' } })
    return response.data.data.users
  },
}
