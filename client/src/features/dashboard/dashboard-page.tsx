import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Building2, CalendarClock, FileKey2, FileText, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { getDashboard } from './api'
import { ActionTable, moneyFormatter, urgencyLabels } from './action-table'
import type { DashboardSummary, Urgency } from './types'

const urgencyOrder: Urgency[] = ['expired', 'critical', 'urgent', 'upcoming']
const urgencyColors: Record<Urgency, string> = { expired: 'bg-red-500', critical: 'bg-orange-500', urgent: 'bg-amber-400', upcoming: 'bg-blue-500', safe: 'bg-emerald-500' }

function MetricCard({ label, value, icon: Icon, attention = false }: { label: string; value: string | number; icon: typeof Building2; attention?: boolean }) {
  return <Card><CardContent className="flex items-start justify-between p-4"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div><Icon className={`size-4 ${attention ? 'text-red-600' : 'text-primary'}`} /></CardContent></Card>
}

function SummaryCards({ summary, role }: { summary: DashboardSummary; role: 'agent' | 'consultant' | 'admin' }) {
  const cards = [
    { label: 'Clients à risque', value: summary.clientsAtRisk, icon: Building2 },
    ...(role !== 'agent' ? [{ label: 'Contrats à traiter', value: summary.contractsRequiringAction, icon: FileText }] : []),
    ...(role !== 'consultant' ? [{ label: 'Licences à traiter', value: summary.licensesRequiringAction, icon: FileKey2 }] : []),
    { label: 'Valeur estimée', value: moneyFormatter.format(summary.estimatedRenewalValue), icon: WalletCards },
    { label: 'Relances en retard', value: summary.overdueFollowUps, icon: CalendarClock, attention: summary.overdueFollowUps > 0 },
  ]
  return <div className={`grid gap-4 sm:grid-cols-2 ${cards.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}>{cards.map((card) => <MetricCard key={card.label} {...card} />)}</div>
}

export function DashboardPage() {
  const { user } = useAuth()
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboard() })
  if (dashboard.isPending) return <PageLoader label="Chargement du tableau de bord" />
  if (dashboard.isError) return <ErrorState message={getApiErrorMessage(dashboard.error, 'Impossible de charger le tableau de bord.')} retry={() => dashboard.refetch()} />
  const data = dashboard.data
  const total = urgencyOrder.reduce((sum, urgency) => sum + data.urgencyCounts[urgency], 0)

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-semibold">Suivi des échéances</h2><p className="mt-1 text-sm text-muted-foreground">Priorisez les renouvellements et les relances à effectuer.</p></div>{user?.role !== 'admin' && <Button size="sm" asChild variant="outline"><Link to="/actions">Ouvrir mes actions</Link></Button>}</div>
    <SummaryCards summary={data.summary} role={user?.role || 'agent'} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="priority-heading" className="min-w-0 space-y-3"><div className="flex items-center justify-between"><div><h3 id="priority-heading" className="font-semibold">Renouvellements prioritaires</h3><p className="mt-0.5 text-sm text-muted-foreground">Les échéances les plus proches apparaissent en premier.</p></div>{user?.role !== 'admin' && <Link className="text-sm font-medium text-primary hover:underline" to="/actions">Tout afficher</Link>}</div>{data.upcoming.length ? <ActionTable items={data.upcoming} showOwner={user?.role === 'admin'} /> : <EmptyState title="Aucun renouvellement à traiter" message="Aucun renouvellement actif n’entre dans la fenêtre des 15 jours." />}</section>
      <aside aria-labelledby="urgency-heading" className="rounded-lg border bg-card p-4"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-600" /><h3 id="urgency-heading" className="font-semibold">Répartition des priorités</h3></div><p className="mt-1 text-sm text-muted-foreground">Renouvellements actifs par fenêtre d’échéance.</p><div className="mt-5 space-y-4">{urgencyOrder.map((urgency) => { const count = data.urgencyCounts[urgency]; const width = total ? Math.max((count / total) * 100, count ? 5 : 0) : 0; return <div key={urgency}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{urgencyLabels[urgency]}</span><span className="tabular-nums text-muted-foreground">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full ${urgencyColors[urgency]}`} style={{ width: `${width}%` }} /></div></div>})}</div>{total === 0 && <p className="mt-5 text-sm text-muted-foreground">Aucun risque de renouvellement enregistré.</p>}</aside>
    </div>
  </div>
}
