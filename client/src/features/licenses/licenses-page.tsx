import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { LicenseFormDialog } from './license-dialogs'
import { licenseApi } from './license-api'
import { formatDate, itemId, personName, StatusBadge, UrgencyBadge, fieldClass } from './license-ui'
import type { License, LicenseFilters, LicenseInput, RenewalStatus, Urgency } from './types'

const urgencies: Array<Urgency | ''> = ['', 'expired', 'critical', 'urgent', 'upcoming', 'safe']
const statuses: Array<RenewalStatus | ''> = ['', 'not_contacted', 'contacted', 'waiting', 'renewed', 'declined']

export function LicensesPage() {
  const { user } = useAuth(); const isAdmin = user?.role === 'admin'; const queryClient = useQueryClient()
  const [filters, setFilters] = useState<LicenseFilters>({}); const [draftSearch, setDraftSearch] = useState(''); const [editing, setEditing] = useState<License | undefined>(); const [dialogOpen, setDialogOpen] = useState(false)
  const licenses = useQuery({ queryKey: ['licenses', filters], queryFn: () => licenseApi.list(filters) })
  const clients = useQuery({ queryKey: ['license-clients'], queryFn: licenseApi.clients })
  const agents = useQuery({ queryKey: ['license-agents'], queryFn: licenseApi.agents, enabled: isAdmin })
  const save = useMutation({ mutationFn: (input: LicenseInput) => editing ? licenseApi.update(editing.id, input) : licenseApi.create(input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['licenses'] }); setDialogOpen(false); setEditing(undefined) } })
  const assign = useMutation({ mutationFn: ({ id, owner }: { id: string; owner: string }) => licenseApi.assign(id, owner), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['licenses'] }) })
  const openCreate = () => { setEditing(undefined); setDialogOpen(true); save.reset() }; const openEdit = (license: License) => { setEditing(license); setDialogOpen(true); save.reset() }
  const updateFilter = <K extends keyof LicenseFilters>(key: K, value: LicenseFilters[K]) => setFilters((current) => ({ ...current, [key]: value }))
  if (licenses.isLoading || clients.isLoading || (isAdmin && agents.isLoading)) return <PageLoader label="Loading licenses" />
  if (licenses.isError || clients.isError || (isAdmin && agents.isError)) return <ErrorState message={getApiErrorMessage(licenses.error || clients.error || agents.error)} retry={() => { licenses.refetch(); clients.refetch(); agents.refetch() }} />
  const rows = licenses.data || []
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-muted-foreground">{isAdmin ? 'All license ownership and renewal risk.' : 'Licenses assigned to you.'}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{rows.length} license{rows.length === 1 ? '' : 's'}</p></div><Button onClick={openCreate}><Plus />Add license</Button></div>
    <section className="rounded-lg border bg-card p-4" aria-label="License filters"><form className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]" onSubmit={(event) => { event.preventDefault(); updateFilter('search', draftSearch.trim()) }}><label className="relative"><span className="sr-only">Search licenses</span><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input className={`${fieldClass} pl-9`} placeholder="Search license name" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} /></label><select aria-label="Filter by urgency" className={fieldClass} value={filters.urgency || ''} onChange={(event) => updateFilter('urgency', event.target.value as Urgency | '')}>{urgencies.map((value) => <option key={value || 'all'} value={value}>{value ? value[0].toUpperCase() + value.slice(1) : 'All urgency'}</option>)}</select><select aria-label="Filter by renewal status" className={fieldClass} value={filters.renewalStatus || ''} onChange={(event) => updateFilter('renewalStatus', event.target.value as RenewalStatus | '')}>{statuses.map((value) => <option key={value || 'all'} value={value}>{value ? value.replace('_', ' ') : 'All statuses'}</option>)}</select><Button type="submit" variant="outline">Search</Button></form></section>
    {rows.length === 0 ? <EmptyState title="No matching licenses" message="Adjust the filters or add the first license record." action={<Button onClick={openCreate}><Plus />Add license</Button>} /> : <div className="overflow-hidden rounded-lg border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">License</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Expiry risk</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y">{rows.map((license) => <tr key={license.id} className="hover:bg-slate-50/70"><td className="px-4 py-4"><Link className="font-semibold hover:text-primary hover:underline" to={`/licenses/${license.id}`}>{license.name}</Link><p className="mt-1 text-xs text-muted-foreground">Expires {formatDate(license.expiryDate)}</p></td><td className="px-4 py-4">{license.client.name}</td><td className="px-4 py-4"><UrgencyBadge urgency={license.urgency} days={license.daysUntilExpiry} /></td><td className="px-4 py-4"><StatusBadge status={license.renewalStatus} /></td><td className="px-4 py-4">{license.quantity ?? '—'}</td><td className="px-4 py-4">{isAdmin ? <select aria-label={`Assign ${license.name}`} className="h-9 max-w-44 rounded-md border bg-white px-2 text-sm" value={itemId(license.owner)} disabled={assign.isPending} onChange={(event) => assign.mutate({ id: license.id, owner: event.target.value })}>{(agents.data || []).map((agent) => <option key={itemId(agent)} value={itemId(agent)}>{personName(agent)}</option>)}</select> : personName(license.owner)}</td><td className="px-4 py-4 text-right"><Button size="sm" variant="ghost" onClick={() => openEdit(license)} aria-label={`Edit ${license.name}`}><Edit3 />Edit</Button></td></tr>)}</tbody></table></div></div>}
    {assign.isError && <p role="alert" className="text-sm text-red-700">{getApiErrorMessage(assign.error, 'Unable to reassign license.')}</p>}
    <LicenseFormDialog open={dialogOpen} license={editing} clients={clients.data || []} agents={agents.data || []} isAdmin={isAdmin} busy={save.isPending} error={save.isError ? getApiErrorMessage(save.error, 'Unable to save license.') : undefined} onClose={() => setDialogOpen(false)} onSubmit={(input) => save.mutate(input)} />
  </div>
}
