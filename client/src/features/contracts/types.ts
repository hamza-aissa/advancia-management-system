export type RenewalStatus = 'not_contacted' | 'contacted' | 'waiting' | 'renewed' | 'declined'
export type Urgency = 'expired' | 'critical' | 'urgent' | 'upcoming' | 'safe'

export interface PersonRef {
  id?: string
  _id?: string
  firstName: string
  lastName: string
  email?: string
}

export interface ClientRef {
  id?: string
  _id?: string
  name: string
  email?: string
}

export interface ContractTypeRef {
  id?: string
  _id?: string
  name: string
  description?: string
}

export interface ContractService {
  name: string
  description?: string
  quantity: number
  unitPrice: number
}

export interface RenewalHistoryEntry {
  previousExpiryDate: string
  newExpiryDate: string
  renewedAt: string
  renewedBy?: PersonRef | string
  value?: number
}

export interface Contract {
  id?: string
  _id?: string
  client: ClientRef | string
  contractType?: ContractTypeRef | string
  title: string
  description?: string
  services: ContractService[]
  startDate: string
  expiryDate: string
  value?: number
  isActive: boolean
  owner: PersonRef | string
  renewalStatus: RenewalStatus
  urgency: Urgency
  daysUntilExpiry: number
  nextFollowUpAt?: string
  lastActionAt?: string
  declineReason?: string
  renewalHistory: RenewalHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface RenewalActivity {
  _id?: string
  id?: string
  action: 'created' | 'updated' | 'contacted' | 'follow_up_scheduled' | 'renewed' | 'declined'
  performedBy?: PersonRef | string
  note?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export const entityId = (value: { id?: string; _id?: string }) => value.id || value._id || ''
export const personName = (person: PersonRef | string | undefined) => {
  if (!person) return 'Non attribué'
  if (typeof person === 'string') return person
  return `${person.firstName} ${person.lastName}`.trim() || person.email || 'Non attribué'
}
export const clientName = (client: ClientRef | string) => typeof client === 'string' ? client : client.name
