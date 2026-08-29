import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CircleUserRound, FileKey2, FileText, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ActionTable, moneyFormatter } from './action-table'
import { getActions } from './api'
import type { ActionKind } from './types'

type OwnerFilter = 'all' | 'unassigned' | string

export function AdminOverviewPage() {
  const [kind, setKind] = useState<ActionKind | 'all'>('all')
  const [owner, setOwner] = useState<OwnerFilter>('all')
  const queryFilters = { kind: kind === 'all' ? undefined : kind, ownerId: owner !== 'all' && owner !== 'unassigned' ? owner : undefined }
  const actions = useQuery({ queryKey: ['admin-actions', queryFilters], queryFn: () => getActions(queryFilters) })
  const owners = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of actions.data || []) if (item.ownerId) map.set(item.ownerId, item.ownerName || 'Unnamed owner')
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [actions.data])
  const visible = (actions.data || []).filter((item) => owner !== 'unassigned' || !item.ownerId)
  const unassigned = (actions.data || []).filter((item) => !item.ownerId).length
  const overdue = visible.filter((item) => item.overdue).length
  const totalValue = visible.reduce((sum, item) => sum + item.value, 0)

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold tracking-tight">Operations control</h2><p className="mt-1 text-sm text-muted-foreground">Review renewal ownership, escalation risk, and work across both teams.</p></div>
    {actions.isPending ? <PageLoader label="Loading operations overview" /> : actions.isError ? <ErrorState message={getApiErrorMessage(actions.error, 'The operations overview could not be loaded.')} retry={() => actions.refetch()} /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Open renewals</p><Users className="size-5 text-primary" /></div><p className="mt-2 text-2xl font-bold tabular-nums">{visible.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Overdue follow-ups</p><AlertTriangle className="size-5 text-red-600" /></div><p className="mt-2 text-2xl font-bold tabular-nums">{overdue}</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Unassigned</p><CircleUserRound className="size-5 text-amber-600" /></div><p className="mt-2 text-2xl font-bold tabular-nums">{unassigned}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm font-medium text-muted-foreground">Renewal value at risk</p><p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{moneyFormatter.format(totalValue)}</p></CardContent></Card>
      </div>
      <section aria-label="Operations filters" className="flex flex-col justify-between gap-4 rounded-lg border bg-card p-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Renewal type"><button type="button" onClick={() => setKind('all')} className={filterClass(kind === 'all')}><Users className="size-4" />All work</button><button type="button" onClick={() => setKind('contract')} className={filterClass(kind === 'contract')}><FileText className="size-4" />Contracts</button><button type="button" onClick={() => setKind('license')} className={filterClass(kind === 'license')}><FileKey2 className="size-4" />Licenses</button></div>
        <label className="flex items-center gap-2 text-sm font-medium"><span className="whitespace-nowrap">Owner</span><select value={owner} onChange={(event) => setOwner(event.target.value)} className="h-10 min-w-48 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All owners</option><option value="unassigned">Unassigned</option>{owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      </section>
      {visible.length ? <ActionTable items={visible} showOwner /> : <EmptyState title="No renewal work found" message={owner === 'unassigned' ? 'Every active renewal currently has an owner.' : 'No active renewals match these controls.'} />}
    </>}
  </div>
}

function filterClass(active: boolean) {
  return cn('inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')
}
