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
  return <Card><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p></div><div className={`grid size-10 place-items-center rounded-lg ${attention ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}><Icon className="size-5" /></div></CardContent></Card>
}

function SummaryCards({ summary, role }: { summary: DashboardSummary; role: 'agent' | 'consultant' | 'admin' }) {
  const cards = [
    { label: 'Clients at risk', value: summary.clientsAtRisk, icon: Building2 },
    ...(role !== 'agent' ? [{ label: 'Contracts requiring action', value: summary.contractsRequiringAction, icon: FileText }] : []),
    ...(role !== 'consultant' ? [{ label: 'Licenses requiring action', value: summary.licensesRequiringAction, icon: FileKey2 }] : []),
    { label: 'Estimated renewal value', value: moneyFormatter.format(summary.estimatedRenewalValue), icon: WalletCards },
    { label: 'Overdue follow-ups', value: summary.overdueFollowUps, icon: CalendarClock, attention: summary.overdueFollowUps > 0 },
  ]
  return <div className={`grid gap-4 sm:grid-cols-2 ${cards.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}>{cards.map((card) => <MetricCard key={card.label} {...card} />)}</div>
}

export function DashboardPage() {
  const { user } = useAuth()
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboard() })
  if (dashboard.isPending) return <PageLoader label="Loading renewal dashboard" />
  if (dashboard.isError) return <ErrorState message={getApiErrorMessage(dashboard.error, 'The renewal dashboard could not be loaded.')} retry={() => dashboard.refetch()} />
  const data = dashboard.data
  const total = urgencyOrder.reduce((sum, urgency) => sum + data.urgencyCounts[urgency], 0)

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold tracking-tight">Renewal health</h2><p className="mt-1 text-sm text-muted-foreground">Focus on expiring business and follow-ups that need a response.</p></div>{user?.role !== 'admin' && <Button asChild variant="outline"><Link to="/actions">Open my action queue</Link></Button>}</div>
    <SummaryCards summary={data.summary} role={user?.role || 'agent'} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="priority-heading" className="min-w-0 space-y-3"><div className="flex items-center justify-between"><div><h3 id="priority-heading" className="font-semibold">Priority renewals</h3><p className="mt-0.5 text-sm text-muted-foreground">Closest expiries appear first.</p></div>{user?.role !== 'admin' && <Link className="text-sm font-semibold text-primary hover:underline" to="/actions">View all</Link>}</div>{data.upcoming.length ? <ActionTable items={data.upcoming} showOwner={user?.role === 'admin'} /> : <EmptyState title="No renewals need attention" message="There are no active renewals inside the 15-day action window." />}</section>
      <aside aria-labelledby="urgency-heading" className="rounded-lg border bg-card p-5"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-600" /><h3 id="urgency-heading" className="font-semibold">Urgency distribution</h3></div><p className="mt-1 text-sm text-muted-foreground">Active renewal work by expiry window.</p><div className="mt-6 space-y-5">{urgencyOrder.map((urgency) => { const count = data.urgencyCounts[urgency]; const width = total ? Math.max((count / total) * 100, count ? 5 : 0) : 0; return <div key={urgency}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{urgencyLabels[urgency]}</span><span className="tabular-nums text-muted-foreground">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${urgencyColors[urgency]}`} style={{ width: `${width}%` }} /></div></div>})}</div>{total === 0 && <p className="mt-6 text-sm text-muted-foreground">No renewal risk is currently recorded.</p>}</aside>
    </div>
  </div>
}
