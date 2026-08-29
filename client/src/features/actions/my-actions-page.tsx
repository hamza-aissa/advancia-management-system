import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, Search, X } from 'lucide-react'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ActionTable } from '@/features/dashboard/action-table'
import { getActions } from '@/features/dashboard/api'
import type { ActionFilters, RenewalStatus, Urgency } from '@/features/dashboard/types'

const urgencyOptions: { value: Urgency | ''; label: string }[] = [
  { value: '', label: 'All urgency' }, { value: 'expired', label: 'Expired' }, { value: 'critical', label: 'Critical' },
  { value: 'urgent', label: 'Urgent' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'safe', label: 'Safe' },
]
const statusOptions: { value: RenewalStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' }, { value: 'not_contacted', label: 'Not contacted' }, { value: 'contacted', label: 'Contacted' },
  { value: 'waiting', label: 'Waiting' }, { value: 'renewed', label: 'Renewed' }, { value: 'declined', label: 'Declined' },
]

export function MyActionsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [urgency, setUrgency] = useState<Urgency | ''>('')
  const [renewalStatus, setRenewalStatus] = useState<RenewalStatus | ''>('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const deferredSearch = useDeferredValue(search.trim())
  const filters: ActionFilters = {
    search: deferredSearch || undefined,
    urgency: urgency || undefined,
    renewalStatus: renewalStatus || undefined,
    overdue: overdueOnly ? true : undefined,
  }
  const actions = useQuery({ queryKey: ['actions', filters], queryFn: () => getActions(filters) })
  const activeFilters = Boolean(search || urgency || renewalStatus || overdueOnly)
  const clear = () => { setSearch(''); setUrgency(''); setRenewalStatus(''); setOverdueOnly(false) }

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold tracking-tight">My action queue</h2><p className="mt-1 text-sm text-muted-foreground">{user?.role === 'agent' ? 'Licenses' : 'Contracts'} assigned to you, ordered by expiry risk.</p></div>
    <section aria-label="Action filters" className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 xl:flex-row">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Search renewals</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search renewal or client" className="pl-9" /></label>
        <div className="grid gap-3 sm:grid-cols-2 xl:flex">
          <label><span className="sr-only">Filter by urgency</span><select value={urgency} onChange={(event) => setUrgency(event.target.value as Urgency | '')} className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:w-40">{urgencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className="sr-only">Filter by status</span><select value={renewalStatus} onChange={(event) => setRenewalStatus(event.target.value as RenewalStatus | '')} className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:w-44">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <button type="button" aria-pressed={overdueOnly} onClick={() => setOverdueOnly((value) => !value)} className={cn('inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors', overdueOnly ? 'border-red-200 bg-red-50 text-red-700' : 'bg-background hover:bg-muted')}><Filter className="size-4" />Overdue only</button>
        {activeFilters && <Button type="button" variant="ghost" onClick={clear}><X />Clear</Button>}
      </div>
    </section>
    {actions.isPending ? <PageLoader label="Loading your action queue" /> : actions.isError ? <ErrorState message={getApiErrorMessage(actions.error, 'Your action queue could not be loaded.')} retry={() => actions.refetch()} /> : actions.data.length ? <><p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{actions.data.length}</span> renewal{actions.data.length === 1 ? '' : 's'} found</p><ActionTable items={actions.data} /></> : <EmptyState title={activeFilters ? 'No matching renewals' : 'Your queue is clear'} message={activeFilters ? 'Change or clear the current filters to see more results.' : 'You have no active renewals requiring follow-up.'} action={activeFilters ? <Button variant="outline" onClick={clear}>Clear filters</Button> : undefined} />}
  </div>
}
