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
const labelize = (value: string) => value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-black/5', className)}>{children}</span>
}
export function UrgencyBadge({ urgency, days }: { urgency: Urgency; days?: number }) {
  return <Badge className={urgencyStyles[urgency]}>{labelize(urgency)}{days !== undefined && ` · ${Math.abs(days)}d${days < 0 ? ' overdue' : ''}`}</Badge>
}
export function StatusBadge({ status }: { status: RenewalStatus }) { return <Badge className={statusStyles[status]}>{labelize(status)}</Badge> }

export const fieldClass = 'flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50'
export const textareaClass = 'flex min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15'
export function FieldError({ children }: { children?: string }) { return children ? <p className="mt-1 text-xs text-red-600">{children}</p> : null }

export const formatDate = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—'
export const formatMoney = (value?: number) => value === undefined ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
