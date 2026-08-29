import type { User } from '@/types'

export type ClientStatus = 'active' | 'at_risk' | 'inactive'

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  assignedAgent?: User
  assignedConsultant?: User
  status: ClientStatus
  notes?: string
  lastContactAt?: string | null
  archivedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientInput {
  name: string
  email: string
  phone?: string
  address?: string
  assignedAgent: string
  assignedConsultant: string
  notes?: string
  lastContactAt?: string | null
}

export type ClientUpdate = Partial<ClientInput>
