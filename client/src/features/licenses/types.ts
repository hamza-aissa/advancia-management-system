export type RenewalStatus = 'not_contacted' | 'contacted' | 'waiting' | 'renewed' | 'declined'
export type Urgency = 'expired' | 'critical' | 'urgent' | 'upcoming' | 'safe'

export interface LicensePerson {
  id?: string
  _id?: string
  firstName: string
  lastName: string
  email: string
}

export interface LicenseClient {
  id?: string
  _id?: string
  name: string
  email?: string
}

export interface RenewalHistoryEntry {
  previousExpiryDate: string
  newExpiryDate: string
  renewedAt: string
  renewedBy: string | LicensePerson
  value?: number
}

export interface License {
  id: string
  _id?: string
  client: LicenseClient
  name: string
  description?: string
  startDate: string
  expiryDate: string
  value?: number
  quantity?: number
  isActive: boolean
  owner: LicensePerson
  assignedBy?: LicensePerson
  renewalStatus: RenewalStatus
  status: 'active' | 'expired' | 'declined'
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
  _id: string
  action: string
  note?: string
  performedBy?: LicensePerson
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface LicenseClientOption {
  id?: string
  _id?: string
  name: string
  email?: string
}

export interface LicenseFilters {
  search?: string
  urgency?: Urgency | ''
  renewalStatus?: RenewalStatus | ''
  ownerId?: string
}

export interface LicenseInput {
  client: string
  name: string
  description?: string
  startDate: string
  expiryDate: string
  value?: number
  quantity?: number
  owner?: string
}
