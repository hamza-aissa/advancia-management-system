export type ActionKind = 'license' | 'contract'
export type Urgency = 'expired' | 'critical' | 'urgent' | 'upcoming' | 'safe'
export type RenewalStatus = 'not_contacted' | 'contacted' | 'waiting' | 'renewed' | 'declined'

export interface RenewalActionItem {
  id: string
  kind: ActionKind
  title: string
  clientId: string
  clientName: string
  ownerId: string
  ownerName: string
  expiryDate: string
  daysUntilExpiry: number
  urgency: Urgency
  renewalStatus: RenewalStatus
  nextFollowUpAt: string | null
  overdue: boolean
  value: number
}

export interface DashboardSummary {
  clientsAtRisk: number
  contractsRequiringAction: number
  licensesRequiringAction: number
  estimatedRenewalValue: number
  overdueFollowUps: number
}

export interface DashboardData {
  summary: DashboardSummary
  urgencyCounts: Record<Urgency, number>
  upcoming: RenewalActionItem[]
}

export interface ActionFilters {
  kind?: ActionKind
  urgency?: Urgency
  renewalStatus?: RenewalStatus
  ownerId?: string
  clientId?: string
  overdue?: boolean
  search?: string
}

export interface ReminderReport {
  trigger: 'scheduled' | 'manual'
  startedAt: string
  finishedAt: string
  itemsChecked: number
  sent: number
  simulated: number
  failed: number
  skipped: number
}

export interface ReminderStatus {
  schedule: string
  timezone: string
  scheduled: boolean
  running: boolean
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastError: string | null
  nextRunAt: string | null
  lastReport: ReminderReport | null
}

export interface NotificationEntry {
  _id: string
  itemKind: ActionKind
  threshold: 15 | 10 | 6
  recipient: string
  renewalCycle: string
  deliveryStatus: 'pending' | 'sent' | 'simulated' | 'failed'
  attemptedAt?: string
  sentAt?: string
  error?: string
}
