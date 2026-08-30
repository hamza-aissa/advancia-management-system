import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { RenewalStatus, Urgency } from './types'

const urgencyStyles: Record<Urgency, string> = {
  expired: 'bg-slate-900 text-white',
  critical: 'bg-red-100 text-red-800 ring-red-200',
  urgent: 'bg-orange-100 text-orange-800 ring-orange-200',
  upcoming: 'bg-amber-100 text-amber-800 ring-amber-200',
  safe: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
}
const statusStyles: Record<RenewalStatus, string> = {
  not_contacted: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-800',
  waiting: 'bg-violet-100 text-violet-800',
  renewed: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
}
const urgencyLabels: Record<Urgency, string> = { expired: 'Expiré', critical: 'Critique', urgent: 'Urgent', upcoming: 'À venir', safe: 'Sans risque' }
const statusLabels: Record<RenewalStatus, string> = { not_contacted: 'Non contacté', contacted: 'Contacté', waiting: 'En attente', renewed: 'Renouvelé', declined: 'Refusé' }

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium', className)}>{children}</span>
}
export function UrgencyBadge({ urgency, days }: { urgency: Urgency; days?: number }) {
  return <Badge className={urgencyStyles[urgency]}>{urgencyLabels[urgency]}{days !== undefined && ` · ${Math.abs(days)} j${days < 0 ? ' de retard' : ''}`}</Badge>
}
export function StatusBadge({ status }: { status: RenewalStatus }) { return <Badge className={statusStyles[status]}>{statusLabels[status]}</Badge> }

export const fieldClass = 'flex h-8 w-full rounded-md border border-input bg-card px-3 py-1.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50'
export const textareaClass = 'flex min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15'
export function FieldError({ children }: { children?: string }) { return children ? <p className="mt-1 text-xs text-red-600">{children}</p> : null }

export const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' }).format(new Date(value)) : '—'
export const formatMoney = (value?: number) => value === undefined ? '—' : new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(value)
