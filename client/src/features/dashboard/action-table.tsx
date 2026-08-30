import { ArrowUpRight, CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { RenewalActionItem, RenewalStatus, Urgency } from './types'

const urgencyLabels: Record<Urgency, string> = {
  expired: 'Expiré', critical: 'Critique', urgent: 'Urgent', upcoming: 'À venir', safe: 'Sans risque',
}

const urgencyClasses: Record<Urgency, string> = {
  expired: 'border-red-200 bg-red-50 text-red-700',
  critical: 'border-orange-200 bg-orange-50 text-orange-700',
  urgent: 'border-amber-200 bg-amber-50 text-amber-800',
  upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
  safe: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

const statusLabels: Record<RenewalStatus, string> = {
  not_contacted: 'Non contacté', contacted: 'Contacté', waiting: 'En attente', renewed: 'Renouvelé', declined: 'Refusé',
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const moneyFormatter = new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 3, maximumFractionDigits: 3 })

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', urgencyClasses[urgency])}>{urgencyLabels[urgency]}</span>
}

function expiryCopy(item: RenewalActionItem) {
  if (item.daysUntilExpiry < 0) return `${Math.abs(item.daysUntilExpiry)} j de retard`
  if (item.daysUntilExpiry === 0) return 'Expire aujourd’hui'
  return `${item.daysUntilExpiry} j restants`
}

export function ActionTable({ items, showOwner = false }: { items: RenewalActionItem[]; showOwner?: boolean }) {
  return <div className="overflow-hidden rounded-lg border bg-card">
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="border-b bg-muted/55 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr><th className="px-3 py-2">Renouvellement</th><th className="px-3 py-2">Priorité</th><th className="px-3 py-2">Échéance</th>{showOwner && <th className="px-3 py-2">Responsable</th>}<th className="px-3 py-2">Statut</th><th className="px-3 py-2 text-right">Valeur</th><th className="w-10"><span className="sr-only">Ouvrir</span></th></tr>
        </thead>
        <tbody className="divide-y">{items.map((item) => <tr key={`${item.kind}-${item.id}`} className="group transition-colors hover:bg-muted/35">
          <td className="px-3 py-2"><Link className="font-semibold hover:text-primary" to={`/${item.kind === 'license' ? 'licenses' : 'contracts'}/${item.id}`}>{item.title}</Link><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span>{item.kind === 'license' ? 'Licence' : 'Contrat'}</span><span aria-hidden="true">·</span><Link className="hover:text-foreground" to={`/clients/${item.clientId}`}>{item.clientName}</Link></div></td>
          <td className="px-3 py-2"><UrgencyBadge urgency={item.urgency} />{item.overdue && <p className="mt-1 text-xs font-medium text-red-600">Relance en retard</p>}</td>
          <td className="whitespace-nowrap px-5 py-4"><p className="font-medium">{expiryCopy(item)}</p><p className="mt-1 text-xs text-muted-foreground">{dateFormatter.format(new Date(item.expiryDate))}</p></td>
          {showOwner && <td className="px-3 py-2 text-muted-foreground">{item.ownerName || 'Non attribué'}</td>}
          <td className="px-5 py-4 text-muted-foreground">{statusLabels[item.renewalStatus]}</td>
          <td className="whitespace-nowrap px-5 py-4 text-right font-medium">{moneyFormatter.format(item.value || 0)}</td>
          <td className="pr-4"><Link aria-label={`Ouvrir ${item.title}`} className="grid size-8 place-items-center rounded-md text-muted-foreground group-hover:bg-background group-hover:text-primary" to={`/${item.kind === 'license' ? 'licenses' : 'contracts'}/${item.id}`}><ArrowUpRight className="size-4" /></Link></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="divide-y md:hidden">{items.map((item) => <Link key={`${item.kind}-${item.id}`} to={`/${item.kind === 'license' ? 'licenses' : 'contracts'}/${item.id}`} className="block p-4 transition-colors hover:bg-muted/35">
      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.clientName} · {item.kind === 'license' ? 'Licence' : 'Contrat'}</p></div><UrgencyBadge urgency={item.urgency} /></div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs"><span className={cn('flex items-center gap-1.5', item.overdue ? 'font-semibold text-red-600' : 'text-muted-foreground')}><CalendarClock className="size-3.5" />{expiryCopy(item)}</span><span className="font-semibold">{moneyFormatter.format(item.value || 0)}</span></div>
      {showOwner && <p className="mt-2 text-xs text-muted-foreground">Responsable : {item.ownerName || 'Non attribué'}</p>}
    </Link>)}</div>
  </div>
}

export { moneyFormatter, statusLabels, urgencyLabels }
