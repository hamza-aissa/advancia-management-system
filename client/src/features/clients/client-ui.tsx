import { AlertTriangle, CheckCircle2, CircleOff, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { User } from '@/types'
import type { Client, ClientStatus } from './types'

const statusConfig: Record<ClientStatus, { label: string; classes: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: CheckCircle2 },
  at_risk: { label: 'At risk', classes: 'bg-amber-50 text-amber-800 ring-amber-600/20', icon: AlertTriangle },
  inactive: { label: 'Inactive', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20', icon: CircleOff },
}

export function StatusBadge({ status }: { status: ClientStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', config.classes)}><Icon className="size-3.5" />{config.label}</span>
}

export function Person({ user, fallback = 'Unassigned' }: { user?: User; fallback?: string }) {
  return <span className={cn('inline-flex items-center gap-2 text-sm', !user && 'text-muted-foreground')}><UserRound className="size-4" />{user ? `${user.firstName} ${user.lastName}` : fallback}</span>
}

export function ClientCard({ client }: { client: Client }) {
  const content = <div className="rounded-lg border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{client.name}</h3><p className="mt-1 text-sm text-muted-foreground">{client.email}</p></div><StatusBadge status={client.status} /></div>
    <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
      {client.phone && <span className="flex items-center gap-2"><Phone className="size-4" />{client.phone}</span>}
      <Person user={client.assignedAgent} />
      <Person user={client.assignedConsultant} />
    </div>
  </div>
  return client.archivedAt ? content : <Link to={`/clients/${client.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link>
}

export function ClientContact({ client }: { client: Client }) {
  return <div className="grid gap-3 text-sm">
    <a className="flex items-center gap-3 hover:text-primary" href={`mailto:${client.email}`}><Mail className="size-4 text-muted-foreground" />{client.email}</a>
    <span className="flex items-center gap-3"><Phone className="size-4 text-muted-foreground" />{client.phone || 'No phone recorded'}</span>
    <span className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{client.address || 'No address recorded'}</span>
  </div>
}
