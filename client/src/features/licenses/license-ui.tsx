import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LicensePerson, RenewalStatus, Urgency } from './types'

const urgencyStyles: Record<Urgency, string> = {
  expired: 'bg-slate-900 text-white',
  critical: 'bg-red-100 text-red-800',
  urgent: 'bg-orange-100 text-orange-800',
  upcoming: 'bg-amber-100 text-amber-800',
  safe: 'bg-emerald-100 text-emerald-800',
}

const statusLabels: Record<RenewalStatus, string> = {
  not_contacted: 'Not contacted', contacted: 'Contacted', waiting: 'Waiting', renewed: 'Renewed', declined: 'Declined',
}

export function UrgencyBadge({ urgency, days }: { urgency: Urgency; days?: number }) {
  const suffix = days === undefined ? '' : days < 0 ? ` · ${Math.abs(days)}d overdue` : ` · ${days}d`
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', urgencyStyles[urgency])}>{urgency}{suffix}</span>
}

export function StatusBadge({ status }: { status: RenewalStatus }) {
  return <span className="inline-flex rounded-full border bg-white px-2.5 py-1 text-xs font-medium text-slate-700">{statusLabels[status]}</span>
}

export function Modal({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="license-dialog-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="license-dialog-title" className="text-xl font-semibold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
        <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Close dialog"><X /></Button>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  </div>
}

export const fieldClass = 'h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:bg-muted'
export const textareaClass = 'min-h-24 w-full resize-y rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600" role="alert">{message}</p> : null
}

export function formatDate(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function personName(person?: LicensePerson) {
  return person ? `${person.firstName} ${person.lastName}`.trim() || person.email : 'Unassigned'
}

export function itemId(item?: { id?: string; _id?: string }) { return item?.id || item?._id || '' }
